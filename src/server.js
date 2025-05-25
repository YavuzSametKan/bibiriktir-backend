import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Route'ları import et
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import statisticsRoutes from "./routes/statistics.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import monthlyReviewRoutes from "./routes/monthlyReview.routes.js";
import passwordRoutes from "./routes/password.routes.js";

// Middleware'leri import et
import { errorHandler } from "./middleware/error.middleware.js";
import { protect } from "./middleware/auth.middleware.js";

// Cron job'ı import et
import { startMonthlyReviewJob } from "./jobs/monthlyReviewJob.js";

dotenv.config();

// MongoDB bağlantısı
connectDB();

const app = express();

// CORS ayarları
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Middleware'ler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Uploads dizini için statik erişim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Route'lar
app.use('/api/auth', authRoutes);
app.use('/api/categories', protect, categoryRoutes);
app.use('/api/transactions', protect, transactionRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/goals', protect, goalRoutes);
app.use('/api/monthly-review', monthlyReviewRoutes);
app.use('/api/update-password', protect, passwordRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Cron job'ı başlat
startMonthlyReviewJob();

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});