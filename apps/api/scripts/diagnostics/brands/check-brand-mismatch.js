const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-brand-mismatch.ts',
  dist: 'dist/src/scripts/check-brand-mismatch.js',
});
