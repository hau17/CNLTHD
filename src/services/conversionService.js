const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { toSafePdfName } = require('../utils/fileName');
const requestRepository = require('../repositories/requestRepository');
const queueService = require('./queueService');
const zipService = require('./zipService');

// Nhiều lần poll /status có thể đến cùng lúc khi batch vừa xong → chỉ cho tạo ZIP một lần.
const zippingInProgress = new Map();

/**
 * Nhận danh sách file đã upload, tạo batch và đẩy job convert vào queue.
 */
async function createBatch(files) {
    const requestId = randomUUID();
    const outputDir = path.join(config.storage.outputDir, requestId);

    const usedNames = new Set();
    const jobsData = files.map((file) => {
        let outputName = toSafePdfName(file.originalname);
        // Hai file cùng tên sau khi bỏ dấu sẽ ghi đè nhau → thêm hậu tố.
        for (let i = 1; usedNames.has(outputName); i++) {
            outputName = outputName.replace(/(_\d+)?\.pdf$/, `_${i}.pdf`);
        }
        usedNames.add(outputName);

        return { requestId, inputFile: file.path, outputFile: path.join(outputDir, outputName) };
    });

    const jobIds = await queueService.addConvertJobs(jobsData);
    await fs.promises.mkdir(outputDir, { recursive: true });

    await requestRepository.create(requestId, { total: files.length, jobIds, outputDir });
    logger.info('batch queued', { requestId, total: files.length });

    return { requestId, total: files.length };
}

async function buildZipOnce(requestId, state) {
    if (!zippingInProgress.has(requestId)) {
        const task = zipService
            .createZipFromDir(requestId, state.outputDir)
            .then(async ({ zipName, fileCount }) => {
                await requestRepository.update(requestId, { zipName });
                logger.info('zip created', { requestId, zipName, fileCount });
                return zipName;
            })
            .finally(() => zippingInProgress.delete(requestId));
        zippingInProgress.set(requestId, task);
    }
    return zippingInProgress.get(requestId);
}

/**
 * Trả về tiến độ batch; khi tất cả job kết thúc thì tạo ZIP.
 */
async function getStatus(requestId) {
    const state = await requestRepository.findById(requestId);
    if (!state) throw AppError.notFound('Request không tồn tại hoặc đã hết hạn.');

    const base = { requestId, total: state.total };

    if (state.zipName) {
        return { ...base, status: 'done', done: state.done, failed: state.failed, zipUrl: `/download-zip/${state.zipName}` };
    }

    const { done, failed } = await queueService.countJobStates(state.jobIds);
    await requestRepository.update(requestId, { done, failed });

    if (done + failed < state.total) {
        return { ...base, status: 'processing', done, failed, percent: Math.round(((done + failed) / state.total) * 100) };
    }

    const zipName = await buildZipOnce(requestId, state);
    return { ...base, status: 'done', done, failed, zipUrl: `/download-zip/${zipName}` };
}

async function getZipForDownload(zipName) {
    if (!(await zipService.zipExists(zipName))) {
        throw AppError.notFound('File không tồn tại hoặc đã bị xóa.');
    }
    return zipService.zipPathFor(zipName);
}

async function cleanupAfterDownload(zipName, requestId) {
    await zipService.removeZip(zipName);
    await requestRepository.remove(requestId);
    logger.info('batch cleaned up', { requestId, zipName });
}

module.exports = { createBatch, getStatus, getZipForDownload, cleanupAfterDownload };
