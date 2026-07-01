const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/execute-bulk-brand-merge.ts',
  dist: 'dist/src/scripts/execute-bulk-brand-merge.js',
});
