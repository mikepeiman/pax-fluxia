<script lang="ts">
  interface IconDef {
    viewBox?: string;
    body?: string;
    image?: string;
  }

  interface Props {
    name: string;
    size?: number | string;
    title?: string;
    class?: string;
    strokeWidth?: number;
  }

  const ICONS: Record<string, IconDef> = {
    menu: {
      body: `<path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    settings: {
      body: `<path d="M12 4.2v2.1M12 17.7v2.1M5.3 8l1.8 1M16.9 15l1.8 1M5.3 16l1.8-1M16.9 9l1.8-1" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M8.4 6.5 10 5.6l1.1 1.3a5.5 5.5 0 0 1 1.8 0L14 5.6l1.6.9-.4 1.7c.4.4.7.9.9 1.5l1.6.5v1.8l-1.6.5c-.2.6-.5 1.1-.9 1.5l.4 1.7-1.6.9-1.1-1.3a5.5 5.5 0 0 1-1.8 0L10 18.4l-1.6-.9.4-1.7c-.4-.4-.7-.9-.9-1.5l-1.6-.5v-1.8l1.6-.5c.2-.6.5-1.1.9-1.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="12" cy="12" r="2.2" fill="none" stroke="currentColor" />`,
    },
    tune: {
      body: `<path d="M6 7h12M9 7v10M6 12h12M15 3v14M6 17h12" fill="none" stroke="currentColor" stroke-linecap="round" /><circle cx="9" cy="10.5" r="1.6" fill="currentColor" /><circle cx="15" cy="6.2" r="1.6" fill="currentColor" /><circle cx="13" cy="17" r="1.3" fill="currentColor" />`,
    },
    gem: {
      body: `<path d="M7.2 5.3h9.6l3.1 4.1L12 19 4.1 9.4Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M8.2 5.5 12 19l3.8-13.5M4.4 9.4h15.2M9.2 9.4 12 5.5l2.8 3.9" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "draw-polygon": {
      body: `<path d="M6 16.5 8 6.7l8.6-1.2 2.1 7.4-5.8 5.8Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="8" cy="6.7" r="1.4" fill="none" stroke="currentColor" /><circle cx="16.6" cy="5.5" r="1.4" fill="none" stroke="currentColor" /><circle cx="18.7" cy="12.9" r="1.4" fill="none" stroke="currentColor" /><circle cx="12.9" cy="18.7" r="1.4" fill="none" stroke="currentColor" /><circle cx="6" cy="16.5" r="1.4" fill="none" stroke="currentColor" />`,
    },
    "overlay-legend": {
      body: `<path d="M8.4 6.2h10.2M8.4 12h10.2M8.4 17.8h10.2" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="m4.7 6.1.9.9 1.8-2M4.7 11.9l.9.9 1.8-2M4.7 17.7l.9.9 1.8-2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "quick-access": {
      body: `<path d="M5 5h5v5H5ZM14 5h5v5h-5ZM5 14h5v5H5ZM14 14h5v5h-5Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    stopwatch: {
      body: `<path d="M10 4h4M12 4v2M17.4 7.2l1.3-1.3" fill="none" stroke="currentColor" stroke-linecap="round" /><circle cx="12" cy="13" r="6.5" fill="none" stroke="currentColor" /><path d="M12 9.6V13l2.3 1.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "ranking-star": {
      body: `<path d="M5 18v-5M10 18V8M15 18v-7M4 18h16" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="m18 4.8.8 1.7 1.8.2-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "map-location": {
      body: `<path d="m4.5 6.4 4-1.4 5 1.8 6-1.6v12l-6 1.6-5-1.8-4 1.4Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M8.5 5v12M13.5 6.8v12" fill="none" stroke="currentColor" /><path d="M16.5 8.2c1.6 0 2.8 1.2 2.8 2.7 0 2-2.8 4.6-2.8 4.6s-2.8-2.6-2.8-4.6c0-1.5 1.2-2.7 2.8-2.7Z" fill="none" stroke="currentColor" /><circle cx="16.5" cy="10.9" r=".8" fill="currentColor" />`,
    },
    "map-pin": {
      body: `<path d="M12 4.2c2.7 0 4.8 2.1 4.8 4.7 0 3.5-4.8 9.1-4.8 9.1S7.2 12.4 7.2 8.9c0-2.6 2.1-4.7 4.8-4.7Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="12" cy="9" r="1.7" fill="none" stroke="currentColor" />`,
    },
    "fit-view": {
      body: `<path d="M5.3 9V5.3H9M15 5.3h3.7V9M18.7 15v3.7H15M9 18.7H5.3V15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /><path d="M9.2 9.2 5.6 5.6M14.8 9.2l3.6-3.6M14.8 14.8l3.6 3.6M9.2 14.8l-3.6 3.6" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    focus: {
      body: `<circle cx="12" cy="12" r="5.2" fill="none" stroke="currentColor" /><circle cx="12" cy="12" r="1.7" fill="none" stroke="currentColor" /><path d="M12 3.8v3M12 17.2v3M3.8 12h3M17.2 12h3" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    binoculars: {
      body: `<path d="M6.3 10.2 8 5.8h2.5l.9 4.4M17.7 10.2 16 5.8h-2.5l-.9 4.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /><circle cx="8.2" cy="14.2" r="3.2" fill="none" stroke="currentColor" /><circle cx="15.8" cy="14.2" r="3.2" fill="none" stroke="currentColor" /><path d="M11.4 13.7h1.2" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "paper-plane": {
      body: `<path d="M4.8 12.7 19.2 5.2l-4.7 14.2-3-5.7-6.7-1Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="m11.5 13.7 3.2-3.4" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "circle-nodes": {
      body: `<circle cx="7" cy="7" r="2" fill="none" stroke="currentColor" /><circle cx="17" cy="8" r="2" fill="none" stroke="currentColor" /><circle cx="9" cy="17" r="2" fill="none" stroke="currentColor" /><circle cx="17" cy="17" r="1.6" fill="none" stroke="currentColor" /><path d="M9 7.2 15 7.8M8 9l1 6M11 16.9h4.4M15.7 9.6 10.3 15.4" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    burst: {
      body: `<path d="M12 3.8 13.3 9l4.9-2.2-2.2 4.9 5.2 1.3-5.2 1.3 2.2 4.9-4.9-2.2L12 22.2 10.7 17l-4.9 2.2 2.2-4.9L2.8 13l5.2-1.3-2.2-4.9L10.7 9Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    ban: {
      body: `<circle cx="12" cy="12" r="7.4" fill="none" stroke="currentColor" /><path d="M7 7 17 17" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    route: {
      body: `<circle cx="6" cy="17" r="1.9" fill="none" stroke="currentColor" /><circle cx="18" cy="7" r="1.9" fill="none" stroke="currentColor" /><path d="M7.8 16.2c4.7-1.8 1.7-7.1 6.9-8.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-dasharray="1.5 1.7" /><path d="m15.3 5.4 2.7 1.6-1.6 2.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    flag: {
      body: `<path d="M6.5 20V5.2" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M7 5.5h9.8l-1.5 3.1 1.5 3.1H7Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "building-shield": {
      body: `<path d="M5.5 18.8V8l6.5-3.6L18.5 8v10.8" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M9 18.8v-5.2h6v5.2M8.2 9.5h7.6" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M12 10.8 15.2 12v2.2c0 1.6-1.2 2.8-3.2 3.5-2-.7-3.2-1.9-3.2-3.5V12Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    link: {
      body: `<path d="M9.8 8.1 11 6.9a4 4 0 0 1 5.7 5.7l-1.3 1.3M14.2 15.9 13 17.1a4 4 0 0 1-5.7-5.7l1.3-1.3M9.8 14.2l4.4-4.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    font: {
      body: `<path d="M5 18.5 10.2 5.5h3.6L19 18.5M8 13.5h8M4.5 18.5h4M15.5 18.5h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "border-all": {
      body: `<rect x="5" y="5" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" /><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "arrows-spin": {
      body: `<path d="M7.5 8.6A5.8 5.8 0 0 1 17 9.5l1.1.4M16.5 15.4A5.8 5.8 0 0 1 7 14.5l-1.1-.4" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M18.3 6.8v3.5h-3.5M5.7 17.2v-3.5h3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "arrows-to-circle": {
      body: `<circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" /><path d="M12 3.8v4.2M12 16v4.2M3.8 12h4.2M16 12h4.2M6.2 6.2l3 3M14.8 14.8l3 3M17.8 6.2l-3 3M9.2 14.8l-3 3" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "chart-simple": {
      body: `<path d="M5 19V5M5 19h14" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M8 15v-4M12 15V8M16 15v-6" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "circle-info": {
      body: `<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" /><path d="M12 11.2v4.5M12 8.2h.01" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    leaderboard: {
      body: `<path d="M5 18V9M12 18V6M19 18v-4" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M4 18h16" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "dock-left": {
      body: `<rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" /><path d="M9 7v10" fill="none" stroke="currentColor" /><path d="m11.5 9-3 3 3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "dock-right": {
      body: `<rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" /><path d="M15 7v10" fill="none" stroke="currentColor" /><path d="m12.5 9 3 3-3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "chevron-left": {
      body: `<path d="m14.5 6-5.5 6 5.5 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "chevron-right": {
      body: `<path d="m9.5 6 5.5 6-5.5 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "chevron-up": {
      body: `<path d="m6 14.5 6-5.5 6 5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "chevron-down": {
      body: `<path d="m6 9.5 6 5.5 6-5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    close: {
      body: `<path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    search: {
      body: `<circle cx="10.5" cy="10.5" r="4.7" fill="none" stroke="currentColor" /><path d="m14.2 14.2 4.1 4.1" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    theme: {
      body: `<path d="M12 4c-4.4 0-8 3.1-8 6.8 0 2.4 1.6 4.6 4 5.8 1.2.6 2-.3 2-1.1 0-.5-.2-.9-.2-1.4 0-.9.7-1.7 1.8-1.7h1.8c2.9 0 5.1-1.7 5.1-4.5C18.5 5.6 15.7 4 12 4Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="8" cy="9.2" r="1" fill="currentColor" /><circle cx="11.2" cy="7.4" r="1" fill="currentColor" /><circle cx="14.6" cy="8.6" r="1" fill="currentColor" />`,
    },
    library: {
      body: `<path d="M5.5 6.5h9.5c1 0 1.8.8 1.8 1.8v8.2H7.2c-1 0-1.7-.7-1.7-1.7V6.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M7 6.5V5.7c0-.9.7-1.7 1.7-1.7H18.5v10.8" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    add: {
      body: `<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    export: {
      body: `<path d="M12 4v10M8.5 7.5 12 4l3.5 3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /><path d="M6 14.5v2.8c0 .9.7 1.7 1.7 1.7h8.6c1 0 1.7-.8 1.7-1.7v-2.8" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    import: {
      body: `<path d="M12 18V8M8.5 14.5 12 18l3.5-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /><path d="M6 9.5V6.7C6 5.8 6.7 5 7.7 5h8.6c1 0 1.7.8 1.7 1.7v2.8" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    reset: {
      body: `<path d="M6.4 8.4A6.5 6.5 0 1 1 7 16.6" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M6 4.8v4.6h4.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    players: {
      body: `<circle cx="8.5" cy="9" r="2.3" fill="none" stroke="currentColor" /><circle cx="15.4" cy="8" r="1.9" fill="none" stroke="currentColor" /><path d="M4.8 17c.7-2.4 2.4-3.8 5-3.8 2.6 0 4.3 1.4 5 3.8" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M13.1 13.8c1.8.2 3 .9 3.8 2.4" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    timing: {
      body: `<circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" /><path d="M12 8v4l2.8 1.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    combat: {
      body: `<path d="m7 6 10 10M17 6 7 16" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="m8.4 4.8 2.1 2.1-3.4 3.4-2.1-2.1Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="m16.8 13.2 2.1 2.1-3.4 3.4-2.1-2.1Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    economy: {
      body: `<path d="M12 4 5.5 7.2v4.6c0 3 2.8 5.4 6.5 6.2 3.7-.8 6.5-3.2 6.5-6.2V7.2L12 4Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M9.4 12h5.2M12 9.4v5.2" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    travel: {
      body: `<path d="m5 17 4.5-10.5L19 5l-1.5 4.8L7 19l-2-2Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="m9.5 6.5 4 4" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    conquest: {
      body: `<path d="M6 18V8l6-3 6 3v10" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M9 18v-4h6v4" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    effects: {
      body: `<path d="m12 4 1.6 4.1 4.4.3-3.4 2.7 1.2 4.4L12 13.2 8.2 15.5l1.2-4.4L6 8.4l4.4-.3L12 4Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "map-options": {
      body: `<path d="m4.5 6.2 4-1.4 5 1.8 6-1.6v12l-6 1.6-5-1.8-4 1.4Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M8.5 4.8v12M13.5 6.6v12" fill="none" stroke="currentColor" />`,
    },
    map: {
      body: `<path d="M12 3.8 15 9l5.2 3-5.2 3-3 5.2-3-5.2-5.2-3L9 9Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M12 7.4v9.2M7.4 12h9.2" fill="none" stroke="currentColor" stroke-linecap="round" /><circle cx="12" cy="12" r="2.2" fill="none" stroke="currentColor" />`,
    },
    overlays: {
      body: `<path d="m12 4.5 7 3.7-7 3.7-7-3.7Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="m5 12 7 3.7 7-3.7M5 15.8l7 3.7 7-3.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    history: {
      body: `<path d="M6.4 7.2a7.3 7.3 0 1 1-.5 8" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M5.6 4.5v4.4h4.4M12 8.2v4l3 1.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    view: {
      body: `<path d="M3.8 12s3-5.2 8.2-5.2 8.2 5.2 8.2 5.2-3 5.2-8.2 5.2S3.8 12 3.8 12Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" /><path d="M12 4.5v2.3M12 17.2v2.3" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    orders: {
      body: `<path d="M5.2 17.8 9 6l3.2 6.2 6.6-1.6-11 7.2Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M11.8 12.4 16 16.6" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    formation: {
      body: `<circle cx="12" cy="7" r="2" fill="none" stroke="currentColor" /><circle cx="7.2" cy="16" r="2" fill="none" stroke="currentColor" /><circle cx="16.8" cy="16" r="2" fill="none" stroke="currentColor" /><path d="M11 8.7 8.3 14.2M13 8.7l2.7 5.5M9.2 16h5.6" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "atlas-star": {
      body: `<path d="M12 3.7 13.9 9l5.6 1-4.1 3.8 1 5.5-4.4-2.8-4.4 2.8 1-5.5L4.5 10l5.6-1Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" />`,
    },
    "atlas-compass": {
      body: `<path d="M12 2.9v4.2M12 16.9v4.2M2.9 12h4.2M16.9 12h4.2" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="m12 6.5 2.3 5.5-2.3 5.5L9.7 12Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" opacity="0.45" />`,
    },
    "atlas-grid": {
      body: `<path d="M5 5h5v5H5ZM14 5h5v5h-5ZM5 14h5v5H5ZM14 14h5v5h-5Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M10 7.5h4M10 16.5h4M7.5 10v4M16.5 10v4" fill="none" stroke="currentColor" stroke-linecap="round" opacity="0.7" />`,
    },
    "phase-field": {
      body: `<circle cx="12" cy="12" r="6.8" fill="none" stroke="currentColor" /><path d="M12 2.8v4.1M12 17.1v4.1M2.8 12h4.1M17.1 12h4.1" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "phase-edges": {
      body: `<path d="M5 7h14M7 12h10M9 17h6" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M5 7 7 12 5 17M19 7l-2 5 2 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "ember-lattice": {
      body: `<path d="M7 6h10M5 10h14M7 14h10M9 18h6" fill="none" stroke="currentColor" stroke-linecap="round" /><circle cx="8" cy="6" r="1" fill="currentColor" /><circle cx="16" cy="10" r="1" fill="currentColor" /><circle cx="10" cy="14" r="1" fill="currentColor" />`,
    },
    "frontier-fx": {
      body: `<path d="M7 18 12 6l2 5h5l-8 7 1.5-5Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    topology: {
      body: `<circle cx="7" cy="7" r="1.8" fill="currentColor" /><circle cx="17" cy="7" r="1.8" fill="currentColor" /><circle cx="9" cy="16" r="1.8" fill="currentColor" /><circle cx="16.5" cy="16.5" r="1.5" fill="currentColor" /><path d="M8.5 7h6.8M7.9 8.6l1.8 5.4M15.6 8.4l-5 6.2M10.8 16h4.2" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "territory-styles": {
      body: `<path d="m6 17.5 7.6-11 4.4 3.2-7.6 11H6Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="m14.2 5.6 2.4-3.1 2.5 1.8-2.3 3.1" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "fleet-star": {
      body: `<path d="M12 4.5 14 9l5 .6-3.7 3.1 1.2 4.8L12 14.9 7.5 17.5l1.2-4.8L5 9.6 10 9l2-4.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="18" cy="6" r="1.1" fill="currentColor" />`,
    },
    audio: {
      body: `<path d="M6 9h3.2l4.4-3.7v13.4L9.2 15H6Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M16.5 9.2a4 4 0 0 1 0 5.6M18.6 7.2a6.8 6.8 0 0 1 0 9.6" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    diagnostics: {
      body: `<path d="M4.5 15.5h3.2l1.8-4 2.9 6.5 2.4-5h4.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" opacity="0.6" />`,
    },
    logging: {
      body: `<path d="M7 4.5h8l3 3v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18.5v-12A2 2 0 0 1 7 4.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M9 10h6M9 13h6M9 16h4" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    ai: {
      body: `<rect x="7" y="6" width="10" height="12" rx="2.6" fill="none" stroke="currentColor" /><circle cx="10" cy="11" r="1.2" fill="currentColor" /><circle cx="14" cy="11" r="1.2" fill="currentColor" /><path d="M10 15c1 .7 3 .7 4 0M12 3.5v2.5M5.5 10H7M17 10h1.5" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    camera: {
      body: `<rect x="4.5" y="7" width="15" height="11.5" rx="2.2" fill="none" stroke="currentColor" /><path d="M8 7 9.2 5h5.6L16 7" fill="none" stroke="currentColor" stroke-linejoin="round" /><circle cx="12" cy="12.7" r="3" fill="none" stroke="currentColor" />`,
    },
    keyboard: {
      body: `<rect x="4.2" y="6.2" width="15.6" height="11.6" rx="2.2" fill="none" stroke="currentColor" /><path d="M7 10h1.5M10 10h1.5M13 10h1.5M16 10h1.2M7 13h6.2M14.5 13h2.7" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    chat: {
      body: `<path d="M6 6.5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-6l-4.5 3v-3H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "save-map": {
      body: `<path d="m4.5 6.2 4-1.4 5 1.8 6-1.6v12l-6 1.6-5-1.8-4 1.4Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M12 8v6M9.2 11.2 12 8l2.8 3.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "save-game": {
      body: `<path d="M7 4.5h10l2 2v13h-14v-13l2-2Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M8.5 4.5v4.2h6.2V4.5M12 12v5M9.2 14.7 12 12l2.8 2.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "load-map": {
      body: `<path d="m4.5 6.2 4-1.4 5 1.8 6-1.6v12l-6 1.6-5-1.8-4 1.4Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M12 8v6M9.2 12.8 12 15.5l2.8-2.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "load-game": {
      body: `<path d="M7 4.5h10l2 2v13h-14v-13l2-2Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M8.5 4.5v4.2h6.2V4.5M12 18v-5M9.2 15.3 12 18l2.8-2.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    restart: {
      body: `<path d="M6.6 7.4A7 7 0 1 1 5 12" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="M6.4 4.8v4.6H11" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    quit: {
      body: `<path d="M8 5.5h6v13H8" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M12 12H5M7.5 9.5 5 12l2.5 2.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    ruler: {
      body: `<path d="M5 17.5 17.5 5l1.8 1.8L6.8 19.3Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="m9.2 13.3 1.3 1.3M11.4 11.1l1.3 1.3M13.6 8.9l1.3 1.3" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    measure: {
      body: `<circle cx="6.5" cy="16.5" r="1.5" fill="currentColor" /><circle cx="17.5" cy="7.5" r="1.5" fill="currentColor" /><path d="M8 15.2 16 8.8" fill="none" stroke="currentColor" stroke-linecap="round" /><path d="m10 17 1-2M13 14.5l1-2M16 12l1-2" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    fit: {
      body: `<rect x="5" y="5" width="14" height="14" rx="2.2" fill="none" stroke="currentColor" /><path d="M12 2.8v3.7M12 17.5v3.7M2.8 12h3.7M17.5 12h3.7" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    help: {
      body: `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" /><path d="M9.6 9.2a2.5 2.5 0 1 1 4.5 1.6c-.6.8-1.5 1.2-2.1 2.1-.2.3-.3.7-.3 1.1" fill="none" stroke="currentColor" stroke-linecap="round" /><circle cx="12" cy="16.8" r="1" fill="currentColor" />`,
    },
    more: {
      body: `<circle cx="6.5" cy="12" r="1.35" fill="currentColor" /><circle cx="12" cy="12" r="1.35" fill="currentColor" /><circle cx="17.5" cy="12" r="1.35" fill="currentColor" />`,
    },
    "td-settings": {
      image: "/icons/td-atlas/atlas-024.png",
    },
    "td-overlays": {
      image: "/icons/td-atlas/atlas-019.png",
    },
    "td-view": {
      image: "/icons/td-atlas/atlas-027.png",
    },
    "td-map": {
      image: "/icons/td-atlas/atlas-036.png",
    },
    "td-keyboard": {
      image: "/icons/td-atlas/atlas-032.png",
    },
    "td-speed": {
      image: "/icons/td-atlas/atlas-020.png",
    },
    "td-play": {
      image: "/icons/td-atlas/atlas-018.png",
    },
    "td-pause": {
      image: "/icons/td-atlas/atlas-009.png",
    },
    pause: {
      body: `<path d="M8.5 6v12M15.5 6v12" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "play-1": {
      body: `<path d="M8 6.5 17 12 8 17.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "play-2": {
      body: `<path d="M6.5 6.5 12 12l-5.5 5.5ZM12 6.5 17.5 12 12 17.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "play-4": {
      body: `<path d="M5.5 6.5 9.5 12l-4 5.5ZM10 6.5 14 12l-4 5.5ZM14.5 6.5 18.5 12l-4 5.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    "play-10": {
      body: `<path d="M4.8 6.5 8.2 12l-3.4 5.5M9.2 6.5 12.6 12l-3.4 5.5M13.6 6.5 17 12l-3.4 5.5M18.6 7.2v9.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />`,
    },
    "ship-active": {
      body: `<path d="M12 5 17.5 12 12 19 6.5 12 12 5Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="M12 8v8M9 12h6" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "ship-damaged": {
      body: `<path d="M12 5 17.5 12 12 19 6.5 12 12 5Z" fill="none" stroke="currentColor" stroke-linejoin="round" /><path d="m9 9 6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "active-focus": {
      body: `<path d="M5.5 12h13M12 5.5v13" fill="none" stroke="currentColor" stroke-linecap="round" />`,
    },
    "total-focus": {
      body: `<path d="M7 7h10v10H7Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    grey: {
      body: `<circle cx="12" cy="12" r="5.2" fill="none" stroke="currentColor" />`,
    },
    yellow: {
      body: `<path d="m12 5 5.2 3v6L12 19l-5.2-5V8Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    blue: {
      body: `<path d="m12 5.2 5.6 6.8L12 18.8 6.4 12 12 5.2Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    purple: {
      body: `<path d="M7 7h10v10H7Z" fill="none" stroke="currentColor" stroke-linejoin="round" rx="2" />`,
    },
    red: {
      body: `<path d="M7 7h10v10H7Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    green: {
      body: `<path d="m12 6 5 10H7L12 6Z" fill="none" stroke="currentColor" stroke-linejoin="round" />`,
    },
    portal: {
      body: `<circle cx="12" cy="12" r="5.8" fill="none" stroke="currentColor" /><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" />`,
    },
  };

  let {
    name,
    size = 18,
    title,
    class: className = "",
    strokeWidth = 1.85,
  }: Props = $props();

  const icon = $derived(ICONS[name] ?? ICONS.menu);
  const pixelSize = $derived(typeof size === "number" ? `${size}px` : size);
</script>

<svg
  class={`hud-icon ${className}`.trim()}
  viewBox={icon.viewBox ?? "0 0 24 24"}
  aria-hidden={title ? undefined : "true"}
  aria-label={title}
  style={`--pax-ui-icon-size-local:${pixelSize}; --pax-ui-icon-stroke-local:${strokeWidth};`}>
  {#if icon.image}
    <image href={icon.image} x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet" />
  {:else}
    {@html icon.body ?? ""}
  {/if}
</svg>

<style>
  .hud-icon {
    display: block;
    flex: 0 0 auto;
    width: calc(var(--pax-ui-icon-size-local, var(--pax-ui-icon-size)) * var(--pax-ui-icon-scale, 1));
    height: calc(var(--pax-ui-icon-size-local, var(--pax-ui-icon-size)) * var(--pax-ui-icon-scale, 1));
    color: currentColor;
  }

  .hud-icon :global(path),
  .hud-icon :global(circle),
  .hud-icon :global(rect) {
    stroke-width: var(--pax-ui-icon-stroke-local, var(--pax-ui-icon-stroke));
    vector-effect: non-scaling-stroke;
  }
</style>
