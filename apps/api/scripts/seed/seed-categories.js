const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/seed-categories.ts',
  dist: 'dist/src/scripts/seed-categories.js',
});
