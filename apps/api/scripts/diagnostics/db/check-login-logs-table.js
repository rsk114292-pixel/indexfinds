const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-login-logs-table.ts',
  dist: 'dist/src/scripts/check-login-logs-table.js',
});
