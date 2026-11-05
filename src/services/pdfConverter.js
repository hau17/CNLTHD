const fs = require('fs/promises');
const path = require('path');
const { promisify } = require('util');
const libre = require('libreoffice-convert');

const convertAsync = promisify(libre.convert);

/**
 * Chuyển một file Excel sang PDF bằng LibreOffice headless.
 */
async function convertExcelToPdf(inputFile, outputFile) {
    const excelBuf = await fs.readFile(inputFile);
    const pdfBuf = await convertAsync(excelBuf, '.pdf', undefined);

    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, pdfBuf);
}

async function removeInputFile(inputFile) {
    await fs.rm(inputFile, { force: true });
}

module.exports = { convertExcelToPdf, removeInputFile };
