const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-recent-products.ts',
  dist: 'dist/src/scripts/check-recent-products.js',
});
