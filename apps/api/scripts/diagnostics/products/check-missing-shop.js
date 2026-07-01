const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-missing-shop.ts',
  dist: 'dist/src/scripts/check-missing-shop.js',
});
