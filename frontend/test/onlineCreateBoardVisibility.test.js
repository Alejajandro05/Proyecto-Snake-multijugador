import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('online create form keeps board size internal and does not show its selector', () => {
  const source = readFileSync(new URL('../src/scenes/OnlineMenu.js', import.meta.url), 'utf8');

  assert.match(source, /<input type="hidden" id="online-create-board"/);
  assert.equal(source.includes("renderSelectBlock('Tamaño del tablero'"), false);
});
