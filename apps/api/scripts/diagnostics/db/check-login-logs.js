const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-login-logs.ts',
  dist: 'dist/src/scripts/check-login-logs.js',
});
