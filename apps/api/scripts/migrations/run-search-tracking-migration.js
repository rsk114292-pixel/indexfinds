const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/run-search-tracking-migration.ts',
  dist: 'dist/src/scripts/run-search-tracking-migration.js',
});
