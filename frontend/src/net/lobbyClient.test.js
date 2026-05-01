import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveColyseusServerUrl,
  resolveServerHttpUrl,
} from './lobbyClient.js';

const localViteLocation = Object.freeze({
  protocol: 'http:',
  host: 'localhost:5173',
  origin: 'http://localhost:5173',
});

test('uses the same-origin Vite proxy for Colyseus when a dev proxy target is configured', () => {
  const url = resolveColyseusServerUrl({
    DEV: true,
    VITE_API_PROXY_TARGET: 'http://backend:2567',
  }, localViteLocation);

  assert.equal(url, 'ws://localhost:5173');
});

test('keeps the direct local Colyseus URL for normal local development', () => {
  const url = resolveColyseusServerUrl({
    DEV: true,
  }, localViteLocation);

  assert.equal(url, 'ws://localhost:2567');
});

test('prefers explicit server URLs over dev proxy inference', () => {
  const wsUrl = resolveColyseusServerUrl({
    DEV: true,
    VITE_API_PROXY_TARGET: 'http://backend:2567',
    VITE_COLYSEUS_URL: 'wss://example.com/ws',
  }, localViteLocation);

  const httpUrl = resolveColyseusServerUrl({
    DEV: true,
    VITE_API_PROXY_TARGET: 'http://backend:2567',
    VITE_SERVER_URL: 'https://example.com/ws',
  }, localViteLocation);

  assert.equal(wsUrl, 'wss://example.com/ws');
  assert.equal(httpUrl, 'wss://example.com/ws');
});

test('uses same-origin HTTP for lobby API requests unless VITE_SERVER_URL is explicit', () => {
  assert.equal(resolveServerHttpUrl({}, localViteLocation), 'http://localhost:5173');
  assert.equal(resolveServerHttpUrl({
    VITE_SERVER_URL: 'https://example.com/',
  }, localViteLocation), 'https://example.com');
});
