const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-tables.ts',
  dist: 'dist/src/scripts/check-tables.js',
});
