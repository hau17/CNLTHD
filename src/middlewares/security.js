const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const config = require('../config');
const AppError = require('../utils/AppError');

// Giao diện dùng Tailwind Play CDN: script tải từ CDN và tự chèn thẻ <style> lúc chạy,
// nên phải cho phép domain này ở script-src và 'unsafe-inline' ở style-src.
const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://cdn.tailwindcss.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            // Server chạy HTTP (localhost/LAN); nếu bật thì trình duyệt ép request sang HTTPS và hỏng.
            upgradeInsecureRequests: null,
        },
    },
});

// Không cấu hình CORS_ORIGINS → origin: false → không gửi header CORS, chỉ same-origin gọi được.
const corsMiddleware = cors({
    origin: config.security.corsOrigins.length > 0 ? config.security.corsOrigins : false,
    methods: ['GET', 'POST'],
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
    maxAge: 600,
});

const rateLimitHandler = (req, res, next, options) => {
    next(AppError.tooManyRequests(options.message));
};

// Upload tốn CPU (LibreOffice) và đĩa → giới hạn chặt theo IP.
const uploadLimiter = rateLimit({
    windowMs: config.security.uploadRateLimit.windowMs,
    limit: config.security.uploadRateLimit.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: 'Bạn đã tải lên quá nhiều lần, vui lòng thử lại sau.',
    handler: rateLimitHandler,
});

// Các API còn lại: client poll /status mỗi 2 giây (~30 req/phút) nên để rộng hơn.
const apiLimiter = rateLimit({
    windowMs: config.security.apiRateLimit.windowMs,
    limit: config.security.apiRateLimit.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler,
});

module.exports = { helmetMiddleware, corsMiddleware, uploadLimiter, apiLimiter };
