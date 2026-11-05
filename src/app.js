const path = require('path');
const express = require('express');
const config = require('./config');
const requestContext = require('./middlewares/requestContext');
const { helmetMiddleware, corsMiddleware, apiLimiter } = require('./middlewares/security');
const convertRoutes = require('./routes/convertRoutes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.security.trustProxy);

// Thứ tự middleware quan trọng:
// 1. requestContext đứng đầu để mọi request (kể cả bị chặn phía sau) đều có reqId và log.
// 2. helmet + cors gắn header bảo mật trước khi bất kỳ response nào được gửi.
// 3. static phục vụ giao diện, không tính vào rate limit của API.
// 4. apiLimiter → json parser → routes.
// 5. notFound và errorHandler luôn ở cuối.
app.use(requestContext);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.static(path.join(config.rootDir, 'public')));
app.use(apiLimiter);
app.use(express.json({ limit: '100kb' }));

app.use(convertRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
