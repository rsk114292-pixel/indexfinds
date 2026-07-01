const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/run-referral-migration.ts',
  dist: 'dist/src/scripts/run-referral-migration.js',
});
