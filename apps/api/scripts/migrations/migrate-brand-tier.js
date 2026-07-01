const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/migrate-brand-tier.ts',
  dist: 'dist/src/scripts/migrate-brand-tier.js',
});
