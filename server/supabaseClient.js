const { createClient } = require('@supabase/supabase-js');

let supabase;

function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when DB_PROVIDER=supabase');
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function getSupabaseAdminClient() {
  if (!supabase) supabase = createSupabaseAdminClient();
  return supabase;
}

module.exports = {
  createSupabaseAdminClient,
  getSupabaseAdminClient
};
