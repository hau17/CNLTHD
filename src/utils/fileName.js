const path = require('path');

function removeVietnameseTones(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

/**
 * Multer (busboy) đọc tên file theo latin1 → cần decode lại về UTF-8 để giữ tiếng Việt.
 */
function decodeOriginalName(originalname) {
    return Buffer.from(originalname, 'latin1').toString('utf8');
}

/**
 * Tạo tên PDF an toàn từ tên file gốc: bỏ dấu, chỉ giữ [a-zA-Z0-9_].
 */
function toSafePdfName(originalname) {
    const base = path.parse(decodeOriginalName(originalname)).name;
    const safe = removeVietnameseTones(base).replace(/[^a-zA-Z0-9]/g, '_') || 'file';
    return `${safe}.pdf`;
}

module.exports = { removeVietnameseTones, decodeOriginalName, toSafePdfName };
