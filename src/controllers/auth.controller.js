import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                error: 'Bu e-posta adresi zaten kullanımda'
            });
        }

        const user = await User.create({
            name,
            email,
            password
        });

        const token = generateToken(user._id);

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 gün
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Kullanıcı girişi
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({
                success: false,
                error: 'Geçersiz e-posta veya şifre'
            });
        }

        const token = generateToken(user._id);

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 gün
        });

        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Kullanıcı çıkışı
// @route   POST /api/auth/logout
// @access  Private
export const logout = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.json({
        success: true,
        message: 'Başarıyla çıkış yapıldı'
    });
};

// @desc    Kullanıcı profili
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
    res.json({
        success: true,
        data: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email
        }
    });
}; 