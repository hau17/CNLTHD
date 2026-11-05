const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const config = require('../config');

fs.mkdirSync(config.storage.zipDir, { recursive: true });

const zipNameFor = (requestId) => `Ket_Qua_Convert_${requestId}.zip`;

const zipPathFor = (zipName) => path.join(config.storage.zipDir, path.basename(zipName));

/**
 * Gom toàn bộ PDF trong outputDir thành 1 file ZIP rồi xóa thư mục output.
 */
async function createZipFromDir(requestId, outputDir) {
    const zipName = zipNameFor(requestId);
    const zip = new AdmZip();

    const entries = await fs.promises.readdir(outputDir).catch(() => []);
    const pdfFiles = entries.filter((f) => f.endsWith('.pdf'));
    pdfFiles.forEach((f) => zip.addLocalFile(path.join(outputDir, f)));

    await zip.writeZipPromise(zipPathFor(zipName));
    await fs.promises.rm(outputDir, { recursive: true, force: true });

    return { zipName, fileCount: pdfFiles.length };
}

async function zipExists(zipName) {
    try {
        await fs.promises.access(zipPathFor(zipName));
        return true;
    } catch {
        return false;
    }
}

async function removeZip(zipName) {
    await fs.promises.rm(zipPathFor(zipName), { force: true });
}

module.exports = { createZipFromDir, zipExists, removeZip, zipPathFor, zipNameFor };
