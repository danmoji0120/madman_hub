const { main } = require('./build-mercenary-master');

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
