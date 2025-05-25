import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import MonthlyReview from '../models/MonthlyReview.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Gemini API yapılandırması
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// API anahtarını test et
export const testGeminiAPI = async () => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY bulunamadı');
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent("Test");
        return true;
    } catch (error) {
        console.error('API Test Hatası:', {
            message: error.message,
            apiKey: process.env.GEMINI_API_KEY ? 'Mevcut' : 'Eksik'
        });
        return false;
    }
};

// @desc    Ay sonu değerlendirmesi getir
// @route   GET /api/monthly-review
// @access  Private
export const getMonthlyReview = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        
        // Mevcut ayın başlangıç tarihi
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Önce veritabanında bu ay için kayıtlı değerlendirme var mı kontrol et
        let monthlyReview = await MonthlyReview.findOne({
            user: userId,
            month: currentMonthStart
        });

        // Eğer kayıtlı değerlendirme varsa, onu döndür
        if (monthlyReview) {
            return res.json({
                success: true,
                data: {
                    currentMonth: monthlyReview.currentMonthData,
                    previousMonth: monthlyReview.previousMonthData,
                    analysisText: monthlyReview.analysisText,
                    isCached: true
                }
            });
        }

        // Mevcut ayın bitiş tarihi
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        // Önceki ayın başlangıç ve bitiş tarihleri
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Mevcut ay verilerini getir
        const currentMonthData = await getMonthData(userId, currentMonthStart, currentMonthEnd);
        
        // Eğer bu ay hiç işlem yoksa, değerlendirme oluşturma
        if (currentMonthData.transactionCount === 0) {
            return res.json({
                success: true,
                data: {
                    currentMonth: currentMonthData,
                    previousMonth: null,
                    analysisText: null,
                    isActive: false,
                    message: 'Bu ay için herhangi bir işlem bulunamadı.'
                }
            });
        }

        // Kayıtlı değerlendirme yoksa, yeni bir değerlendirme oluştur
        const isApiWorking = await testGeminiAPI();
        if (!isApiWorking) {
            return res.status(500).json({
                success: false,
                error: 'Gemini API bağlantısı başarısız. Lütfen API anahtarınızı kontrol edin.'
            });
        }

        // Kullanıcı bilgilerini al
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }

        // Önceki ay verilerini getir
        const previousMonthData = await getMonthData(userId, previousMonthStart, previousMonthEnd);

        // Gemini API için prompt oluştur
        const prompt = createPrompt(currentMonthData, previousMonthData, user);
        
        // Gemini API'den analiz al
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(prompt);
        const analysisText = result.response.text();

        // Değerlendirmeyi veritabanına kaydet
        monthlyReview = await MonthlyReview.create({
            user: userId,
            month: currentMonthStart,
            currentMonthData,
            previousMonthData,
            analysisText
        });

        res.json({
            success: true,
            data: {
                currentMonth: monthlyReview.currentMonthData,
                previousMonth: monthlyReview.previousMonthData,
                analysisText,
                isCached: false,
                isActive: true
            }
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Tüm ay sonu değerlendirmelerini getir
// @route   GET /api/monthly-review/all
// @access  Private
export const getAllMonthlyReviews = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const reviews = await MonthlyReview.find({ user: userId })
            .sort({ month: -1 }) // En yeni değerlendirmeler önce
            .select('month currentMonthData previousMonthData analysisText');

        res.json({
            success: true,
            data: reviews
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Ay verilerini getiren yardımcı fonksiyon
export async function getMonthData(userId, startDate, endDate) {
    // İşlemleri getir ve kategori bilgilerini populate et
    const transactions = await Transaction.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
    }).populate('category', 'name');

    // Gelir ve giderleri hesapla
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    // Kategori bazlı harcamaları hesapla
    const expensesByCategory = {};
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            const categoryName = t.category?.name || 'Diğer';
            expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + t.amount;
        });

    // Gelir kaynaklarını hesapla
    const incomeBySource = {};
    transactions
        .filter(t => t.type === 'income')
        .forEach(t => {
            const categoryName = t.category?.name || 'Diğer';
            incomeBySource[categoryName] = (incomeBySource[categoryName] || 0) + t.amount;
        });

    // Hedefleri getir
    const goals = await Goal.find({
        user: userId,
        createdAt: { $lte: endDate }
    });

    // Aktif hedefleri filtrele (tamamlanmamış ve hedef tarihi geçmemiş)
    const now = new Date();
    const activeGoals = goals.filter(g => {
        const isNotCompleted = g.currentAmount < g.targetAmount;
        const isNotExpired = new Date(g.deadline) > now;
        return isNotCompleted && isNotExpired;
    });

    // Tamamlanmış hedefleri filtrele
    const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount);

    // Hedef ilerleme ortalamasını hesapla
    const activeGoalsAverageProgress = activeGoals.length > 0
        ? activeGoals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount), 0) / activeGoals.length
        : 0;

    // Hedef katkı miktarını hesapla (sadece bu ay içindeki katkıları)
    const goalsContributionAmount = goals.reduce((total, goal) => {
        const monthContributions = goal.contributions
            .filter(c => {
                const contributionDate = new Date(c.date);
                return contributionDate >= startDate && contributionDate <= endDate;
            })
            .reduce((sum, c) => sum + c.amount, 0);
        return total + monthContributions;
    }, 0);

    return {
        period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            month: startDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
        },
        averageTransactionPerDay: transactions.length / ((endDate - startDate) / (1000 * 60 * 60 * 24)),
        transactionCount: transactions.length,
        activeGoalCount: activeGoals.length,
        completedGoalCount: completedGoals.length,
        activeGoalsAverageProgress,
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        savingRate: totalIncome > 0 ? 1 - (totalExpense / totalIncome) : 0,
        goalsContributionAmount,
        expensesByCategory,
        incomeBySource
    };
}

