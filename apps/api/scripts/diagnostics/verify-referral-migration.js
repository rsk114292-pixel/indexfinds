const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/verify-referral-migration.ts',
  dist: 'dist/src/scripts/verify-referral-migration.js',
});
