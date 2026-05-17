import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts', 'pull-git-and-restart-docker.sh');
const bashPath = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';

test('deploy continues without a Firebase service account file', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'snake-deploy-test-'));
  const mockBin = path.join(tempDir, 'bin');
  const logPath = path.join(tempDir, 'commands.log');
  mkdirSync(mockBin);

  try {
    writeMockCommand(mockBin, 'git');
    writeMockCommand(mockBin, 'npm');
    writeMockCommand(mockBin, 'docker');

    const result = spawnSync(
      bashPath,
      [
        '-lc',
        process.platform === 'win32'
          ? 'PATH="$(cygpath -u "$MOCK_BIN"):$PATH"; SCRIPT_POSIX="$(cygpath -u "$SCRIPT_PATH")"; "$SCRIPT_POSIX"'
          : 'PATH="$MOCK_BIN:$PATH"; "$SCRIPT_PATH"',
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          FIREBASE_SERVICE_ACCOUNT_FILE: './missing-firebase-for-deploy-test.json',
          MOCK_BIN: mockBin,
          MOCK_LOG: logPath,
          SCRIPT_PATH: scriptPath,
        },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const commandLog = readFileSync(logPath, 'utf8');
    assert.match(commandLog, /^git pull --ff-only$/m);
    assert.match(commandLog, /^npm ci$/m);
    assert.match(commandLog, /^npm run build$/m);
    assert.match(commandLog, /^docker compose -f docker-compose\.prod\.yml up -d --build --force-recreate$/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

function writeMockCommand(mockBin, name) {
  const commandPath = path.join(mockBin, name);
  writeFileSync(
    commandPath,
    [
      '#!/usr/bin/env bash',
      'printf "%s %s\\n" "$(basename "$0")" "$*" >> "$MOCK_LOG"',
      '',
    ].join('\n'),
  );
  chmodSync(commandPath, 0o755);
}
