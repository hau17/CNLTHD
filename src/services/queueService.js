const { Queue } = require('bullmq');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const QUEUE_NAME = config.queue.name;

const JOB_OPTIONS = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
};

// enableOfflineQueue: false → khi mất kết nối Redis, lệnh lỗi ngay thay vì bị ioredis
// giữ lại chờ kết nối lại vô thời hạn (request upload sẽ treo đến khi client timeout).
const convertQueue = new Queue(QUEUE_NAME, {
    connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        enableOfflineQueue: false,
    },
});

// Không có listener 'error' thì EventEmitter sẽ throw và làm sập process khi Redis mất kết nối.
convertQueue.on('error', (err) => {
    logger.error('queue connection error', { queue: QUEUE_NAME, error: err.message });
});

/**
 * Lỗi Redis là lỗi hạ tầng có thể xảy ra khi vận hành → đổi thành 503 cho client,
 * giữ lỗi gốc trong `cause` để error handler ghi log.
 *
 * Cần timeout vì BullMQ đợi kết nối Redis "ready" (retry vô hạn) trước khi gửi lệnh;
 * enableOfflineQueue chỉ có tác dụng khi kết nối rớt sau khi đã ready.
 */
async function withQueue(operation, fn) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`Redis không phản hồi sau ${config.redis.commandTimeoutMs}ms (${operation})`)),
            config.redis.commandTimeoutMs
        );
    });

    try {
        return await Promise.race([fn(), timeout]);
    } catch (err) {
        throw AppError.serviceUnavailable(
            'Hàng đợi xử lý đang không khả dụng, vui lòng thử lại sau.',
            { code: 'QUEUE_UNAVAILABLE', cause: err }
        );
    } finally {
        clearTimeout(timer);
    }
}

async function addConvertJobs(jobs) {
    const added = await withQueue('addBulk', () =>
        convertQueue.addBulk(jobs.map((data) => ({ name: 'convert', data, opts: JOB_OPTIONS })))
    );
    return added.map((job) => job.id);
}

/**
 * Đếm số job đã completed / failed trong một batch.
 */
async function countJobStates(jobIds) {
    const states = await withQueue('getState', () =>
        Promise.all(
            jobIds.map(async (id) => {
                const job = await convertQueue.getJob(id);
                return job ? job.getState() : 'missing';
            })
        )
    );

    return {
        done: states.filter((s) => s === 'completed').length,
        failed: states.filter((s) => s === 'failed').length,
    };
}

async function close() {
    await convertQueue.close();
}

module.exports = { addConvertJobs, countJobStates, close, QUEUE_NAME };
