const fs = require('fs/promises');

// .xlsx là file ZIP (Office Open XML); .xls là file OLE2 Compound Document.
const SIGNATURES = {
    '.xlsx': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    '.xls': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
};

const MAX_SIGNATURE_LENGTH = 8;

async function readHeader(filePath, length = MAX_SIGNATURE_LENGTH) {
    const handle = await fs.open(filePath, 'r');
    try {
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, 0);
        return buffer.subarray(0, bytesRead);
    } finally {
        await handle.close();
    }
}

/**
 * Kiểm tra magic bytes thực sự của file có khớp với phần mở rộng không.
 * Chặn trường hợp đổi tên file .exe/.html thành .xlsx để vượt qua fileFilter.
 */
async function hasValidExcelSignature(filePath, extension) {
    const expected = SIGNATURES[extension];
    if (!expected) return false;

    const header = await readHeader(filePath);
    return expected.some((sig) => header.length >= sig.length && header.subarray(0, sig.length).equals(sig));
}

module.exports = { hasValidExcelSignature, ALLOWED_EXTENSIONS: Object.keys(SIGNATURES) };
