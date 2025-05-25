import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import moment from 'moment';
import crypto from 'crypto';

// @desc    Kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, birthDate } = req.body;

        // Kullanıcı kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Bu e-posta adresi zaten kullanılıyor'
            });
        }

        // Doğum tarihi kontrolü
        if (!birthDate) {
            return res.status(400).json({
                success: false,
                error: 'Doğum tarihi zorunludur'
            });
        }

        // Kullanıcı oluşturma
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            birthDate: moment(birthDate, 'DD.MM.YYYY').toDate()
        });

        // Token oluşturma ve cookie'ye kaydetme
        const token = generateToken(user._id);
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 gün
        });

        res.status(201).json({
            success: true,
            message: 'Kullanıcı başarıyla oluşturuldu'
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

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({
                success: false,
                error: 'Geçersiz e-posta veya şifre'
            });
        }

        // Token oluşturma ve cookie'ye kaydetme
        const token = generateToken(user._id);
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 gün
        });

        res.status(200).json({
            success: true,
            message: 'Giriş başarılı',
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

// @desc    Kullanıcı çıkışı
// @route   POST /api/auth/logout
// @access  Private
export const logout = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({
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
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            birthDate: moment(req.user.birthDate).format('DD.MM.YYYY')
        }
    });
};

// @desc    Oturum kontrolü
// @route   GET /api/auth/check-auth
// @access  Private
export const checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Oturum geçersiz'
            });
        }

        res.json({
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