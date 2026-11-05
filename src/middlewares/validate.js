const AppError = require('../utils/AppError');

/**
 * Tạo middleware kiểm tra req.params / req.query / req.body theo zod schema.
 * Dữ liệu đã parse được gắn vào req.validated để controller dùng, không đọc lại input thô.
 *
 * Express 5: req.query là getter chỉ đọc, nên không ghi đè trực tiếp lên req.query.
 */
const validate = (schemas) => (req, res, next) => {
    const validated = {};
    const errors = [];

    for (const source of ['params', 'query', 'body']) {
        const schema = schemas[source];
        if (!schema) continue;

        const result = schema.safeParse(req[source] ?? {});
        if (result.success) {
            validated[source] = result.data;
        } else {
            for (const issue of result.error.issues) {
                errors.push({ location: source, field: issue.path.join('.'), message: issue.message });
            }
        }
    }

    if (errors.length > 0) {
        throw AppError.badRequest('Dữ liệu đầu vào không hợp lệ.', { code: 'VALIDATION_ERROR', details: errors });
    }

    req.validated = validated;
    next();
};

module.exports = validate;
