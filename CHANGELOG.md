# Changelog

## 1.0.0 — 2026-09-23

First official release. Local-first Kaffelogic Nano 7 studio: generate `.kpro` files from the bean, overlay design vs log, keep a device-local library, and brew from the roast with a measured After-brew reading.

### Generate
- Roast times from drying / Maillard / development slopes, not a 6 / 9 / 11 minute family bucket
- Origin, variety, process, moisture, brew destination, roast style
- Density from altitude, typed g/L, or a vessel (mass / volume, default 90 mL)
- Rest (peak 3–5 days) vs RTD (1–3 days) cup timing and boost policy
- Up to two flavor goals on one budget
- Recommended boost zones (RoR-error, not the BOOST kit)
- Official-shaped fan Bézier timed from yellow → first crack → drop
- Yellow, first crack, and drop pinned on the Bézier so Studio DTR is the time actually roasted
- Light style sits at Kaffelogic level 1.6
- Interactive curve: add / delete / smooth / reset, walk the roast
- Download `.kpro` (plain `key:value` ASCII)

### Overlay
- Compare `.kpro` profiles and `.klog` design vs actual
- Structured track details, zone/scalar diff, phases, ±3 °C deviation
- Samples only up to `roast_end`
- Local-only Cursor overlay coach in `npm run dev` (never on GitHub Pages)

### Library
- Save, rename, favorite, export JSON on this device

### Brew
- Starting card from Generate, a library profile, a dropped `.kpro`, or This bag (bought coffee)
- Kitchen altitude is separate from farm metres and caps the kettle at local boil
- Championship / community / academic scripts (Hoffmann, 4:6, WBrC, WAC, Gaggiuino espresso when the method is espresso)
- Mine recipes: device-local sheet and JSON share
- After brew: Brix (×0.85) or TDS, cup weight, PE = TDS × cup ÷ dose
- Filter cup defaults to kettle water minus ~2 g water per g coffee (bed retention)
- Lockhart / SCA chart: ratio diagonals, Golden Cup box, drag along the current ratio, next-cup ghost
- Next cup names grind, time, and cup/ratio
- No advice when TDS or PE is off the plot

### Language and phone
- EN / ES switch. Bloom, Rest, RTD, Maillard, and method names stay English
- Variety names: Borbón Rosado / Amarillo, Colombia (variedad)
- Safe-area chrome, stacked fields, reachable Generate / Brew actions

### Docs
- [docs/ROAST-MODEL.md](docs/ROAST-MODEL.md) — equations, boosts, Rest/RTD, fan, citations
- [docs/BREW.md](docs/BREW.md) — SCA / UC Davis, altitude, WBrC / WAC, After brew
