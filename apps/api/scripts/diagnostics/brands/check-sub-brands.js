const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-sub-brands.ts',
  dist: 'dist/src/scripts/check-sub-brands.js',
});
