import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectDb  from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import authRouter from './routes/auth.routes.js'
import userRouter from './routes/user.routes.js'
import cookieParser from 'cookie-parser';
import cors from 'cors';

// Configure Cloudinary after environment variables are loaded
configureCloudinary();

const app=express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://virtual-assitant-5nl3.onrender.com"
  ],
  credentials: true
}));

const port=process.env.PORT || 8000
app.use(express.json())
app.use(cookieParser())


app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)

app.listen(port,()=>{
    connectDb();
    console.log("server started")
})
