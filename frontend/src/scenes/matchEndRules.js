export function shouldEndStandardMatchByScore(p1, p2, max_score) {
  return (Number(p1?.score) || 0) >= max_score || (Number(p2?.score) || 0) >= max_score;
}

export function shouldEndStandardMatchByLives(p1, p2) {
  return (Number(p1?.lives) || 0) <= 0 || (Number(p2?.lives) || 0) <= 0;
}
