export function shouldEndStandardMatchByScore() {
  return false;
}

export function shouldEndStandardMatchByLives(p1, p2) {
  return (Number(p1?.lives) || 0) <= 0 || (Number(p2?.lives) || 0) <= 0;
}
