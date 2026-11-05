const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

const toInt = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? fallback : n;
};

const config = {
    env: process.env.NODE_ENV || 'development',
    port: toInt(process.env.PORT, 3000),
    rootDir: ROOT_DIR,

    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: toInt(process.env.REDIS_PORT, 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        commandTimeoutMs: toInt(process.env.REDIS_COMMAND_TIMEOUT_MS, 5000),
    },

    queue: {
        name: 'excel-convert',
        workerConcurrency: toInt(process.env.WORKER_CONCURRENCY, 4),
        jobLockMs: 60000,
    },

    storage: {
        uploadDir: path.resolve(ROOT_DIR, process.env.UPLOAD_DIR || 'uploads'),
        outputDir: path.resolve(ROOT_DIR, process.env.OUTPUT_DIR || 'output'),
        zipDir: path.resolve(ROOT_DIR, process.env.ZIP_DIR || 'zips'),
    },

    upload: {
        maxFiles: toInt(process.env.MAX_FILES, 50),
        maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 20) * 1024 * 1024,
    },

    security: {
        // Danh sách origin được phép gọi API, phân tách bằng dấu phẩy. Rỗng = chỉ same-origin.
        corsOrigins: (process.env.CORS_ORIGINS || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        // Số proxy đứng trước server (nginx, load balancer) để req.ip lấy đúng IP client.
        trustProxy: toInt(process.env.TRUST_PROXY, 0),
        uploadRateLimit: {
            windowMs: toInt(process.env.UPLOAD_RATE_WINDOW_MIN, 15) * 60 * 1000,
            limit: toInt(process.env.UPLOAD_RATE_LIMIT, 10),
        },
        apiRateLimit: {
            windowMs: 60 * 1000,
            limit: toInt(process.env.API_RATE_LIMIT_PER_MIN, 120),
        },
    },
};

config.isProduction = config.env === 'production';

module.exports = config;
