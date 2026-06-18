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
      neutral: "border-pax-gold/20 bg-pax-panel-muted text-pax-text-soft hover:border-pax-gold/50 hover:bg-pax-gold/10 hover:text-pax-gold-strong active:bg-pax-gold/15",
      primary: "border-pax-cyan/45 bg-pax-panel text-pax-cyan-strong hover:border-pax-cyan hover:bg-pax-cyan/10 hover:shadow-pax-panel-soft",
      selected: "border-pax-gold/65 bg-pax-panel-strong text-pax-gold-strong shadow-pax-panel-soft",
      danger: "border-pax-danger/40 bg-pax-panel-muted text-pax-danger hover:border-pax-danger hover:bg-pax-danger/10",
    },
    size: {
      icon: "h-9 w-9 rounded-pax-md p-0",
      sm: "h-8 rounded-pax-md px-3.5 text-[0.7rem]",
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

export const hudTooltip = tv({
  base: [
    "z-50 rounded-pax-xs border border-pax-gold/55 bg-pax-panel-strong",
    "px-2.5 py-1.5 font-pax-ui text-[0.64rem] font-bold uppercase tracking-[0.1em]",
    "text-pax-gold-strong shadow-pax-panel-soft backdrop-blur-[14px]",
  ],
});

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

export const hudSegmentedControl = tv({
  slots: {
    root: [
      "grid min-w-0 gap-1.5 rounded-pax-sm border border-pax-gold/20 bg-pax-panel-muted p-1",
    ],
    item: [
      "inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pax-xs border",
      "border-pax-gold/18 bg-pax-panel-muted text-pax-text-muted",
      "font-pax-ui font-bold uppercase tracking-[0.08em]",
      "transition-[background,border-color,box-shadow,color,transform] duration-150",
      "hover:border-pax-gold/45 hover:text-pax-text-strong",
      "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-pax-gold-strong",
      "disabled:pointer-events-none disabled:opacity-45",
      "data-[state=on]:border-pax-gold/70 data-[state=on]:bg-pax-panel-strong data-[state=on]:text-pax-gold-strong",
      "data-[state=on]:shadow-pax-panel-soft",
    ],
  },
  variants: {
    density: {
      compact: {
        root: "grid-flow-col auto-cols-fr",
        item: "h-8 px-2 text-[0.66rem]",
      },
      balanced: {
        root: "grid-flow-col auto-cols-fr",
        item: "h-9 px-3 text-[0.72rem]",
      },
      vertical: {
        root: "grid-flow-row",
        item: "h-9 justify-start px-3 text-[0.72rem]",
      },
    },
  },
  defaultVariants: {
    density: "balanced",
  },
});

export type HudSegmentedControlVariants = VariantProps<typeof hudSegmentedControl>;

export const hudField = tv({
  slots: {
    label: [
      "grid min-w-0 gap-1.5 font-pax-ui text-pax-text",
    ],
    labelText: [
      "font-pax-ui text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-pax-text-muted",
    ],
    input: [
      "min-w-0 rounded-pax-xs border border-pax-gold/30 bg-pax-panel-muted",
      "px-3 font-pax-ui font-bold text-pax-text",
      "outline-none transition-[background,border-color,box-shadow,color] duration-150",
      "placeholder:text-pax-text-dim hover:border-pax-gold/55 focus:border-pax-gold/75",
      "focus:shadow-pax-panel-soft",
    ],
  },
  variants: {
    size: {
      sm: {
        input: "h-8 text-[0.72rem]",
      },
      md: {
        input: "h-9 text-[0.78rem]",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type HudFieldVariants = VariantProps<typeof hudField>;

// Sliders are a single horizontal row: LABEL [−][====][+] value.
export const hudRange = tv({
  slots: {
    root: "flex min-w-0 items-center gap-2",
    label: [
      "shrink-0 basis-[5.5rem] min-w-0 truncate",
      "font-pax-ui text-[0.66rem] font-extrabold uppercase tracking-[0.08em] text-pax-text-soft",
    ],
    nudge: [
      "shrink-0 grid h-6 w-6 place-items-center rounded-pax-sm border border-pax-gold/20 bg-pax-panel-muted",
      "text-[0.9rem] leading-none text-pax-text-soft",
      "hover:border-pax-gold/50 hover:bg-pax-gold/10 hover:text-pax-gold-strong",
      "disabled:pointer-events-none disabled:opacity-40",
    ],
    input: [
      "h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full border border-pax-gold/20",
      "bg-pax-panel-muted accent-pax-gold",
    ],
    output: [
      "shrink-0 w-12 text-right font-pax-data text-[0.68rem] font-bold tabular-nums text-pax-gold-strong",
    ],
  },
});
