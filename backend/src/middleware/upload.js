const multer = require('multer');

const imageSignatures = {
  'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (buffer) => buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP',
  'image/gif': (buffer) => buffer.length >= 6
    && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)),
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    if (!Object.hasOwn(imageSignatures, file.mimetype)) {
      const error = new Error('صيغة الصورة غير مدعومة');
      error.status = 400;
      error.expose = true;
      return callback(error);
    }
    callback(null, true);
  },
});

function validateImageContent(req, _res, next) {
  for (const file of req.files || []) {
    if (!Object.hasOwn(imageSignatures, file.mimetype) || !imageSignatures[file.mimetype](file.buffer)) {
      const error = new Error('محتوى الصورة لا يطابق صيغتها');
      error.status = 400;
      error.expose = true;
      return next(error);
    }
  }
  return next();
}

module.exports = { upload, validateImageContent };
