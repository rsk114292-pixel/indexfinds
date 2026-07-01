const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/test-referral-conversion.ts',
  dist: 'dist/src/scripts/test-referral-conversion.js',
});
