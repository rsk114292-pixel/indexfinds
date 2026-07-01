const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/preview-bulk-brand-merge.ts',
  dist: 'dist/src/scripts/preview-bulk-brand-merge.js',
});
