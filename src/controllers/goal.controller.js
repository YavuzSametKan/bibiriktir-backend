import Goal from '../models/Goal.js';

// Hedef oluştur
export const createGoal = async (req, res) => {
    try {
        const { title, targetAmount, deadline, contributions } = req.body;
        const userId = req.user.id;

        const goal = new Goal({
            user: userId,
            title,
            targetAmount,
            deadline,
            contributions: contributions || []
        });

        await goal.save();

        res.status(201).json({
            success: true,
            data: goal
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedef oluşturulurken bir hata oluştu'
        });
    }
};

// Hedef güncelle
export const updateGoal = async (req, res) => {
    try {
        const { goalId } = req.params;
        const { title, targetAmount, deadline, contributions } = req.body;
        const userId = req.user.id;

        const goal = await Goal.findOneAndUpdate(
            { _id: goalId, user: userId },
            { title, targetAmount, deadline, contributions },
            { new: true, runValidators: true }
        );

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Hedef bulunamadı'
            });
        }

        res.json({
            success: true,
            data: goal
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedef güncellenirken bir hata oluştu'
        });
    }
};

// Hedefleri listele
export const getGoals = async (req, res) => {
    try {
        const userId = req.user.id;
        const goals = await Goal.find({ user: userId });

        res.json({
            success: true,
            data: { goals }
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedefler listelenirken bir hata oluştu'
        });
    }
};

// Hedef detayı
export const getGoalById = async (req, res) => {
    try {
        const { goalId } = req.params;
        const userId = req.user.id;

        const goal = await Goal.findOne({ _id: goalId, user: userId });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Hedef bulunamadı'
            });
        }

        res.json({
            success: true,
            data: goal
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedef detayı alınırken bir hata oluştu'
        });
    }
};

// Hedefe katkı ekle
export const addContribution = async (req, res) => {
    try {
        const { goalId } = req.params;
        const { amount, date, note } = req.body;
        const userId = req.user.id;

        const goal = await Goal.findOne({ _id: goalId, user: userId });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Hedef bulunamadı'
            });
        }

        goal.contributions.push({ amount, date, note });
        await goal.save();

        res.status(201).json({
            success: true,
            data: goal.contributions[goal.contributions.length - 1]
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedefe katkı eklemek için bir hata oluştu'
        });
    }
};

// Hedef sil
export const deleteGoal = async (req, res) => {
    try {
        const { goalId } = req.params;
        const userId = req.user.id;

        const goal = await Goal.findOneAndDelete({ _id: goalId, user: userId });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Hedef bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Hedef başarıyla silindi'
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedef silinirken bir hata oluştu'
        });
    }
};

// Hedef istatistikleri
export const getGoalStatistics = async (req, res) => {
    try {
        const userId = req.user.id;

        const goals = await Goal.find({ user: userId });
        const activeGoals = goals.filter(goal => new Date(goal.deadline) > new Date());

        // Aylık hedef istatistikleri
        const goalsByMonth = goals.reduce((acc, goal) => {
            const month = new Date(goal.deadline).toISOString().slice(0, 7); // YYYY-MM formatı
            if (!acc[month]) {
                acc[month] = {
                    month,
                    targetAmount: 0,
                    currentAmount: 0
                };
            }
            acc[month].targetAmount += goal.targetAmount;
            acc[month].currentAmount += goal.currentAmount;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                totalGoals: goals.length,
                activeGoals: activeGoals.length,
                totalTargetAmount: goals.reduce((sum, goal) => sum + goal.targetAmount, 0),
                totalCurrentAmount: goals.reduce((sum, goal) => sum + goal.currentAmount, 0),
                goalsByMonth: Object.values(goalsByMonth)
            }
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedef istatistikleri alınırken bir hata oluştu'
        });
    }
};

// Hedef katkısını güncelle
export const updateContribution = async (req, res) => {
    try {
        const { goalId, contributionId } = req.params;
        const { amount, date, note } = req.body;
        const userId = req.user.id;

        const goal = await Goal.findOne({ _id: goalId, user: userId });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Hedef bulunamadı'
            });
        }

        const contribution = goal.contributions.id(contributionId);
        if (!contribution) {
            return res.status(404).json({
                success: false,
                message: 'Katkı bulunamadı'
            });
        }

        // Katkıyı güncelle
        contribution.amount = amount;
        contribution.date = date;
        if (note !== undefined) {
            contribution.note = note;
        }

        await goal.save();

        res.json({
            success: true,
            data: contribution
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedef katkısı güncellenirken bir hata oluştu'
        });
    }
};

// Hedef katkısını sil
export const deleteContribution = async (req, res) => {
    try {
        const { goalId, contributionId } = req.params;
        const userId = req.user.id;

        const goal = await Goal.findOne({ _id: goalId, user: userId });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Hedef bulunamadı'
            });
        }

        const contribution = goal.contributions.id(contributionId);
        if (!contribution) {
            return res.status(404).json({
                success: false,
                message: 'Katkı bulunamadı'
            });
        }

        // Katkıyı sil
        contribution.deleteOne();
        await goal.save();

        res.json({
            success: true,
            message: 'Katkı başarıyla silindi'
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({
            success: false,
            message: 'Hedef katkısı silinirken bir hata oluştu'
        });
    }
}; 