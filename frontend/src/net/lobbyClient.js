import { Client } from '@colyseus/sdk';

function normalizeHttpUrlToWebSocket(url) {
  const value = String(url ?? '').trim();
  if (!value) return '';
  if (value.startsWith('https://')) return `wss://${value.slice('https://'.length)}`;
  if (value.startsWith('http://')) return `ws://${value.slice('http://'.length)}`;
  return value;
}

function getPublicWsPathSuffix() {
  const raw = import.meta.env.VITE_WS_PATH;
  if (raw === '') return '';
  if (raw === undefined || raw === null) return '/ws';

  const value = String(raw).trim();
  if (!value) return '/ws';
  return value.startsWith('/') ? value : `/${value}`;
}

export function getColyseusServerUrl() {
  const explicitWs = String(import.meta.env.VITE_COLYSEUS_URL ?? '').trim();
  if (explicitWs) return explicitWs;

  const fromHttpEnv = normalizeHttpUrlToWebSocket(import.meta.env.VITE_SERVER_URL ?? '');
  if (fromHttpEnv) return fromHttpEnv;

  if (import.meta.env.DEV) {
    return 'ws://localhost:2567';
  }

  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}${getPublicWsPathSuffix()}`;
}

export function getServerHttpUrl() {
  const explicitHttp = String(import.meta.env.VITE_SERVER_URL ?? '').trim();
  if (explicitHttp) return explicitHttp.replace(/\/$/, '');
  return window.location.origin;
}

export function createLobbyClient() {
  const client = new Client(getColyseusServerUrl());

  return {
    createLobby(options) {
      return client.create('lobby_room', options);
    },
    joinLobbyById(roomId, options) {
      return client.joinById(roomId, options);
    },
    async fetchPublicLobbies() {
      const response = await fetch(`${getServerHttpUrl()}/api/lobbies/list/${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('No se pudo cargar la lista de salas.');
      const data = await response.json();
      return data.lobbies ?? [];
    },
    async resolveInviteCode(code) {
      const response = await fetch(`${getServerHttpUrl()}/api/lobbies/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('No se pudo resolver el codigo.');
      const data = await response.json();
      return data.lobbyId || '';
    },
    joinLobby(options) {
      return client.joinOrCreate('lobby_room', options);
    },
    joinSnakeRoomById(roomId, options) {
      return client.joinById(roomId, options);
    },
    joinOrCreateSnakeRoom(options) {
      return client.joinOrCreate('snake_room', options);
    },
  };
}
