# Built-in category presets

One folder per `ThemeCategory` (see `categoryKeys.ts`), each holding JSON presets
that tune **only that category**:

```
builtin-category-presets/
  travel/snappy.json
  audio/quiet.json
```

```json
{
  "name": "Snappy",
  "createdAt": "2026-08-11T00:00:00Z",
  "values": { "TRAVEL_DURATION_MULT": 0.6, "DEPART_JITTER_MS": 0 }
}
```

The folder decides the category. A `category` field is optional; if present it
must match the folder, or the file is skipped rather than shown in a list it
cannot correctly apply to. Every key in `values` must belong to that category
(`CATEGORY_KEYS`) — `categoryPresets.test.ts` enforces both.

**These are not slices of full themes.** Until 2026-08-11 the category preset
dropdowns were populated by slicing every built-in *full theme* per category, so
Travel, Audio, Combat and the rest all offered the same list of whole-game theme
names. A category preset is its own kind of thing, named for what it does to its
own category. Full themes live in `builtin-themes/` and have their own picker.

Empty is fine: a category with no presets shows an empty list, which is honest.
