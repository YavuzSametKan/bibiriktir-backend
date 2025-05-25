import User from '../models/User.js';
import moment from 'moment';

// @desc    Kullanıcı bilgilerini güncelle
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, birthDate } = req.body;
        const userId = req.user._id;

        // Kullanıcıyı bul
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }

        // Bilgileri güncelle
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (birthDate) user.birthDate = moment(birthDate, 'DD.MM.YYYY').toDate();

        await user.save();

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                birthDate: moment(user.birthDate).format('DD.MM.YYYY')
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Kullanıcı bilgilerini getir
// @route   GET /api/users/profile
// @access  Private
export const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                birthDate: moment(user.birthDate).format('DD.MM.YYYY')
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 