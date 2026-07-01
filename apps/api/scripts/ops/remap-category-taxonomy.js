const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/remap-category-taxonomy.ts',
  dist: 'dist/src/scripts/remap-category-taxonomy.js',
});
