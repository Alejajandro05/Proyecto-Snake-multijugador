function freezeOptions(options) {
  return Object.freeze(options.map((option) => Object.freeze({ ...option })));
}

export const onlineModes = freezeOptions([
  { id: "classic", label: "Classic" },
  { id: "duel", label: "Duel" },
  { id: "kingOfTheHill", label: "Rey de la colina" },
  { id: "territory", label: "Territory Game" },
]);

export const onlineDifficulties = freezeOptions([
  { id: "easy", label: "Easy" },
  { id: "normal", label: "Medium" },
  { id: "hard", label: "Hard" },
]);

export const onlineMaps = freezeOptions([
  { id: "arena01", label: "Arena 01" },
  { id: "arena02", label: "Arena 02" },
  { id: "arena03", label: "Arena 03" },
  { id: "arena04", label: "Arena 04" },
  { id: "arena05", label: "Arena 05" },
  { id: "arena06", label: "Arena 06" },
]);

export const onlineSkins = freezeOptions([
  { id: "player1", label: "Player 1" },
  { id: "player2", label: "Player 2" },
  { id: "snake3", label: "Snake 3" },
  { id: "snake4", label: "Snake 4" },
  { id: "snake5", label: "Snake 5" },
  { id: "snake6", label: "Snake 6" },
  { id: "snake7", label: "Snake 7" },
  { id: "snake8", label: "Snake 8" },
  { id: "snake9", label: "Snake 9" },
  { id: "snake10", label: "Snake 10" },
]);

export const onlineOptionCatalogs = Object.freeze({
  modes: onlineModes,
  difficulties: onlineDifficulties,
  maps: onlineMaps,
  skins: onlineSkins,
});
