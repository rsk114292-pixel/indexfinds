const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-weidian-data.ts',
  dist: 'dist/src/scripts/check-weidian-data.js',
});