// Gemini API için prompt oluşturan yardımcı fonksiyon
export function createPrompt(currentMonth, previousMonth, user) {
    const userName = `${user.firstName} ${user.lastName}`;
    const isFirstMonth = !previousMonth || previousMonth.transactionCount === 0;
    
    if (isFirstMonth) {
        return `Sen bir finansal danışmansın ve kullanıcıya samimi, teşvik edici bir dille finansal durumunu analiz ediyorsun. 
Bu kullanıcının uygulamayı kullanmaya başladığı ilk ayındasın. Kullanıcıya arkadaşça bir hoş geldin mesajı yazar gibi analiz yap.
Pozitif yönleri vurgula ve gelecek aylar için teşvik edici öneriler sun.
Kullanıcıya "${userName}" diye hitap et ve samimi bir dil kullan.

Önemli noktalar:
- Kullanıcıyı uygulamayı kullanmaya başladığı için tebrik et
- İlk ay verilerini olumlu bir dille analiz et
- Gelecek aylar için motive edici öneriler sun
- Bütçe takibi, hedef belirleme gibi konularda yönlendirici ol
- Her zaman pozitif bir ton kullan ve kullanıcıyı cesaretlendir

Veri:
${JSON.stringify(currentMonth, null, 2)}`;
    }

    return `Sen bir finansal danışmansın ve kullanıcıya samimi, teşvik edici bir dille finansal durumunu analiz ediyorsun. 
Aşağıdaki verileri kullanarak, kullanıcıya arkadaşça bir tavsiye mektubu yazar gibi analiz yap.
Pozitif yönleri vurgula, gelişim alanlarını nazikçe belirt ve teşvik edici öneriler sun.
Kullanıcıya "${userName}" diye hitap et ve samimi bir dil kullan.

Önemli noktalar:
- Gelir ve gider değişimlerini nazikçe analiz et
- Tasarruf oranındaki değişimleri teşvik edici bir dille açıkla
- Hedefler konusunda motive edici ol
- Önerilerini "şunları deneyebilirsin", "belki şöyle yapabilirsin" gibi yumuşak ifadelerle sun
- Her zaman pozitif bir ton kullan ve kullanıcıyı cesaretlendir

Veri:
${JSON.stringify({ currentMonth, previousMonth }, null, 2)}`;
} 