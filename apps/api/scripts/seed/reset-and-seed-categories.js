const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/reset-and-seed-categories.ts',
  dist: 'dist/src/scripts/reset-and-seed-categories.js',
});
