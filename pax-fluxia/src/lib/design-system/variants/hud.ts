import { tv, type VariantProps } from "tailwind-variants";

export const hudPanel = tv({
  slots: {
    root: [
      "relative isolate min-w-0 text-pax-text",
      "border border-pax-gold/35 bg-pax-panel shadow-pax-panel-soft",
      "backdrop-blur-[18px]",
    ],
    header: [
      "flex items-center justify-between gap-3",
      "border-b border-pax-gold/20 pb-2",
    ],
    titleBlock: "grid min-w-0 gap-0.5",
    eyebrow: [
      "font-pax-ui text-[0.58rem] font-extrabold uppercase tracking-[0.14em]",
      "text-pax-gold",
    ],
    title: [
      "m-0 truncate font-pax-ui text-[0.82rem] font-extrabold uppercase tracking-[0.07em]",
      "text-pax-gold-strong",
    ],
    body: "min-w-0",
  },
  variants: {
    density: {
      compact: {
        root: "grid gap-2 rounded-pax-sm p-2.5",
      },
      balanced: {
        root: "grid gap-3 rounded-pax-md p-3.5",
      },
      spacious: {
        root: "grid gap-4 rounded-pax-lg p-5",
      },
    },
    tone: {
      default: {},
      strong: {
        root: "bg-pax-panel-strong border-pax-gold/55",
      },
      muted: {
        root: "bg-pax-panel-muted border-pax-gold/25",
      },
      tactical: {
        root: "border-pax-cyan/35",
        eyebrow: "text-pax-cyan",
      },
    },
  },
  defaultVariants: {
    density: "balanced",
    tone: "default",
  },
});

export type HudPanelVariants = VariantProps<typeof hudPanel>;

export const hudButton = tv({
  base: [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "border font-pax-ui font-bold uppercase tracking-[0.08em]",
    "transition-[background,border-color,box-shadow,color,transform] duration-150",
    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-pax-gold-strong",
    "disabled:pointer-events-none disabled:opacity-45",
  ],
  variants: {
    intent: {
      neutral: "border-pax-gold/25 bg-pax-panel-muted text-pax-text hover:border-pax-gold/60 hover:text-pax-text-strong",
      primary: "border-pax-cyan/45 bg-pax-panel text-pax-cyan-strong hover:border-pax-cyan hover:shadow-pax-panel-soft",
      selected: "border-pax-gold/65 bg-pax-panel-strong text-pax-gold-strong shadow-pax-panel-soft",
      danger: "border-pax-danger/45 bg-pax-panel-muted text-pax-danger hover:border-pax-danger",
    },
    size: {
      icon: "h-9 w-9 rounded-pax-sm p-0",
      sm: "h-8 rounded-pax-sm px-3 text-[0.68rem]",
      md: "h-10 rounded-pax-md px-4 text-[0.74rem]",
      lg: "h-12 rounded-pax-md px-5 text-[0.82rem]",
    },
  },
  defaultVariants: {
    intent: "neutral",
    size: "md",
  },
});

export type HudButtonVariants = VariantProps<typeof hudButton>;

export const hudRail = tv({
  slots: {
    root: [
      "relative z-20 flex h-full flex-col overflow-hidden",
      "bg-pax-panel-strong text-pax-text shadow-pax-panel-soft",
    ],
    item: [
      "inline-flex items-center justify-center gap-2 rounded-pax-sm border",
      "border-pax-gold/25 bg-pax-panel-muted text-pax-text-muted",
      "transition-[background,border-color,color,box-shadow,transform] duration-150",
      "hover:border-pax-gold/55 hover:text-pax-text-strong",
    ],
  },
  variants: {
    side: {
      left: {
        root: "border-r border-pax-gold/20",
      },
      right: {
        root: "border-l border-pax-gold/20",
      },
    },
    density: {
      compact: {
        root: "gap-2 p-2",
        item: "h-9 w-9",
      },
      expanded: {
        root: "gap-3 p-3",
        item: "h-10 justify-start px-3",
      },
    },
  },
  defaultVariants: {
    side: "left",
    density: "compact",
  },
});

export type HudRailVariants = VariantProps<typeof hudRail>;
