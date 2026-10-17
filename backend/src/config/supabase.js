const { createClient } = require('@supabase/supabase-js');
const { normalizeSupabaseUrl } = require('./supabase-url');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabaseUrl = normalizeSupabaseUrl(SUPABASE_URL);
const authOptions = { auth: { autoRefreshToken: false, persistSession: false } };
const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, authOptions);

function createIsolatedAuthClient() {
  return createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, authOptions);
}

module.exports = { supabase, createIsolatedAuthClient };
