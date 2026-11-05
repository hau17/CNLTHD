const AppError = require('../utils/AppError');

function notFound(req, res, next) {
    next(AppError.notFound(`Không tìm thấy route ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
