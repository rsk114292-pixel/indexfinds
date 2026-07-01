const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-brand-tier.ts',
  dist: 'dist/src/scripts/check-brand-tier.js',
});
