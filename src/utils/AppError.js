/**
 * Lỗi nghiệp vụ / lỗi vận hành có thể dự đoán (operational error).
 * Error handler sẽ trả về statusCode + message cho client.
 * Mọi lỗi KHÔNG phải AppError được coi là lỗi lập trình → trả 500, ẩn chi tiết.
 */
class AppError extends Error {
    constructor(statusCode, message, { code, details, cause } = {}) {
        super(message, cause ? { cause } : undefined);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
    }

    static badRequest(message, opts) {
        return new AppError(400, message, { code: 'BAD_REQUEST', ...opts });
    }

    static notFound(message = 'Không tìm thấy tài nguyên.', opts) {
        return new AppError(404, message, { code: 'NOT_FOUND', ...opts });
    }

    static payloadTooLarge(message, opts) {
        return new AppError(413, message, { code: 'PAYLOAD_TOO_LARGE', ...opts });
    }

    static tooManyRequests(message = 'Quá nhiều yêu cầu, vui lòng thử lại sau.', opts) {
        return new AppError(429, message, { code: 'TOO_MANY_REQUESTS', ...opts });
    }

    static serviceUnavailable(message = 'Dịch vụ tạm thời không khả dụng.', opts) {
        return new AppError(503, message, { code: 'SERVICE_UNAVAILABLE', ...opts });
    }
}

module.exports = AppError;
