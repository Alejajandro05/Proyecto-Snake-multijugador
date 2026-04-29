export interface OnlineOption {
  id: string;
  label: string;
}

function freezeOptions(options: OnlineOption[]): ReadonlyArray<Readonly<OnlineOption>> {
  return Object.freeze(options.map((option) => Object.freeze({ ...option })));
}

export const onlineModes = freezeOptions([
  { id: "classic", label: "Classic" },
  { id: "duel", label: "Duel" },
]);

export const onlineMaps = freezeOptions([
  { id: "classic", label: "Classic" },
  { id: "canyon", label: "Canyon" },
]);

export const onlineSkins = freezeOptions([
  { id: "skin-1", label: "Skin 1" },
  { id: "skin-2", label: "Skin 2" },
]);

export const onlineOptionCatalogs = Object.freeze({
  modes: onlineModes,
  maps: onlineMaps,
  skins: onlineSkins,
});
