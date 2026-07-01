const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-prices.ts',
  dist: 'dist/src/scripts/check-prices.js',
});
