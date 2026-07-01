const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/debug-login.ts',
  dist: 'dist/src/scripts/debug-login.js',
});
