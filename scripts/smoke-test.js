const provider = (process.env.DB_PROVIDER || 'sqlite').toLowerCase();

if (provider === 'supabase') {
  require('./smoke-test-supabase');
} else if (provider === 'sqlite') {
  require('./smoke-test-sqlite');
} else {
  throw new Error(`Unsupported DB_PROVIDER for smoke test: ${provider}`);
}
