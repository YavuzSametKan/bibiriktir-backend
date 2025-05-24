import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'İsim alanı zorunludur'],
        trim: true,
        minlength: [2, 'İsim en az 2 karakter olmalıdır'],
        maxlength: [50, 'İsim en fazla 50 karakter olmalıdır']
    },
    lastName: {
        type: String,
        required: [true, 'Soyisim alanı zorunludur'],
        trim: true,
        minlength: [2, 'Soyisim en az 2 karakter olmalıdır'],
        maxlength: [50, 'Soyisim en fazla 50 karakter olmalıdır']
    },
    email: {
        type: String,
        required: [true, 'E-posta alanı zorunludur'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Lütfen geçerli bir e-posta adresi girin'
        ]
    },
    password: {
        type: String,
        required: [true, 'Şifre alanı zorunludur'],
        minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
        select: false
    },
    birthDate: {
        type: Date,
        required: [true, 'Doğum tarihinizi girin']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Şifre hashleme middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Şifre karşılaştırma metodu
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User; 