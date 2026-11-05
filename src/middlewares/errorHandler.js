const multer = require('multer');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { removeFiles } = require('./upload');

const MULTER_ERRORS = {
    LIMIT_FILE_SIZE: () => AppError.payloadTooLarge(
        `Mỗi file tối đa ${Math.round(config.upload.maxFileSizeBytes / 1024 / 1024)}MB.`,
        { code: 'FILE_TOO_LARGE' }
    ),
    LIMIT_FILE_COUNT: () => AppError.badRequest(
        `Chỉ được tải tối đa ${config.upload.maxFiles} file mỗi lần.`,
        { code: 'TOO_MANY_FILES' }
    ),
    LIMIT_UNEXPECTED_FILE: (err) => AppError.badRequest(
        `Field "${err.field}" không hợp lệ, hãy dùng field "excelFiles".`,
        { code: 'UNEXPECTED_FIELD' }
    ),
};

/**
 * Chuẩn hóa mọi loại lỗi về AppError để trả response một định dạng duy nhất.
 */
function normalizeError(err) {
    if (err instanceof AppError) return err;

    if (err instanceof multer.MulterError) {
        const factory = MULTER_ERRORS[err.code];
        return factory ? factory(err) : AppError.badRequest(err.message, { code: err.code });
    }

    // Lỗi parse JSON body từ express.json() (body-parser gắn type + status).
    if (err.type === 'entity.parse.failed') {
        return AppError.badRequest('Body JSON không hợp lệ.', { code: 'INVALID_JSON' });
    }
    if (err.type === 'entity.too.large') {
        return AppError.payloadTooLarge('Body quá lớn.');
    }

    return null;
}

// Express nhận biết error middleware nhờ đủ 4 tham số, nên không được bỏ `next`.
// eslint-disable-next-line no-unused-vars
async function errorHandler(err, req, res, next) {
    // Lỗi xảy ra sau khi multer đã ghi file (vd: Redis chết lúc add job) → dọn file tạm.
    if (req.files && req.files.length > 0) await removeFiles(req.files);

    const appError = normalizeError(err);
    const statusCode = appError ? appError.statusCode : 500;

    if (statusCode >= 500) {
        logger.error(err.message, {
            reqId: req.id,
            code: appError?.code,
            cause: err.cause?.message,
            stack: (err.cause || err).stack,
        });
    }

    if (res.headersSent) return;

    const body = {
        status: 'error',
        code: appError?.code || 'INTERNAL_ERROR',
        message: appError ? appError.message : 'Lỗi hệ thống, vui lòng thử lại sau.',
        requestId: req.id,
    };
    if (appError?.details) body.details = appError.details;
    if (!appError && !config.isProduction) body.debug = err.message;

    res.status(statusCode).json(body);
}

module.exports = errorHandler;
