import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MAP_ID,
  DEFAULT_SNAKE_SKIN_ID,
  getMapAsset,
  getSnakeAsset,
  mapAssets,
  snakeAssets,
} from './gameAssetRegistry.js';

test('registers real snake skins from the workspace assets', () => {
  const ids = snakeAssets.map((asset) => asset.id);

  assert.deepEqual(ids, [
    'player1',
    'player2',
    'snake3',
    'snake4',
    'snake5',
    'snake6',
    'snake7',
    'snake8',
    'snake9',
    'snake10',
  ]);
  assert.equal(DEFAULT_SNAKE_SKIN_ID, 'player1');
  assert.equal(getSnakeAsset('snake3').parts.turn.path, 'snakesSets/snake3/snake032.png');
  assert.equal(getSnakeAsset('snake3').parts.body.path, 'snakesSets/snake3/snake033.png');
  assert.equal(getSnakeAsset('snake3').parts.head.path, 'snakesSets/snake3/snake034.png');
  assert.equal(getSnakeAsset('snake3').parts.tail.path, 'snakesSets/snake3/snake047.png');
  assert.equal(getSnakeAsset('snake3').preview.path, 'snakesSets/snake3/snake034.png');
  assert.equal(getSnakeAsset('snake3').tailConnectionDirection, 'right');
  assert.equal(getSnakeAsset('player1').tailConnectionDirection, 'left');
  assert.equal(getSnakeAsset('snake10').parts.body.path, 'snakesSets/snake10/snake336.png');
  assert.equal(getSnakeAsset('snake10').parts.head.path, 'snakesSets/snake10/snake338.png');
  assert.equal(getSnakeAsset('snake10').parts.turn.path, 'snakesSets/snake10/snake340.png');
  assert.equal(getSnakeAsset('snake10').parts.tail.path, 'snakesSets/snake10/snake342.png');
  assert.equal(getSnakeAsset('skin-1').id, 'player1');
});

test('registers the available arena maps with preloadable floor tiles', () => {
  const ids = mapAssets.map((asset) => asset.id);

  assert.deepEqual(ids, ['arena01', 'arena02', 'arena03', 'arena04', 'arena05', 'arena06']);
  assert.equal(DEFAULT_MAP_ID, 'arena01');
  assert.equal(getMapAsset('arena01').floor.path, 'map/arena01/tile005.png');
  assert.equal(getMapAsset('arena06').floor.path, 'map/arena06/tile085.png');
  assert.equal(getMapAsset('classic').id, 'arena01');
});
