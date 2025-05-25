import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/email.js';
import { rateLimit } from 'express-rate-limit';
import crypto from 'crypto';

// Şifre güncelleme sürecini başlat
export const startPasswordUpdate = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user._id;

    // Kullanıcıyı bul ve şifreyi seç
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Mevcut şifreyi kontrol et
    const isPasswordValid = await user.matchPassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre yanlış'
      });
    }

    // Yeni şifre validasyonu
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&])[A-Za-z\d!@#$%^&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 8 karakter olmalı, büyük harf, küçük harf, sayı ve özel karakter içermelidir'
      });
    }

    // Şifrelerin eşleştiğini kontrol et
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'Yeni şifreler eşleşmiyor'
      });
    }

    // 6 haneli doğrulama kodu oluştur
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika

    // Kodu ve yeni şifreyi geçici olarak sakla
    user.tempPasswordUpdate = {
      newPassword,
      verificationCode,
      expiresAt
    };
    await user.save();

    // E-posta gönder
    const emailContent = `
      Merhaba ${user.firstName},

      Şifrenizi güncellemek için kullanmanız gereken doğrulama kodu: ${verificationCode}
      Bu kod 5 dakika boyunca geçerlidir.

      Eğer bu işlemi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.

      Saygılarımızla,
      Bibiriktir Ekibi
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Şifre Güncelleme Doğrulama Kodu',
        text: emailContent
      });
    } catch (emailError) {
      console.error('E-posta gönderilirken hata:', emailError);
      // E-posta gönderimi başarısız olursa işlemi iptal et
      user.tempPasswordUpdate = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: 'Doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.'
      });
    }

    res.json({
      success: true,
      message: 'Doğrulama kodu e-posta adresinize gönderildi'
    });
  } catch (error) {
    console.error('Şifre güncelleme başlatılırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre güncelleme işlemi başlatılırken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Doğrulama kodunu kontrol et ve şifreyi güncelle
export const verifyAndUpdatePassword = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    // Kullanıcıyı bul
    const user = await User.findById(userId).select('+password');
    if (!user || !user.tempPasswordUpdate) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz işlem'
      });
    }

    const { newPassword, verificationCode, expiresAt } = user.tempPasswordUpdate;

    // Kodun süresini kontrol et
    if (new Date() > expiresAt) {
      user.tempPasswordUpdate = undefined;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Kodun süresi doldu'
      });
    }

    // Kodu kontrol et
    if (code !== verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Kod hatalı veya süresi dolmuş'
      });
    }

    // Şifreyi güncelle
    user.password = newPassword; // User modelindeki pre-save middleware otomatik olarak hashleyecek
    user.tempPasswordUpdate = undefined;
    await user.save();

    // Başarılı güncelleme e-postası gönder
    const emailContent = `
      Merhaba ${user.firstName},

      Şifreniz başarıyla güncellendi.
      Eğer bu işlemi siz yapmadıysanız, lütfen hemen bizimle iletişime geçin.

      Saygılarımızla,
      Bibiriktir Ekibi
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Şifreniz Güncellendi',
        text: emailContent
      });
    } catch (emailError) {
      console.error('Onay e-postası gönderilirken hata:', emailError);
      // E-posta gönderimi başarısız olsa bile işleme devam et
    }

    res.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Şifre güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre güncellenirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 