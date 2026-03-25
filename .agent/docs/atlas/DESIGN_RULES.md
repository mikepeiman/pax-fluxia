# Design Rules

Centralized design rules for all UI/UX and code decisions.

## Layout

- **Flex for simple layouts** (1-2 columns, stacking). Use `display: flex`.
- **Grid for complex layouts** only (3+ areas with distinct sizing needs, overlapping regions, named areas).
- **Never Grid for single-column** — that's what Flex does.
- **`min-width: 0`** on all flex children to prevent intrinsic overflow.

## Responsive

- **900px breakpoint**: 2-col → 1-col. Show tabs for section switching.
- **480px breakpoint**: Compact spacing, smaller fonts, stacked forms.
- Every child element: `max-width: 100%; box-sizing: border-box`.
- **Tabs switch sections** on mobile — never show both stacked.
- Options/settings: always behind a gear icon, never a dedicated column.

## No Goalpost Moving (Axiom)

> If a design breaks at a given size, **fix the design at that size**.
> Never change the breakpoint, hide the problem, or redefine success.

- DO: Shrink fonts, stack columns, wrap items, compress padding.
- DO NOT: Remove features, change breakpoints, declare "not supported".

## Touch

- **44px minimum** touch target on mobile.
- Range sliders: 20px thumb on mobile.

## Visual

- **`clip-path`**: Remove on mobile (causes overflow).
- **Pseudo-elements** (`::before`, `::after` with `z-index`): Cannot layer above positioned children. Use real DOM elements or background properties instead.
