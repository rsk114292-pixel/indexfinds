const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/deactivate-empty-brands.ts',
  dist: 'dist/src/scripts/deactivate-empty-brands.js',
});
