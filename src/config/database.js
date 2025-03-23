import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_CONNECTION_URL);
        console.log(`MongoDB bağlantısı başarılı: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Hata: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB; 