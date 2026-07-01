const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/repair-brand-hierarchy.ts',
  dist: 'dist/src/scripts/repair-brand-hierarchy.js',
});
