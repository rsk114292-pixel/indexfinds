const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/backfill-category-cover-images.ts',
  dist: 'dist/src/scripts/backfill-category-cover-images.js',
});
