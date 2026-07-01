const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-google-oauth-connectivity.ts',
  dist: 'dist/src/scripts/check-google-oauth-connectivity.js',
});
