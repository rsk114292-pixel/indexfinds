const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/debug-batch-items.ts',
  dist: 'dist/src/scripts/debug-batch-items.js',
});
