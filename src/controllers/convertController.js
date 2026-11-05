const conversionService = require('../services/conversionService');
const logger = require('../utils/logger');

// Express 5 tự chuyển promise bị reject trong handler sang next(err),
// nên controller không cần try/catch: mọi lỗi đi thẳng tới errorHandler.

async function upload(req, res) {
    const { requestId, total } = await conversionService.createBatch(req.files);

    res.status(202).json({
        status: 'queued',
        requestId,
        total,
        statusUrl: `/status/${requestId}`,
    });
}

async function status(req, res) {
    const { requestId } = req.validated.params;
    res.json(await conversionService.getStatus(requestId));
}

async function download(req, res, next) {
    const { zipName, requestId } = req.validated.params.name;
    const zipPath = await conversionService.getZipForDownload(zipName);

    res.download(zipPath, zipName, (err) => {
        if (err) {
            // Client hủy tải giữa chừng thì header đã gửi; giữ ZIP lại để tải lại được.
            if (!res.headersSent) return next(err);
            logger.warn('download aborted', { reqId: req.id, zipName, error: err.message });
            return;
        }
        conversionService.cleanupAfterDownload(zipName, requestId).catch((cleanupErr) => {
            logger.error('cleanup failed', { reqId: req.id, zipName, error: cleanupErr.message });
        });
    });
}

module.exports = { upload, status, download };
