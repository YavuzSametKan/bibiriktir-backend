import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Bu işlem için yetkiniz yok'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }
        
        next();
    } catch (error) {
        console.error('Auth Middleware Hatası:', error);
        res.status(401).json({
            success: false,
            error: 'Bu işlem için yetkiniz yok'
        });
    }
}; 