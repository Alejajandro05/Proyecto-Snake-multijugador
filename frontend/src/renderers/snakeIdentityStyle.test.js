import test from 'node:test';
import assert from 'node:assert/strict';

import { getSnakeIdentityStyle } from './snakeIdentityStyle.js';

test('gives the snake head a stronger identity marker than body segments', () => {
  const headStyle = getSnakeIdentityStyle(32, true);
  const bodyStyle = getSnakeIdentityStyle(32, false);

  assert.equal(headStyle.alpha > bodyStyle.alpha, true);
  assert.equal(headStyle.padding < bodyStyle.padding, true);
  assert.equal(headStyle.radius >= bodyStyle.radius, true);
});

test('keeps marker dimensions usable even on tiny cells', () => {
  const style = getSnakeIdentityStyle(8, false);

  assert.equal(style.padding >= 2, true);
  assert.equal(style.radius >= 4, true);
  assert.equal(style.alpha > 0, true);
});
