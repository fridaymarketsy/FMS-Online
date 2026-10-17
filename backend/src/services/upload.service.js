const { getCloudinary } = require('../config/cloudinary');

function getCloudinaryPublicId(url, userId) {
  if (typeof url !== 'string' || !userId) return null;

  const match = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.*)$/.exec(url);
  if (!match || match[1] !== process.env.CLOUDINARY_CLOUD_NAME) return null;

  const segments = match[2].split('/');
  let index = /^v\d+$/.test(segments[0]) ? 1 : 0;
  if (
    segments[index] !== 'friday-market'
    || segments[index + 1] !== 'ads'
    || segments[index + 2] !== userId
    || !segments[index + 3]
  ) return null;

  const assetPath = segments.slice(index + 3);
  assetPath[assetPath.length - 1] = assetPath[assetPath.length - 1].replace(/\.[^.]+$/, '');
  return [...segments.slice(index, index + 3), ...assetPath].join('/');
}

function uploadImage(file, userId) {
  const cloudinary = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `friday-market/ads/${userId}`,
      resource_type: 'image',
    }, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url) return reject(new Error('تعذر رفع الصورة'));
      resolve(result.secure_url);
    });
    stream.end(file.buffer);
  });
}

async function deleteImages(urls, userId) {
  const publicIds = urls
    .map((url) => getCloudinaryPublicId(url, userId))
    .filter(Boolean);
  if (!publicIds.length) return;

  const cloudinary = getCloudinary();
  await Promise.all(publicIds.map(async (publicId) => {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`تعذر حذف صورة Cloudinary (${result.result || 'unknown result'})`);
    }
  }));
}

async function uploadImages(files, userId) {
  const results = await Promise.allSettled(files.map((file) => uploadImage(file, userId)));
  const urls = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const failures = results.filter((result) => result.status === 'rejected');

  if (failures.length) {
    await deleteImages(urls, userId);
    throw failures[0].reason;
  }

  return urls;
}

module.exports = { uploadImages, deleteImages, getCloudinaryPublicId };
