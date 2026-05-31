require('dotenv').config();

const providerName = (process.env.DB_PROVIDER || 'sqlite').toLowerCase();

if (!['sqlite', 'supabase'].includes(providerName)) {
  throw new Error(`Unsupported DB_PROVIDER: ${providerName}`);
}

const repository = providerName === 'supabase'
  ? require('./repositories/supabase')
  : require('./repositories/sqlite');

if (process.argv.includes('--init')) {
  repository.initDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  ...repository,
  provider: providerName
};
