const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

function runScript({ src, dist }) {
  const rootDir = path.resolve(__dirname, '..', '..');
  const srcPath = path.resolve(rootDir, src);
  const distPath = dist ? path.resolve(rootDir, dist) : null;
  const extraArgs = process.argv.slice(2);

  let args;

  if (existsSync(srcPath)) {
    args = [
      '-r',
      'ts-node/register',
      '-r',
      'tsconfig-paths/register',
      srcPath,
      ...extraArgs,
    ];
  } else if (distPath && existsSync(distPath)) {
    args = [distPath, ...extraArgs];
  } else {
    const expectedPaths = [srcPath, distPath].filter(Boolean).join(' or ');
    console.error(`Script entrypoint not found: ${expectedPaths}`);
    process.exit(1);
  }

  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

module.exports = { runScript };
