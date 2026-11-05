/**
 * Logger JSON một dòng, để có thể lọc log theo requestId khi truy vết một luồng.
 */
function write(level, message, meta = {}) {
    const entry = { time: new Date().toISOString(), level, message, ...meta };
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') console.error(line);
    else console.log(line);
}

module.exports = {
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
};
