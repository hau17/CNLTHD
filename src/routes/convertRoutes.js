const { Router } = require('express');
const controller = require('../controllers/convertController');
const validate = require('../middlewares/validate');
const { uploadExcelFiles } = require('../middlewares/upload');
const { uploadLimiter } = require('../middlewares/security');
const { statusParams, downloadParams } = require('../validators/convertSchemas');

const router = Router();

// Thứ tự: rate limit trước multer để request bị chặn không kịp ghi file xuống đĩa.
router.post('/upload', uploadLimiter, uploadExcelFiles, controller.upload);

router.get('/status/:requestId', validate({ params: statusParams }), controller.status);

router.get('/download-zip/:name', validate({ params: downloadParams }), controller.download);

module.exports = router;
