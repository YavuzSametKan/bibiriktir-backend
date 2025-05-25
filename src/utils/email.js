import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// E-posta gönderici oluştur
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// E-posta gönderme fonksiyonu
export const sendEmail = async ({ to, subject, text }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('E-posta gönderildi:', info.messageId);
    return true;
  } catch (error) {
    console.error('E-posta gönderilirken hata:', error);
    throw new Error('E-posta gönderilemedi');
  }
}; 