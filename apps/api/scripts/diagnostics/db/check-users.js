const { runScript } = require('../../lib/run-script');

runScript({
  src: 'src/scripts/check-users.ts',
  dist: 'dist/src/scripts/check-users.js',
});
