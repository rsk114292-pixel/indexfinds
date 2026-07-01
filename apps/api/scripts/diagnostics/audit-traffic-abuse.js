const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/audit-traffic-abuse.ts',
  dist: 'dist/src/scripts/audit-traffic-abuse.js',
});
