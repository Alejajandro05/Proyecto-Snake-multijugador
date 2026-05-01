import assert from 'node:assert/strict';
import test from 'node:test';

import { onlineOptionCatalogs } from './onlineOptions.js';

test('online catalogs expose the real selectable snake and map ids', () => {
  assert.deepEqual(
    onlineOptionCatalogs.skins.map((skin) => skin.id),
    ['player1', 'player2', 'snake3', 'snake4', 'snake5', 'snake6', 'snake7', 'snake8', 'snake9', 'snake10'],
  );
  assert.deepEqual(
    onlineOptionCatalogs.maps.map((map) => map.id),
    ['arena01', 'arena02', 'arena03', 'arena04', 'arena05', 'arena06'],
  );
});
