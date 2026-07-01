const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/audit-category-taxonomy.ts',
  dist: 'dist/src/scripts/audit-category-taxonomy.js',
});
