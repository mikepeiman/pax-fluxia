/**
 * Pax Fluxia icon registry.
 * 24×24 viewBox, stroke-based (1.6px), round caps/joins.
 * Each entry is one or more SVG path/shape fragments.
 */
export const ICON_PATHS: Record<string, string> = {
  // --- navigation / system ---
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.84 1.84M7.34 16.66 5.5 18.5M18.5 18.5l-1.84-1.84M7.34 7.34 5.5 5.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/>',
  star: '<path d="m12 3 2.47 5.6 6.03.6-4.55 4.1 1.3 5.95L12 16.1l-5.25 3.15 1.3-5.95L3.5 9.2l6.03-.6L12 3Z"/>',
  network:
    '<circle cx="5.5" cy="12" r="2.2"/><circle cx="18.5" cy="5.5" r="2.2"/><circle cx="18.5" cy="18.5" r="2.2"/><path d="m7.6 10.9 8.8-4.3M7.6 13.1l8.8 4.3"/>',
  users:
    '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.7c2 .7 3.3 2.4 3.3 4.8"/>',
  bookmark: '<path d="M7 3.5h10V21l-5-3.4L7 21V3.5Z"/>',
  target: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 2v3.4M12 18.6V22M22 12h-3.4M5.4 12H2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.3.7c0 1.8-2.7 2.2-2.7 4"/><circle cx="12" cy="17.2" r="0.4" fill="currentColor"/>',
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  locate:
    '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 2.5V6M12 18v3.5M21.5 12H18M6 12H2.5"/>',
  expand: '<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>',

  // --- chrome / actions ---
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r="0.4" fill="currentColor"/>',
  alert: '<path d="M12 3.5 22 20H2L12 3.5Z"/><path d="M12 9.5v5"/><circle cx="12" cy="17" r="0.4" fill="currentColor"/>',
  message: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  treaty: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
  trophy:
    '<path d="M8 4h8v6a4 4 0 0 1-8 0V4ZM8 5.5H4.5a3.5 3.5 0 0 0 3.6 3.6M16 5.5h3.5a3.5 3.5 0 0 1-3.6 3.6M12 14v3.5M8.5 20.5h7M12 17.5v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5V12l3.5 2.5"/>',
  'chevron-up': '<path d="m6 14.5 6-6 6 6"/>',
  'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
  'chevron-left': '<path d="m14.5 6-6 6 6 6"/>',
  'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  play: '<path d="M7.5 5 18 12 7.5 19V5Z"/>',

  // --- game modes ---
  fleet: '<path d="M12 2.8 6 19l6-3.4 6 3.4-6-16.2Z"/>',
  order: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/><path d="M12 1.8v2.9M12 19.3v2.9M22.2 12h-2.9M4.7 12H1.8"/>',
  build:
    '<path d="m14.2 5.2 4.6 4.6M9.6 6.6l7.8 7.8M13.5 2.8c2.4-.8 5.2-.1 7 1.7.9.9 1.4 2 1.7 3.1l-3.4 1.6M10.3 7.3 3 14.6 9.4 21l7.3-7.3"/>',
  research:
    '<path d="M9.5 3h5M10.5 3v6.2L4.8 18.6A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.4L13.5 9.2V3M7.5 15h9"/>',
  diplomacy:
    '<path d="M12 21c-4.5-1.5-7.5-4-8.5-9M12 21c4.5-1.5 7.5-4 8.5-9M5.5 14.5 3 13M6.8 17.2 4.5 16.7M9 19.4l-1.8 1M18.5 14.5 21 13M17.2 17.2l2.3-.5M15 19.4l1.8 1M12 3.5v6"/>',
  intel: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',

  // --- orders / star stats ---
  move: '<path d="M5 19 17.5 6.5M11 5.5h7.5V13"/>',
  develop: '<path d="M4 20h16M6.5 20V11h3.5v9M14 20V5.5h3.5V20M10 8 12 4l2 4"/>',
  garrison: '<path d="M12 3 4.5 6v5c0 5 3.2 8.4 7.5 10 4.3-1.6 7.5-5 7.5-10V6L12 3Z"/><path d="M12 8v6"/>',
  fortify:
    '<path d="M5 21V9.5L8 11V8l4-2.5L16 8v3l3-1.5V21M5 21h14M9.5 21v-4h5v4"/>',
  hold: '<circle cx="12" cy="12" r="8"/><path d="M9 9.5v5M15 9.5v5"/>',
  shield: '<path d="M12 3 4.5 6v5c0 5 3.2 8.4 7.5 10 4.3-1.6 7.5-5 7.5-10V6L12 3Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7M18.7 18.7 17 17M7 7 5.3 5.3"/>',
  planet: '<circle cx="12" cy="12" r="5.5"/><path d="M3.4 14.8c2.3 1.3 6 1 9.8-.7 3.8-1.7 6.6-4.2 7.4-6.7"/>',
  flux: '<path d="M13.5 2.5 5 13.5h5.5L10 21.5l8.5-11h-5.5l.5-8Z"/>',
  influence: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" stroke-dasharray="2.5 3.5"/>',
};

export type IconName = keyof typeof ICON_PATHS;
