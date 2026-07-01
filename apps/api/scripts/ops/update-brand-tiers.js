const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/update-brand-tiers.ts',
  dist: 'dist/src/scripts/update-brand-tiers.js',
});
