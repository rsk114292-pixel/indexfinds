const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-sku-data.ts',
  dist: 'dist/src/scripts/check-sku-data.js',
});
