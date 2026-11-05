const path = require('path');
const { Worker } = require('bullmq');
const config = require('./config');
const logger = require('./utils/logger');
const { convertExcelToPdf, removeInputFile } = require('./services/pdfConverter');

async function processJob(job) {
    const { requestId, inputFile, outputFile } = job.data;
    const meta = { requestId, jobId: job.id, attempt: job.attemptsMade + 1, file: path.basename(outputFile) };

    logger.info('job started', meta);
    try {
        await convertExcelToPdf(inputFile, outputFile);
    } catch (err) {
        // Còn lượt retry thì phải giữ file gốc, nếu không các lần thử sau chắc chắn ENOENT.
        const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);
        if (isLastAttempt) await removeInputFile(inputFile);
        throw err;
    }

    await removeInputFile(inputFile);
    return { fileName: path.basename(outputFile) };
}

const worker = new Worker(config.queue.name, processJob, {
    connection: { host: config.redis.host, port: config.redis.port, password: config.redis.password },
    concurrency: config.queue.workerConcurrency,
    lockDuration: config.queue.jobLockMs,
});

worker.on('completed', (job, result) => {
    logger.info('job completed', { requestId: job.data.requestId, jobId: job.id, file: result.fileName });
});

worker.on('failed', (job, err) => {
    logger.error('job failed', {
        requestId: job?.data.requestId,
        jobId: job?.id,
        attempt: job?.attemptsMade,
        error: err.message,
    });
});

worker.on('error', (err) => {
    logger.error('worker error', { error: err.message });
});

async function shutdown(signal) {
    logger.info('worker shutting down', { signal });
    // close() chờ các job đang chạy xong rồi mới thoát.
    await worker.close();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info('worker started', {
    concurrency: config.queue.workerConcurrency,
    redis: `${config.redis.host}:${config.redis.port}`,
});
