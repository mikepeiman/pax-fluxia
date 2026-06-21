// Single source of truth for Pax Fluxia marketing-site copy & structured data.
// Home sections and the standalone pages (game / devlog / community / studio /
// press) all read from here, so content is edited in one place. Plain prose
// CTAs and headlines stay inline in their components; reusable lists live here.

export const SITE = {
  name: "Pax Fluxia",
  studio: "Fatherlion Studios",
  dev: "Mike Peiman",
  devHandle: "@mikepeiman",
  tagline: "Command the flow. Conquer the galaxy.",
  blurb:
    "A tick-based real-time strategy game where fleets stream between stars in living rivers of force. Easy to read, deep to master.",
  discord: "https://discord.gg/yQu7X3UXv",
  contactEmail: "hello@paxfluxia.com",
  pressEmail: "press@paxfluxia.com",
  version: "v0.1 · Alpha",
  homageYear: 2007,
  homageTitle: "Pax Galaxia",
  copyrightYear: 2026,
} as const;

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: "The Game", href: "/game" },
  { label: "Devlog", href: "/devlog" },
  { label: "Community", href: "/community" },
  { label: "Studio", href: "/about" },
];

export type Pillar = {
  key: string;
  title: string;
  body: string;
  accent: "cyan" | "magenta" | "gold";
};

export const PILLARS: Pillar[] = [
  {
    key: "flow",
    title: "Flow-Based Combat",
    accent: "cyan",
    body: "Ships don't teleport. Open a flow and fleets stream between stars in a visible river of force — pumping continuously until you redirect it or the lane is cut. The whole battlefield is legible at a glance.",
  },
  {
    key: "topology",
    title: "Topology Is Terrain",
    accent: "magenta",
    body: "No sprawling map to babysit. Stars are nodes; lanes are fixed. The shape of the network is your battlefield — every chokepoint, flank, and slow-strangling siege emerges from the graph itself.",
  },
  {
    key: "tunable",
    title: "Infinitely Tunable",
    accent: "gold",
    body: "Over 100 live parameters, from tick cadence to ship-glow intensity. Sculpt the pace and feel in real time. Classic mode is only the seed — a modding-deep future of shareable rule sets is the plan.",
  },
];

export type Tactic = {
  key: string;
  label: string;
  title: string;
  body: string;
  accent: string; // CSS var or color
  image: string; // /assets art used as the visual
};

export const TACTICS: Tactic[] = [
  {
    key: "visible",
    label: "Visible Strategy",
    title: "Read the war by looking at it",
    body: "Every ship is a dot. Every flow is a river. The thickness of a stream tells you who is winning — no spreadsheets, no nested menus. If you can see the board, you understand the battle.",
    accent: "var(--site-cyan)",
    image: "/assets/pax-fluxia-bg-18.jpg",
  },
  {
    key: "attrition",
    label: "Symmetric Attrition",
    title: "There are no free wins",
    body: "Attacker and defender bleed at the same time, every tick. You spend fleet to break fleet. Every assault has a price — so commit with intent, or don't commit at all.",
    accent: "var(--site-red)",
    image: "/assets/pax-fluxia-bg-19.jpg",
  },
  {
    key: "pinning",
    label: "Pinning",
    title: "Position beats numbers",
    body: "A single attacking ship cuts an enemy star's repair rate by 90%. Pin a stronghold with a token force while your main fleet caves in the weak flank. The map rewards the commander who thinks in fronts.",
    accent: "var(--site-yellow)",
    image: "/assets/pax-fluxia-bg-32.jpg",
  },
  {
    key: "overwhelm",
    label: "Overwhelm",
    title: "Speed folds systems",
    body: "Bring a crushing advantage and the defenders surrender on contact — no combat rolls, no grind. A ten-to-one push takes a system instantly. Tempo is a weapon; wield it before they dig in.",
    accent: "var(--site-magenta)",
    image: "/assets/pax-fluxia-bg-31.jpg",
  },
];

export type StarType = {
  type: string;
  shape: "triangle" | "square" | "pentagon" | "hexagon" | "heptagon" | "circle";
  color: string; // CSS var
  tag: string;
  desc: string;
};

export const STAR_TYPES: StarType[] = [
  {
    type: "Offense",
    shape: "triangle",
    color: "var(--site-green)",
    tag: "×2 attack",
    desc: "Doubles the strength of fleets attacking from here. Forge your spearheads on offense stars.",
  },
  {
    type: "Defense",
    shape: "square",
    color: "var(--site-red)",
    tag: "×2 defense",
    desc: "Doubles combat defense. A fortress lane the enemy breaks against — make them pay to cross.",
  },
  {
    type: "Production",
    shape: "pentagon",
    color: "var(--site-yellow)",
    tag: "×2 build",
    desc: "Builds new ships twice as fast. Your economic engine — protect it or starve your front line.",
  },
  {
    type: "Repair",
    shape: "hexagon",
    color: "var(--site-purple)",
    tag: "×2 repair",
    desc: "Heals losses at double rate. Anchors that shrug off attrition and outlast a siege.",
  },
  {
    type: "Speed",
    shape: "heptagon",
    color: "var(--site-blue)",
    tag: "×2 speed",
    desc: "Moves and transfers fleets faster. Project force across the map before rivals can react.",
  },
  {
    type: "Standard",
    shape: "circle",
    color: "#c3ccdd",
    tag: "balanced",
    desc: "No bonus — just raw position, and whatever you choose to make of it. Most of the galaxy.",
  },
];

export type RoadmapPhase = {
  phase: string;
  status: "now" | "next" | "later";
  title: string;
  items: string[];
};

