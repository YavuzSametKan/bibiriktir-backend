import Transaction from '../models/Transaction.js';
import moment from 'moment-timezone';
import mongoose from 'mongoose';
import Goal from '../models/Goal.js';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

// @desc    Aylık istatistikleri getir
// @route   GET /api/statistics/monthly
// @access  Private
export const getMonthlyStatistics = async (req, res) => {
    try {
        const { month, year, type } = req.query;
        
        // Tarih aralığını belirle
        const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
        const endDate = moment(startDate).endOf('month').toDate();
        
        // Önceki ay için tarih aralığı
        const prevStartDate = moment(startDate).subtract(1, 'month').toDate();
        const prevEndDate = moment(prevStartDate).endOf('month').toDate();

        // Temel sorgu
        const baseMatch = {
            user: req.user._id,
            date: { $gte: startDate, $lte: endDate }
        };

        // Tip filtresi
        if (type && type !== 'all') {
            baseMatch.type = type;
        }

        // Önceki ay için temel sorgu
        const prevBaseMatch = {
            user: req.user._id,
            date: { $gte: prevStartDate, $lte: prevEndDate }
        };

        if (type && type !== 'all') {
            prevBaseMatch.type = type;
        }

        // Toplam gelir ve gider
        const totals = await Transaction.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Önceki ay toplamları
        const prevTotals = await Transaction.aggregate([
            { $match: prevBaseMatch },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Kategori bazlı dağılım
        const categoryBreakdown = await Transaction.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: {
                        type: '$type',
                        category: '$category'
                    },
                    amount: { $sum: '$amount' }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $project: {
                    _id: 0,
                    type: '$_id.type',
                    categoryId: '$_id.category',
                    categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] },
                    amount: 1
                }
            }
        ]);

        // Günlük dağılım
        const dailyBreakdown = await Transaction.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        type: '$type'
                    },
                    amount: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    income: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'income'] }, '$amount', 0]
                        }
                    },
                    expense: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'expense'] }, '$amount', 0]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Sonuçları formatla
        const result = {
            totalIncome: 0,
            totalExpense: 0,
            netAmount: 0,
            previousMonthComparison: {
                incomeChange: 0,
                expenseChange: 0
            },
            categoryBreakdown: {
                income: [],
                expense: []
            },
            dailyBreakdown: dailyBreakdown.map(day => ({
                date: day._id,
                income: day.income,
                expense: day.expense
            }))
        };

        // Toplamları hesapla
        totals.forEach(item => {
            if (item._id === 'income') result.totalIncome = item.total;
            if (item._id === 'expense') result.totalExpense = item.total;
        });

        result.netAmount = result.totalIncome - result.totalExpense;

        // Önceki ay karşılaştırması
        let prevIncome = 0;
        let prevExpense = 0;

        prevTotals.forEach(item => {
            if (item._id === 'income') prevIncome = item.total;
            if (item._id === 'expense') prevExpense = item.total;
        });

        result.previousMonthComparison = {
            incomeChange: prevIncome ? ((result.totalIncome - prevIncome) / prevIncome) * 100 : 0,
            expenseChange: prevExpense ? ((result.totalExpense - prevExpense) / prevExpense) * 100 : 0
        };

        // Kategori dağılımını hesapla
        categoryBreakdown.forEach(item => {
            const categoryData = {
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                amount: item.amount,
                percentage: item.type === 'income' 
                    ? (item.amount / result.totalIncome) * 100
                    : (item.amount / result.totalExpense) * 100
            };

            if (item.type === 'income') {
                result.categoryBreakdown.income.push(categoryData);
            } else {
                result.categoryBreakdown.expense.push(categoryData);
            }
        });

        // Kategorileri tutara göre sırala
        result.categoryBreakdown.income.sort((a, b) => b.amount - a.amount);
        result.categoryBreakdown.expense.sort((a, b) => b.amount - a.amount);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Kategori bazlı istatistikleri getir
