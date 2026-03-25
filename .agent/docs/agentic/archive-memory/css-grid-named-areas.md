# CSS Grid Named Areas

## CRITICAL: Use CSS Grid with Named Grid Areas for all layouts.

CSS Grid with named grid areas should be the **default** for any layout work. It is the most readable and maintainable approach.

```css
/* ✅ CORRECT: Named Grid Areas */
.layout {
    display: grid;
    grid-template-columns: 200px 1fr 300px;
    grid-template-areas:
        "sidebar main aside"
        "footer  footer footer";
}
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.aside   { grid-area: aside; }
.footer  { grid-area: footer; }

/* ❌ AVOID: Unnamed column/row placement */
.sidebar { grid-column: 1; }
.main    { grid-column: 2; }
```

Use `grid-template-areas` for responsive breakpoints too:
```css
@media (max-width: 900px) {
    .layout {
        grid-template-columns: 1fr;
        grid-template-areas:
            "main"
            "sidebar"
            "aside"
            "footer";
    }
}
```
