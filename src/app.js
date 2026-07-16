import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ApiError } from "./utils/ApiError.js";
import { API_PREFIX } from "./constants.js";
import userRoutes from "./routes/user.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import watchlistRoutes from "./routes/watchlist.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import cryptoRoutes from "./routes/crypto.routes.js";
import connectDB from "./db/index.js";

const app = express();

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
    })
);

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: "Too many requests, please try again later",
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", message: "Crypto Portfolio API is running" });
});

app.use(API_PREFIX, (_req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
});

const requireDB = async (_req, res, next) => {
    if (mongoose.connection.readyState === 0) {
        await connectDB();
    }
    if (mongoose.connection.readyState === 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            statusCode: 503,
            message: "Database connection pending or blocked. Please whitelist your IP address on MongoDB Atlas (Security -> Network Access -> Add IP Address / 0.0.0.0/0).",
        });
    }
    next();
};

app.use(`${API_PREFIX}/users`, requireDB, userRoutes);
app.use(`${API_PREFIX}/portfolio`, requireDB, portfolioRoutes);
app.use(`${API_PREFIX}/watchlist`, requireDB, watchlistRoutes);
app.use(`${API_PREFIX}/alerts`, requireDB, alertRoutes);
app.use(`${API_PREFIX}/crypto`, cryptoRoutes);

const clientBuildPath = path.join(process.cwd(), "client/dist");
if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.use((req, res, next) => {
        if (req.path.startsWith(API_PREFIX)) return next();
        res.sendFile(path.join(clientBuildPath, "index.html"));
    });
}

app.use((_req, _res, next) => {
    next(new ApiError(404, "Route not found"));
});

app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || [],
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});

export { app };
