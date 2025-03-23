import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRouter from "./features/auth/router.js";

const app = express()

app.use(express.json())

// Uploading env file
dotenv.config()

mongoose.connect(process.env.DATABASE_CONNECTION_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connection is successfully'))
.catch(err => console.error('MongoDB connection is unsuccessfully:', err))

app.use(cookieParser(process.env.COOKIE_SECRET_KEY))

const PORT = process.env.PORT || 3000

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).send({ msg: 'Bibiriktir server is running.' })
})

app.use('/auth', authRouter)

app.listen(PORT, () => {
    console.log(`Server is running to localhost:${PORT}`)
})