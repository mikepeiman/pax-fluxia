// Active app-wide icon collection. The whole app draws icons from ONE of these
// sets; the user switches it live in Appearance settings.
export type IconSet = "lucide" | "phosphor" | "tabler";

export const ICON_SETS: ReadonlyArray<{ id: IconSet; label: string }> = [
  { id: "lucide", label: "Lucide" },
  { id: "phosphor", label: "Phosphor" },
  { id: "tabler", label: "Tabler" },
];

const STORAGE_KEY = "pax-icon-set";
const DEFAULT_SET: IconSet = "lucide";

function isIconSet(v: unknown): v is IconSet {
  return v === "lucide" || v === "phosphor" || v === "tabler";
}

function loadIconSet(): IconSet {
  if (typeof localStorage === "undefined") return DEFAULT_SET;
  const v = localStorage.getItem(STORAGE_KEY);
  return isIconSet(v) ? v : DEFAULT_SET;
}

export const iconSetState = $state<{ current: IconSet }>({
  current: loadIconSet(),
});

export function setIconSet(set: IconSet): void {
  iconSetState.current = set;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, set);
  }
}
