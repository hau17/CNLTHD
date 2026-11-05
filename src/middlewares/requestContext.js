const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

const SAFE_ID = /^[a-zA-Z0-9-]{1,64}$/;

/**
 * Gắn mã định danh cho mỗi request (nhận lại X-Request-Id từ proxy nếu hợp lệ)
 * và ghi một dòng log khi response kết thúc: method, url, status, thời gian xử lý.
 */
function requestContext(req, res, next) {
    const incoming = req.get('X-Request-Id');
    req.id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.set('X-Request-Id', req.id);

    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const meta = {
            reqId: req.id,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            durationMs: Math.round(durationMs * 10) / 10,
            ip: req.ip,
        };
        if (res.statusCode >= 500) logger.error('request completed', meta);
        else if (res.statusCode >= 400) logger.warn('request completed', meta);
        else logger.info('request completed', meta);
    });

    next();
}

module.exports = requestContext;
