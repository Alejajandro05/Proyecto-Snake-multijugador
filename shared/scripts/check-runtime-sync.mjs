import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sharedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(path.join(tmpdir(), 'snake-shared-runtime-'));
const tscBin = path.join(sharedRoot, 'node_modules', 'typescript', 'bin', 'tsc');

const runtimeFiles = [
  'GameConfig.js',
  'SnakeEngine.js',
  'types.js',
  'index.js',
];

try {
  execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.runtime.json', '--outDir', tempDir], {
    cwd: sharedRoot,
    stdio: 'inherit',
  });

  const outOfSync = runtimeFiles.filter((file) => {
    const expected = readFileSync(path.join(tempDir, file), 'utf8').replace(/\r\n/g, '\n');
    const actual = readFileSync(path.join(sharedRoot, 'src', 'domain', file), 'utf8').replace(/\r\n/g, '\n');
    return actual !== expected;
  });

  if (outOfSync.length > 0) {
    console.error(`Shared runtime JS is out of sync: ${outOfSync.join(', ')}`);
    console.error('Run: npm run build:runtime --prefix shared');
    process.exit(1);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
