const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const AppError = require('../utils/AppError');
const { decodeOriginalName } = require('../utils/fileName');
const { hasValidExcelSignature, ALLOWED_EXTENSIONS } = require('../utils/fileSignature');

fs.mkdirSync(config.storage.uploadDir, { recursive: true });

const FIELD_NAME = 'excelFiles';

const extensionOf = (file) => path.extname(decodeOriginalName(file.originalname)).toLowerCase();

const multerUpload = multer({
    dest: config.storage.uploadDir,
    limits: {
        files: config.upload.maxFiles,
        fileSize: config.upload.maxFileSizeBytes,
        fields: 10,
    },
    // Lớp lọc 1: chỉ dựa trên phần mở rộng, chặn sớm trước khi ghi file xuống đĩa.
    fileFilter: (req, file, cb) => {
        const ext = extensionOf(file);
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return cb(AppError.badRequest(
                `File "${decodeOriginalName(file.originalname)}" không hợp lệ. Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}.`,
                { code: 'INVALID_FILE_TYPE' }
            ));
        }
        cb(null, true);
    },
});

async function removeFiles(files) {
    await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
}

/**
 * Lớp lọc 2: sau khi multer ghi file, đọc magic bytes để chắc chắn nội dung đúng là Excel.
 * Nếu một file sai → xóa toàn bộ file của request và trả 400 (không đẩy job nửa vời).
 */
async function verifyExcelSignatures(req, res, next) {
    const files = req.files || [];
    if (files.length === 0) {
        throw AppError.badRequest('Không có file nào được tải lên.', { code: 'NO_FILES' });
    }

    const results = await Promise.all(
        files.map((file) => hasValidExcelSignature(file.path, extensionOf(file)))
    );
    const invalid = files.filter((_, i) => !results[i]);

    if (invalid.length > 0) {
        await removeFiles(files);
        throw AppError.badRequest('Nội dung file không phải Excel hợp lệ.', {
            code: 'INVALID_FILE_CONTENT',
            details: invalid.map((f) => decodeOriginalName(f.originalname)),
        });
    }

    next();
}

module.exports = {
    uploadExcelFiles: [multerUpload.array(FIELD_NAME), verifyExcelSignatures],
    removeFiles,
};
