const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-db-ready.ts',
  dist: 'dist/src/scripts/check-db-ready.js',
});
