# Changelog

## 1.1.1 — 2026-09-25

Starting grind and kettle targets match published recipes, not a stacked “Light + 96 °C + altitude” card.

### Temperature
- Kasuya 4:6 stays at the published **92 °C** (it was inheriting 96 and then +1 for juicy)
- Acid nudge never prints above **96 °C** (SCA ceiling). Rao stays ~97 because he published that
- At 2 000 m the kettle is ~92 °C — already in the SCA band. No extra-fine clicks or tighter ratio just because a sea-level 96 card is out of reach
- Grind / time / ratio only move when the kettle sits **under 92 °C** (roughly above ~2 300 m)

### Grind
- Honest Coffee Guide bands already mean “V60 / steep / espresso”. **Medium sits in the middle** of that window
- Light V60 / Origami / OREA start **medium**. Juicy steps once to medium-fine — never to fine on a filter card
- Full grind grid tested on C3S Pro, Encore ESP, and J-Max: every method × 56 bags × washed/natural × gassy/degassed

## 1.1.0 — 2026-09-25

Grind clicks and safer recipe picks for lots that are still blooming. Everything in [1.0.0](#100--2026-09-23) is still here.

### Brew recipes
- Light Rest is still blooming through day 10 (Medium through day 6). Suggested scripts dump gas: V60 Hedrick, Switch Super Hybrid, Origami Medina, espresso Blooming, Clever full steep
- No-bloom championship defaults (Bull, Du, turbo, short Clever) wait until the lot is degassed. Overriding them while gassy warns
- Flavor icons (up to two) pick the card that claims that cup. Juicy + light-sweet stays a fruit card. Body beats acid. Winey is treated as ferment
- Honey and anaerobic clog like a natural on paper
- Gassy paper / puck beds do not stack altitude + acid + hard-density finer clicks. Net grind shift is clamped to ±2
- Full grid tested: 13 methods × 56 bags × style × process × gassy/degassed

### Grind
- Searchable kitchen mill picker, ~190 Honest Coffee Guide charts. Zero is burrs touching. Starting clicks — not a lock
- Cera+ stays qualitative (no invented numbers)
- Dose moves a click coarser on pour-over, Switch, Clever, espresso, and moka

### Docs
- [docs/BREW.md](docs/BREW.md) — gassy vs degassed suggestion matrix, grind clicks, flavor pairs

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
