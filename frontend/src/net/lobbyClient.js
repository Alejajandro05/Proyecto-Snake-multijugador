import { Client } from '@colyseus/sdk';

let activeLobbyRoom = null;

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

function getSameOriginWebSocketUrl(location) {
  const { protocol, host } = location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}`;
}

export function resolveColyseusServerUrl(env, location) {
  const explicitWs = String(env.VITE_COLYSEUS_URL ?? '').trim();
  if (explicitWs) return explicitWs;

  const fromHttpEnv = normalizeHttpUrlToWebSocket(env.VITE_SERVER_URL ?? '');
  if (fromHttpEnv) return fromHttpEnv;

  if (env.DEV) {
    const proxyTarget = String(env.VITE_API_PROXY_TARGET ?? '').trim();
    return proxyTarget ? getSameOriginWebSocketUrl(location) : 'ws://localhost:2567';
  }

  return `${getSameOriginWebSocketUrl(location)}${getPublicWsPathSuffix()}`;
}

export function resolveServerHttpUrl(env, location) {
  const explicitHttp = String(env.VITE_SERVER_URL ?? '').trim();
  if (explicitHttp) return explicitHttp.replace(/\/$/, '');
  return location.origin;
}

export function getColyseusServerUrl() {
  return resolveColyseusServerUrl(import.meta.env, window.location);
}

export function getServerHttpUrl() {
  return resolveServerHttpUrl(import.meta.env, window.location);
}

export function getActiveLobbyRoom() {
  return activeLobbyRoom;
}

export function setActiveLobbyRoom(room) {
  activeLobbyRoom = room ?? null;
}

export async function leaveActiveLobbyRoom() {
  const room = activeLobbyRoom;
  activeLobbyRoom = null;
  if (!room) return;

  try {
    await room.leave();
  } catch {
    // ignore
  }
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
      const response = await fetch(`${getServerHttpUrl()}/api/lobbies`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('No se pudo cargar la lista de salas.');
      const data = await response.json();
      return data.lobbies ?? [];
    },
    async resolveInviteCode(code) {
      const response = await fetch(`${getServerHttpUrl()}/api/lobbies/resolve?code=${encodeURIComponent(code)}`, {
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
