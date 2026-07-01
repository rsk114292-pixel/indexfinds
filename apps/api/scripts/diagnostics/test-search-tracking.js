const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/test-search-tracking.ts',
  dist: 'dist/src/scripts/test-search-tracking.js',
});
