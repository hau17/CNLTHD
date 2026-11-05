const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const queueService = require('./services/queueService');

const server = app.listen(config.port, () => {
    logger.info('API server started', { url: `http://localhost:${config.port}`, env: config.env });
});

let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutting down', { signal });

    // Ngừng nhận request mới, chờ request đang chạy xong rồi mới đóng kết nối Redis.
    const forceExit = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
        await queueService.close().catch(() => {});
        clearTimeout(forceExit);
        process.exit(exitCode);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Lỗi lọt ra ngoài Express (vd: promise trong callback không được await) → trạng thái process
// không còn tin cậy được, log lại rồi tắt có kiểm soát để Docker restart.
process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', { error: reason instanceof Error ? reason.stack : String(reason) });
    shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
    logger.error('uncaughtException', { error: err.stack });
    shutdown('uncaughtException', 1);
});
