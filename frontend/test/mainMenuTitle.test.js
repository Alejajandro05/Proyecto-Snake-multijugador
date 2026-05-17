import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('main menu overlay does not render the duplicated SNAKE CLASH heading', () => {
  const source = readFileSync(new URL('../src/scenes/MainMenu.js', import.meta.url), 'utf8');

  assert.equal(source.includes('<h1 class="display-1 fw-bold text-white mb-5 text-center"'), false);
  assert.equal(source.includes('SNAKE CLASH'), false);
});
