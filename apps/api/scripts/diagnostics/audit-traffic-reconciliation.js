const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/audit-traffic-reconciliation.ts',
  dist: 'dist/src/scripts/audit-traffic-reconciliation.js',
});
