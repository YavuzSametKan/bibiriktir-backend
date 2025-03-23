import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";

// Route'ları import et
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

// Middleware'leri import et
import { errorHandler } from "./middleware/error.middleware.js";
import { protect } from "./middleware/auth.middleware.js";

dotenv.config();

// MongoDB bağlantısı
connectDB();

const app = express();

// Middleware'ler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Route'lar
app.use('/api/auth', authRoutes);
app.use('/api/categories', protect, categoryRoutes);
app.use('/api/transactions', protect, transactionRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});