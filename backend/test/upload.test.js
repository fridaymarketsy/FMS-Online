const test = require('node:test');
const assert = require('node:assert/strict');
const { getCloudinaryPublicId } = require('../src/services/upload.service');
const { validateImageContent } = require('../src/middleware/upload');

test('Cloudinary public IDs are limited to the configured cloud and owner folder', () => {
  const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_CLOUD_NAME = 'market-cloud';

  try {
    assert.equal(
      getCloudinaryPublicId(
        'https://res.cloudinary.com/market-cloud/image/upload/v123/friday-market/ads/user-1/photo.jpg',
        'user-1',
      ),
      'friday-market/ads/user-1/photo',
    );
    assert.equal(
      getCloudinaryPublicId(
        'https://res.cloudinary.com/market-cloud/image/upload/friday-market/ads/user-2/photo.jpg',
        'user-1',
      ),
      null,
    );
    assert.equal(
      getCloudinaryPublicId(
        'https://res.cloudinary.com/other-cloud/image/upload/friday-market/ads/user-1/photo.jpg',
        'user-1',
      ),
      null,
    );
    assert.equal(
      getCloudinaryPublicId('https://project.supabase.co/storage/photo.jpg', 'user-1'),
      null,
    );
  } finally {
    if (originalCloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
  }
});

test('uploaded image content must match its declared image format', () => {
  const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let validationError;
  let nextCalls = 0;

  validateImageContent({
    files: [{ mimetype: 'image/png', buffer: validPng }],
  }, null, (error) => {
    validationError = error;
    nextCalls += 1;
  });
  assert.equal(validationError, undefined);
  assert.equal(nextCalls, 1);

  validateImageContent({
    files: [{ mimetype: 'image/png', buffer: Buffer.from('not an image') }],
  }, null, (error) => {
    validationError = error;
  });
  assert.equal(validationError.status, 400);
  assert.equal(validationError.expose, true);
});