// @route   GET /api/statistics/categories
// @access  Private
export const getCategoryStatistics = async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;

        const matchStage = {
            user: req.user._id,
            date: {
                $gte: moment(startDate).startOf('day').toDate(),
                $lte: moment(endDate).endOf('day').toDate()
            }
        };

        if (type && type !== 'all') {
            matchStage.type = type;
        }

        const categories = await Transaction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        category: '$category',
                        type: '$type'
                    },
                    totalAmount: { $sum: '$amount' },
                    transactionCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $project: {
                    _id: 0,
                    categoryId: '$_id.category',
                    categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] },
                    type: '$_id.type',
                    totalAmount: 1,
                    transactionCount: 1,
                    averageAmount: { $divide: ['$totalAmount', '$transactionCount'] }
                }
            }
        ]);

        // Toplam tutarları hesapla
        const totals = await Transaction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Yüzdeleri hesapla
        const result = categories.map(category => {
            const total = totals.find(t => t._id === category.type)?.total || 0;
            return {
                ...category,
                percentage: total ? (category.totalAmount / total) * 100 : 0
            };
        });

        res.json({
            success: true,
            data: {
                categories: result
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Zaman bazlı trend istatistiklerini getir
// @route   GET /api/statistics/trends
// @access  Private
export const getTrendStatistics = async (req, res) => {
    try {
        const { period, startDate, endDate, type } = req.query;

        const matchStage = {
            user: req.user._id,
            date: {
                $gte: moment(startDate).startOf('day').toDate(),
                $lte: moment(endDate).endOf('day').toDate()
            }
        };

        if (type && type !== 'all') {
            matchStage.type = type;
        }

        let dateFormat;
        switch (period) {
            case 'daily':
                dateFormat = '%Y-%m-%d';
                break;
            case 'weekly':
                dateFormat = '%Y-%U';
                break;
            case 'monthly':
                dateFormat = '%Y-%m';
                break;
            case 'yearly':
                dateFormat = '%Y';
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }

        const trends = await Transaction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        period: { $dateToString: { format: dateFormat, date: '$date' } },
                        type: '$type'
                    },
                    amount: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.period',
                    income: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'income'] }, '$amount', 0]
                        }
                    },
                    expense: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'expense'] }, '$amount', 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    period: '$_id',
                    income: 1,
                    expense: 1,
                    netAmount: { $subtract: ['$income', '$expense'] }
                }
            },
            { $sort: { period: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                trends
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Özel istatistikleri getir
// @route   GET /api/statistics/custom
// @access  Private
export const getCustomStatistics = async (req, res) => {
    try {
        const { metrics, startDate, endDate, type } = req.query;
        const requestedMetrics = metrics.split(',');

        const matchStage = {
            user: req.user._id,
            date: {
                $gte: moment(startDate).startOf('day').toDate(),
                $lte: moment(endDate).endOf('day').toDate()
            }
        };

        if (type && type !== 'all') {
            matchStage.type = type;
        }

        const result = {};

        // Ortalama işlem tutarı
        if (requestedMetrics.includes('averageTransaction')) {
            const avgResult = await Transaction.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        averageAmount: { $avg: '$amount' }
                    }
                }
            ]);
            result.averageTransactionAmount = avgResult[0]?.averageAmount || 0;
        }

        // En büyük işlem
        if (requestedMetrics.includes('largestTransaction')) {
            const largestResult = await Transaction.aggregate([
                { $match: matchStage },
                { $sort: { amount: -1 } },
                { $limit: 1 },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                {
                    $project: {
                        _id: 0,
                        amount: 1,
                        description: 1,
                        date: 1,
                        categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] }
                    }
                }
            ]);
            result.largestTransaction = largestResult[0] || null;
        }

        // En sık kullanılan kategori
        if (requestedMetrics.includes('mostFrequentCategory')) {
            const frequentResult = await Transaction.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$category',
                        transactionCount: { $sum: 1 },
                        totalAmount: { $sum: '$amount' }
                    }
                },
                { $sort: { transactionCount: -1 } },
                { $limit: 1 },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                {
                    $project: {
                        _id: 0,
                        categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] },
                        transactionCount: 1,
                        totalAmount: 1
                    }
                }
            ]);
            result.mostFrequentCategory = frequentResult[0] || null;
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Tarih aralığı bazlı istatistikleri getir
// @route   GET /api/statistics/period
// @access  Private
export const getPeriodStatistics = async (req, res) => {
    try {
        const { fromDate, toDate, type, compareWithPrevious } = req.query;
        
        // Tarih aralığını belirle
        const startDate = moment(fromDate).startOf('day').toDate();
        const endDate = moment(toDate).endOf('day').toDate();
        
        // Önceki periyot için tarih aralığı
        const periodDuration = moment(endDate).diff(moment(startDate), 'days');
        const prevStartDate = moment(startDate).subtract(periodDuration, 'days').toDate();
        const prevEndDate = moment(startDate).subtract(1, 'days').toDate();

        // Temel sorgu
        const baseMatch = {
            user: req.user._id,
            date: { $gte: startDate, $lte: endDate }
        };

        if (type && type !== 'all') {
            baseMatch.type = type;
        }

        // Önceki periyot için temel sorgu
        const prevBaseMatch = {
            user: req.user._id,
            date: { $gte: prevStartDate, $lte: prevEndDate }
        };

        if (type && type !== 'all') {
            prevBaseMatch.type = type;
        }

        // Toplam gelir ve gider
        const totals = await Transaction.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Kategori bazlı dağılım
        const categoryBreakdown = await Transaction.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: {
                        type: '$type',
                        category: '$category'
                    },
                    amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $project: {
                    _id: 0,
                    type: '$_id.type',
                    categoryId: '$_id.category',
                    categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] },
                    amount: 1,
                    count: 1
                }
            }
        ]);

        // Günlük dağılım
        const dailyBreakdown = await Transaction.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        type: '$type'
                    },
                    amount: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    income: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'income'] }, '$amount', 0]
                        }
                    },
                    expense: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'expense'] }, '$amount', 0]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Sonuçları formatla
        const result = {
            period: {
                fromDate: startDate,
                toDate: endDate
            },
            totalIncome: 0,
            totalExpense: 0,
            netAmount: 0,
            transactionCounts: {
                income: 0,
                expense: 0
            },
            categoryBreakdown: {
                income: [],
                expense: []
            },
            dailyBreakdown: dailyBreakdown.map(day => ({
                date: day._id,
                income: day.income,
                expense: day.expense,
                netAmount: day.income - day.expense
            }))
        };

        // Toplamları hesapla
        totals.forEach(item => {
            if (item._id === 'income') {
                result.totalIncome = item.total;
                result.transactionCounts.income = item.count;
            }
            if (item._id === 'expense') {
                result.totalExpense = item.total;
                result.transactionCounts.expense = item.count;
            }
        });

        result.netAmount = result.totalIncome - result.totalExpense;

        // Kategori dağılımını hesapla
        categoryBreakdown.forEach(item => {
            const categoryData = {
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                amount: item.amount,
                count: item.count,
                percentage: item.type === 'income' 
                    ? (item.amount / result.totalIncome) * 100
                    : (item.amount / result.totalExpense) * 100
            };

            if (item.type === 'income') {
                result.categoryBreakdown.income.push(categoryData);
            } else {
                result.categoryBreakdown.expense.push(categoryData);
            }
        });

        // Kategorileri tutara göre sırala
        result.categoryBreakdown.income.sort((a, b) => b.amount - a.amount);
        result.categoryBreakdown.expense.sort((a, b) => b.amount - a.amount);

        // Önceki periyot karşılaştırması
        if (compareWithPrevious === 'true') {
            const prevTotals = await Transaction.aggregate([
                { $match: prevBaseMatch },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$amount' }
                    }
                }
            ]);

            let prevIncome = 0;
            let prevExpense = 0;

            prevTotals.forEach(item => {
                if (item._id === 'income') prevIncome = item.total;
                if (item._id === 'expense') prevExpense = item.total;
            });

            result.previousPeriodComparison = {
                incomeChange: prevIncome ? ((result.totalIncome - prevIncome) / prevIncome) * 100 : 0,
                expenseChange: prevExpense ? ((result.totalExpense - prevExpense) / prevExpense) * 100 : 0
            };
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const getStatistics = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Mevcut ay ve önceki ay için tarih aralıklarını hesapla
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Mevcut ay için işlemleri getir
    const currentMonthTransactions = await Transaction.find({
      user: userId,
      date: { $gte: currentMonthStart, $lte: currentMonthEnd }
    }).populate('category');

    // Önceki ay için işlemleri getir
    const previousMonthTransactions = await Transaction.find({
      user: userId,
      date: { $gte: previousMonthStart, $lte: previousMonthEnd }
    }).populate('category');

    // Tüm hedefleri getir
    const allGoals = await Goal.find({
      user: userId
    });

    // Aktif hedefleri filtrele
    const activeGoals = allGoals.filter(goal => 
      goal.deadline >= now && goal.currentAmount < goal.targetAmount
    );

    // Tamamlanan hedefleri filtrele
    const completedGoals = allGoals.filter(goal => 
      goal.currentAmount >= goal.targetAmount && 
      goal.updatedAt >= currentMonthStart && 
      goal.updatedAt <= currentMonthEnd
    );

    // Önceki ay için tamamlanan hedefleri filtrele
    const previousMonthCompletedGoals = allGoals.filter(goal => 
      goal.currentAmount >= goal.targetAmount && 
      goal.updatedAt >= previousMonthStart && 
      goal.updatedAt <= previousMonthEnd
    );

    // Mevcut ay verilerini hesapla
    const currentMonthData = {
      period: {
        start: currentMonthStart,
        end: currentMonthEnd,
        month: moment(currentMonthStart).format('MMMM YYYY')
      },
      averageTransactionPerDay: currentMonthTransactions.length / moment().diff(currentMonthStart, 'days'),
      transactionCount: currentMonthTransactions.length,
      activeGoalCount: activeGoals.length,
      completedGoalCount: completedGoals.length,
      activeGoalsAverageProgress: activeGoals.length > 0 
        ? activeGoals.reduce((acc, goal) => acc + (goal.currentAmount / goal.targetAmount), 0) / activeGoals.length 
        : 0,
      totalIncome: currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
      totalExpense: currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
      goalsContributionAmount: currentMonthTransactions
        .filter(t => t.type === 'expense' && t.category?.name === '🎯 Hedefler')
        .reduce((acc, t) => acc + t.amount, 0)
    };

    // Net bakiye ve tasarruf oranını hesapla
    currentMonthData.netBalance = currentMonthData.totalIncome - currentMonthData.totalExpense;
    currentMonthData.savingRate = currentMonthData.totalIncome ? currentMonthData.netBalance / currentMonthData.totalIncome : 0;

    // Kategori bazında giderleri hesapla
    currentMonthData.expensesByCategory = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const categoryName = t.category?.name || 'Diğer';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {});

    // Kaynak bazında gelirleri hesapla
    currentMonthData.incomeBySource = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        const categoryName = t.category?.name || 'Diğer';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {});

    // Önceki ay verilerini hesapla
    const previousMonthData = {
      period: {
        start: previousMonthStart,
        end: previousMonthEnd,
        month: moment(previousMonthStart).format('MMMM YYYY')
      },
      averageTransactionPerDay: previousMonthTransactions.length / moment(previousMonthEnd).diff(previousMonthStart, 'days'),
      transactionCount: previousMonthTransactions.length,
      activeGoalCount: activeGoals.length, // Aktif hedef sayısı aynı kalır
      completedGoalCount: previousMonthCompletedGoals.length,
      activeGoalsAverageProgress: activeGoals.length > 0 
        ? activeGoals.reduce((acc, goal) => acc + (goal.currentAmount / goal.targetAmount), 0) / activeGoals.length 
        : 0,
      totalIncome: previousMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
      totalExpense: previousMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
      goalsContributionAmount: previousMonthTransactions
        .filter(t => t.type === 'expense' && t.category?.name === '🎯 Hedefler')
        .reduce((acc, t) => acc + t.amount, 0),
      netBalance: 0,
      savingRate: 0,
      expensesByCategory: previousMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const categoryName = t.category?.name || 'Diğer';
          acc[categoryName] = (acc[categoryName] || 0) + t.amount;
          return acc;
        }, {}),
      incomeBySource: previousMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => {
          const categoryName = t.category?.name || 'Diğer';
          acc[categoryName] = (acc[categoryName] || 0) + t.amount;
          return acc;
        }, {})
    };

    // Önceki ay için net bakiye ve tasarruf oranını hesapla
    previousMonthData.netBalance = previousMonthData.totalIncome - previousMonthData.totalExpense;
    previousMonthData.savingRate = previousMonthData.totalIncome ? previousMonthData.netBalance / previousMonthData.totalIncome : 0;

    res.json({
      success: true,
      data: {
        user: userId,
        currentMonthData,
        previousMonthData
      }
    });
  } catch (error) {
    console.error('İstatistik verileri getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistik verileri getirilirken bir hata oluştu'
    });
  }
}; 