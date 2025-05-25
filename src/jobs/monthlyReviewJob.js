import cron from 'node-cron';
import User from '../models/User.js';
import MonthlyReview from '../models/MonthlyReview.js';
import { getMonthData, createPrompt, testGeminiAPI } from '../controllers/monthlyReview.controller.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Gemini API yapılandırması
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateMonthlyReviews() {
    try {
        console.log('Aylık değerlendirme oluşturma işlemi başladı:', new Date().toISOString());

        // API'yi test et
        const isApiWorking = await testGeminiAPI();
        if (!isApiWorking) {
            throw new Error('Gemini API bağlantısı başarısız');
        }

        // Tüm kullanıcıları al
        const users = await User.find();
        console.log(`${users.length} kullanıcı bulundu`);

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        for (const user of users) {
            try {
                console.log(`\nKullanıcı işleniyor: ${user.firstName} ${user.lastName}`);

                // Bu ay için değerlendirme var mı kontrol et
                const existingReview = await MonthlyReview.findOne({
                    user: user._id,
                    month: currentMonthStart
                });

                if (existingReview) {
                    console.log(`${currentMonthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} için değerlendirme zaten mevcut`);
                    continue;
                }

                // Ay verilerini getir
                const currentMonthData = await getMonthData(user._id, currentMonthStart, currentMonthEnd);

                // Eğer hiç işlem yoksa bu kullanıcıyı atla
                if (currentMonthData.transactionCount === 0) {
                    console.log(`${user.firstName} ${user.lastName} için bu ay işlem bulunamadı, değerlendirme oluşturulmayacak`);
                    continue;
                }

                // Önceki ay verilerini getir
                const previousMonthData = await getMonthData(user._id, previousMonthStart, previousMonthEnd);

                // Gemini API için prompt oluştur
                const prompt = createPrompt(currentMonthData, previousMonthData, user);
                
                // Gemini API'den analiz al
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
                const result = await model.generateContent(prompt);
                const analysisText = result.response.text();

                // Değerlendirmeyi kaydet
                await MonthlyReview.create({
                    user: user._id,
                    month: currentMonthStart,
                    currentMonthData,
                    previousMonthData,
                    analysisText
                });

                console.log(`${user.firstName} ${user.lastName} için değerlendirme oluşturuldu`);
            } catch (error) {
                console.error(`${user.firstName} ${user.lastName} için hata:`, error.message);
            }
        }

        console.log('Aylık değerlendirme oluşturma işlemi tamamlandı:', new Date().toISOString());
    } catch (error) {
        console.error('Hata:', error);
    }
}

// Her ayın son günü saat 23:59'da çalışacak cron job
export const startMonthlyReviewJob = () => {
    // Her ayın son günü saat 23:59'da çalışır
    cron.schedule('59 23 28-31 * *', async () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Eğer yarın yeni bir ay başlıyorsa çalıştır
        if (tomorrow.getMonth() !== now.getMonth()) {
            await generateMonthlyReviews();
        }
    });

    console.log('Aylık değerlendirme cron job başlatıldı');
}; 