const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAd, validateRegistration } = require('../src/validators/market.validators');

test('registration requires account fields and a six-character password', () => {
  assert.throws(() => validateRegistration({ username: 'seller' }), { status: 400 });
  assert.throws(() => validateRegistration({
    username: 'seller',
    password: '12345',
    fullName: 'Seller',
    phone: '0900000000',
    province: 'دمشق',
    approximateLocation: 'المزة',
  }), { status: 400 });
  assert.doesNotThrow(() => validateRegistration({
    username: 'seller',
    password: '123456',
    fullName: 'Seller',
    phone: '0900000000',
    province: 'دمشق',
    approximateLocation: 'المزة',
  }));
});

test('ads require valid text, non-negative price, and one to five images', () => {
  const valid = {
    title: 'إعلان',
    description: 'وصف',
    category: 'أخرى',
    condition: 'جديد',
    contactPhone: '0900000000',
    price: 0,
    images: ['https://images.example/ad.jpg'],
  };
  assert.doesNotThrow(() => validateAd(valid));
  assert.throws(() => validateAd({ ...valid, title: 'ع'.repeat(51) }), { status: 400 });
  assert.throws(() => validateAd({ ...valid, price: -1 }), { status: 400 });
  assert.throws(() => validateAd({ ...valid, images: [] }), { status: 400 });
  assert.throws(() => validateAd({ ...valid, images: Array(6).fill('image') }), { status: 400 });
});
