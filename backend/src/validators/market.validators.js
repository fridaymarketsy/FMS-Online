const { httpError } = require('../utils/errors');

function requireFields(body, fields, message = 'جميع الحقول المطلوبة يجب تعبئتها') {
  if (fields.some((field) => typeof body[field] !== 'string' || !body[field].trim())) {
    throw httpError(400, message);
  }
}

function validateRegistration(body) {
  requireFields(body, ['username', 'password', 'fullName', 'phone', 'province', 'approximateLocation']);
  if (body.password.length < 6) throw httpError(400, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
}

function validateAd(body) {
  requireFields(body, ['title', 'description', 'category', 'condition', 'contactPhone']);
  if (body.title.trim().length > 50) throw httpError(400, 'العنوان يجب ألا يتجاوز 50 حرفاً');
  if (!Number.isFinite(Number(body.price)) || Number(body.price) < 0) throw httpError(400, 'السعر غير صالح');
  if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 5) {
    throw httpError(400, 'يجب إرفاق صورة واحدة إلى خمس صور');
  }
}

module.exports = { requireFields, validateRegistration, validateAd };