export const ROADMAP: RoadmapPhase[] = [
  {
    phase: "Now",
    status: "now",
    title: "Classic, polished",
    items: [
      "The core flow-combat loop, faithful to the original",
      "Six specialized star types and emergent map topology",
      "Live-tunable parameters and a readable, animated galaxy",
      "Free in-browser alpha — no download, no account",
    ],
  },
  {
    phase: "Next",
    status: "next",
    title: "More ways to play",
    items: [
      "Smarter AI commanders with distinct doctrines",
      "Curated map packs and a built-in map editor",
      "Online multiplayer skirmishes",
      "Saveable, shareable rule presets",
    ],
  },
  {
    phase: "Later",
    status: "later",
    title: "A galaxy you author",
    items: [
      "Deep modding: author and publish full game modes",
      "Campaigns and persistent commander progression",
      "Community mode browser and ladders",
      "Native desktop builds",
    ],
  },
];

export type DevlogPost = {
  slug: string;
  date: string; // ISO
  tag: string;
  title: string;
  excerpt: string;
  body: string[];
};

// Starter devlog content written in the developer's voice. These are real,
// editable entries — swap dates/details as builds ship. Newest first.
export const DEVLOG_POSTS: DevlogPost[] = [
  {
    slug: "alpha-doors-open",
    date: "2026-06-12",
    tag: "Release",
    title: "The alpha doors are open",
    excerpt:
      "Pax Fluxia is now playable, free, right in your browser — no download, no account. Here's what's in, what's rough, and how to help.",
    body: [
      "After a long stretch of building in the dark, the front door is finally unlocked. You can play Pax Fluxia today, free, in any modern browser. Pick a galaxy, open your first flow, and see if you can be the last commander standing.",
      "This is an honest alpha. The core loop — flowing fleets between stars, holding chokepoints, grinding down strongholds — is solid and, I think, genuinely fun. The edges are still rough: the AI is serviceable rather than scary, a few star layouts can snowball, and the onboarding is thinner than it should be.",
      "If you play, the single most useful thing you can do is tell me where it lost you. The Discord is the fastest line to me, and every report goes straight into the build.",
    ],
  },
  {
    slug: "rivers-of-force",
    date: "2026-05-28",
    tag: "Design",
    title: "Why the ships flow instead of teleport",
    excerpt:
      "The whole game hangs on one decision: you can see force move. A note on legibility, rivers, and why a thick stream should mean exactly what it looks like.",
    body: [
      "Most strategy games hide their state behind numbers. Pax Fluxia tries to do the opposite: the board *is* the information. A flow you open becomes a visible river of ships, and its thickness is its strength. You should be able to glance at a screen and know, instantly, who is winning a lane.",
      "That constraint shapes everything. Combat is symmetric and continuous, so a contested lane reads as two rivers grinding into each other. Pinning a star throttles its repair, so a thin trickle can hold a giant in place — and you can see it happening. Nothing important lives in a tooltip.",
      "It's harder to build than a spreadsheet would be, but it's the entire point. Visible strategy is the pillar I refuse to compromise.",
    ],
  },
  {
    slug: "rebuilding-the-galaxy-renderer",
    date: "2026-05-09",
    tag: "Tech",
    title: "Rebuilding the galaxy renderer",
    excerpt:
      "Thousands of ships, hundreds of stars, sixty frames a second. A look under the hood at the rendering rework that makes the flow feel alive.",
    body: [
      "A galaxy full of streaming fleets is a lot of moving dots. To keep the whole thing smooth — even on a laptop, even in a browser — I rebuilt the rendering layer on top of a GPU-accelerated pipeline.",
      "The win isn't just frame rate; it's headroom. With rendering cheap, I can spend frames on the things that make the game feel good: glow on contested lanes, smooth territory shading, and animation that reads the battle for you instead of just decorating it.",
      "There's still tuning to do on lower-end hardware, and that work is ongoing. But the foundation is finally one I'm happy to build the rest of the game on top of.",
    ],
  },
  {
    slug: "a-homage-worth-making",
    date: "2026-04-22",
    tag: "Studio",
    title: "A homage worth making",
    excerpt:
      "Pax Fluxia exists because a small 2007 indie game never left my head. On honoring a classic without simply cloning it.",
    body: [
      "Years ago I fell hard for Pax Galaxia, a quiet 2007 indie game about rivers of ships and the slow pleasure of good position. It mostly faded from view, and I never stopped missing the specific feeling of it.",
      "Pax Fluxia is my attempt to bring that feeling back — faithful to the hypnotic core, but rebuilt from scratch with a modern engine, sharper visuals, and room to grow far beyond the original. The goal isn't a clone. It's the game I remember, made for now.",
      "I'm building it solo, in the open, as Fatherlion Studios. If that origin story resonates with you, you're exactly who I'm making this for.",
    ],
  },
];

export type FaqItem = { q: string; a: string };

export const FAQ: FaqItem[] = [
  {
    q: "How much does it cost?",
    a: "Pax Fluxia is free to play during the alpha. It runs in your browser — no download and no account required to jump in.",
  },
  {
    q: "Is it finished?",
    a: "No — it's in active development. The core game is playable and fun, but expect rough edges, balance changes, and frequent updates. Your feedback shapes what ships next.",
  },
  {
    q: "What do I need to play?",
    a: "A modern desktop browser. There's nothing to install. Native desktop builds are planned for later.",
  },
  {
    q: "Is there multiplayer?",
    a: "Online skirmishes are on the roadmap. Today the alpha focuses on the single-player core against AI commanders.",
  },
];
