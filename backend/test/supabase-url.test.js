const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSupabaseUrl } = require('../src/config/supabase-url');

test('normalizes a Supabase REST endpoint to its project base URL', () => {
  assert.equal(
    normalizeSupabaseUrl('https://project.example/rest/v1/'),
    'https://project.example',
  );
});

test('preserves a project base URL and any custom reverse-proxy path', () => {
  assert.equal(
    normalizeSupabaseUrl('https://project.example'),
    'https://project.example',
  );
  assert.equal(
    normalizeSupabaseUrl('https://project.example/supabase/rest/v1/'),
    'https://project.example/supabase',
  );
});
