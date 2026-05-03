export function getGameOverPlayerNames(data = {}) {
  return {
    p1Name: String(data.p1Name || 'Jugador 1'),
    p2Name: String(data.p2Name || 'Jugador 2'),
  };
}

export function getGameOverWinnerName(data = {}) {
  const { p1Name, p2Name } = getGameOverPlayerNames(data);

  if (data.winner === 'EMPATE') return 'EMPATE';
  if (data.winner === 'J1') return p1Name;
  if (data.winner === 'J2') return p2Name;
  return p2Name;
}
