const { z } = require('zod');

const statusParams = z.object({
    requestId: z.uuid({ message: 'requestId phải là UUID hợp lệ.' }),
});

const ZIP_NAME_PATTERN = /^Ket_Qua_Convert_([0-9a-f-]{36})\.zip$/i;

const downloadParams = z.object({
    name: z
        .string()
        .regex(ZIP_NAME_PATTERN, { message: 'Tên file ZIP không hợp lệ.' })
        .transform((name) => ({ zipName: name, requestId: name.match(ZIP_NAME_PATTERN)[1] })),
});

module.exports = { statusParams, downloadParams };
