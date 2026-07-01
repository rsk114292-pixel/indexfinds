const { runScript } = require('../lib/run-script');

runScript({
  src: 'src/scripts/generate-embeddings.ts',
  dist: 'dist/src/scripts/generate-embeddings.js',
});
