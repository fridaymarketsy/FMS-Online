const test = require('node:test');
const assert = require('node:assert/strict');
const { logError, redactSensitiveText } = require('../src/utils/errors');

test('diagnostic text redacts credentials and personal identifiers', () => {
  const text = 'Bearer abc.def.ghi user@example.com password=secret username=(seller) phone=123456789';
  const redacted = redactSensitiveText(text);

  assert.doesNotMatch(redacted, /abc\.def\.ghi|user@example\.com|secret|seller|123456789/);
  assert.match(redacted, /\[REDACTED\]/);
});

test('diagnostic text redacts environment-style Cloudinary secret assignments', () => {
  const redacted = redactSensitiveText('CLOUDINARY_API_SECRET=cloudinary-secret-value');

  assert.doesNotMatch(redacted, /cloudinary-secret-value/);
  assert.match(redacted, /CLOUDINARY_API_SECRET=\[REDACTED\]/);
});

test('error logs include safe Supabase diagnostic fields without stack traces in production', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  let output;

  process.env.NODE_ENV = 'production';
  console.error = (message) => { output = message; };

  try {
    logError('GET /api/ads', {
      cause: {
        message: 'Request failed for user@example.com',
        name: 'PostgrestError',
        code: 'PGRST204',
        details: 'Could not find the seller_id column',
        hint: 'Check the schema cache',
        stack: 'sensitive stack',
      },
    });
  } finally {
    console.error = originalConsoleError;
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
  }

  const diagnostic = JSON.parse(output);
  assert.deepEqual(diagnostic, {
    operation: 'GET /api/ads',
    message: 'Request failed for [REDACTED_EMAIL]',
    name: 'PostgrestError',
    code: 'PGRST204',
    details: 'Could not find the seller_id column',
    hint: 'Check the schema cache',
  });
  assert.doesNotMatch(output, /sensitive stack|user@example\.com/);
});
