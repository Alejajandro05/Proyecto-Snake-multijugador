export function getSnakeIdentityStyle(cellSize, isHead) {
  const safeCellSize = Math.max(12, Number(cellSize) || 12);

  return {
    padding: isHead ? Math.max(2, Math.floor(safeCellSize * 0.02)) : Math.max(3, Math.floor(safeCellSize * 0.06)),
    alpha: isHead ? 0.52 : 0.3,
    radius: isHead ? Math.max(5, Math.floor(safeCellSize * 0.28)) : Math.max(4, Math.floor(safeCellSize * 0.22)),
  };
}
