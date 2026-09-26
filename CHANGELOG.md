# Changelog

## 1.3.0 — 2026-09-26

Brew from the phone at the counter: a step timer, two-tap tasting, cup-first sizing, and Kaffe installs as an offline app.

### Brew at the counter
- **Brew timer**: tap Start on any card for a full-screen clock over the whole recipe as step cards — tap to expand any step (or Expand all) to read ahead, done steps tick off, the current one opens and follows you, upcoming ones count down, and **Jump here** moves the clock if you fell behind. Chimes and vibrates on each step and keeps the screen awake
- **Taste**: two taps after a cup — sour / balanced / bitter and weak / right / strong (Barista Hustle Coffee Compass) — plus stars and a note. Kaffe says what to change next; the last cups show per lot and in the Library card
- **In the cup (g)**: type the cup you want and the dose follows the ratio, net of the ~2 g/g the grounds keep

### App
- Installable **PWA**: works offline (whole app precached), updates itself, **Install** button in the top bar (with iPhone instructions), and an **Update ready** pill when a new version lands
- New bean app icon (header, home screen, maskable)
- README no longer references other apps

## 1.2.0 — 2026-09-26

About 100 cultivars in Generate and This bag, up from 20. Each new one roasts, brews, and suggests flavors like the family it belongs to.

### Varieties
- Gesha / landrace family: Chiroso, Ombligón, Papayo, Sudan Rume, Laurina, Centroamericano, Starmaya, Casiopea, Typica Mejorado, Bourbon Ají, Maragesha, JARC 74110 / 74112 / 74140 / 74158 / 74165 / 75227, Kurume, Wolisho, Dega, Abyssinia
- Bourbon and dwarf lines: Red / Orange / Striped Bourbon, Pacas, Villa Sarchi, Tekisic, Jackson, Mibirizi, Semperflorens, Venecia, Yellow Caturra, Villalobos, San Ramón, Pache
- Kenya: SL14, Batian, K7
- Catuai and body family: Red / Yellow Catuai, Topázio, Paraíso, Garnica, Catimor, Sarchimor, Marsellesa, Parainema, Lempira, IHCAFE 90, Costa Rica 95, Catisic, Anacafé 14, Oro Azteca, Obatã, Tupi, IAPAR 59, Catiguá, Cenicafé 1, Acaia, Icatu, Arara, Catucaí, Mundo Maya
- Indonesia / India: Tim Tim, Ateng, Gayo 1, Sigarar Utang, S795, Chandragiri, Kent
- Large seed and Yemen: Maracaturra, Blue Mountain, Mokka, Udaini, Tuffahi, Dawairi, Jaadi
- The variety picker is A–Z by the name you see, so in Spanish “Borbón Rojo” sorts under B
- Spanish names now spell Borbón with the accent everywhere

### Grinders
- Espresso lists only espresso-capable mills. Filter-only models (non-ESP Timemore C2 / C3 / C3S, Baratza Encore, Fellow Ode, 1Zpresso ZP6 / JX, Hario Mini Mill…) are hidden there and keep the grind word if already picked. Filter methods list every mill, espresso grinders included
- Cera+ CGE01 now prints clicks for espresso and filter, estimated from its 20 µm step
- 18 more HCG charts: Baratza Vario / Vario W / Vario+ / Vario W+ / Forté AP / Forté BG / Preciso, Eureka Mignon Specialità / Silenzio / Classico, Acaia Orbit, Bravo IT, Goat Story Arco, Lagom Casa, Mahlkönig EK43 S, Weber EG-1, two KitchenAid mills
- Vario-style letters (2K) and Eureka turns (1+3) read the way the dial is marked
- Search forgives one typo and squashed codes: “chesnut c3 esp pro” finds the Timemore C3 ESP Pro

### Brew — science fixes
- After brew computes extraction on the right mass: **immersion uses all the water** (French press, Clever, Switch steeps, AeroPress, cupping, cold brew, siphon), percolation the drained cup, espresso the shot — plus any bypass. A 21% French press no longer reads 18.5% and asks for a finer grind
- The chart’s ratio lines sit on that same basis, labelled by what you poured; strength box is **SCA** or **Europe (ECBC)**, and the plot reaches 2% TDS. Rao’s spin V60 and turbo / allongé shots get their own extraction goals
- Boiling point **100 − h/300** (ISA + Antoine), and the altitude correction under a 92 °C kettle grows gradually instead of jumping a grind step at 92.0 °C
- Generate and Brew agree on density; the first Why line describes the recipe you are actually brewing
- Cupping stays on the SCA protocol whatever the flavor, gas or altitude
- Gassy lots only go coarser on beds that dome, not in a French press or cold brew
- Espresso rests longer than filter; the card warns when a Light filter roast goes into the espresso machine
- Kitchen **Water** row (recipe / soft / hard); hard, alkaline water warns on acid cups
- After brew tips: room-temperature sample, zero with brew water, filter espresso samples; Escape closes the chart

### Brew — recipes and methods
- **Nas Jaafar, World Brewers Cup 2026 champion** (Switch, open pour then closed finish; round-one routine)
- Matt Winton WBrC 2021 five pours (V60), Jibbi Little WAC 2022 (AeroPress), April two pours (Patrik Rolf), Hoffmann Better 1-Cup V60, Tim Wendelboe pour-over and French press, Stumptown Chemex, Kyoto slow drip, Rao allongé
- New methods: **Siphon** (Sprudge, Blue Bottle) and **Batch brew** (SCA Golden Cup, Rao, Wendelboe)

### Roast — science fixes
- Washed / natural first-crack offsets apply once; moisture no longer shifts the crack temperature; moisture and density no longer add drying time twice
- Negative boosts are a **flick brake that ends before first crack** (Kaffelogic guidance), not a brake through the endothermic crack
- At least 60 s of development is designed
- Flavor goals recommend the three that fit this bean and roast instead of nearly all of them

### Overlay, Library, UI
- Overlay plots **RoR** (actual vs design) with a ±3 °C band around the design; switch the right axis to Fan when you need it
- A logged first crack can be sent to Generate as Expected first crack
- Library roast date and notes; Brew counts rest days from the roast date. Secondary actions live under More; delete asks first
- Compare table hides rows that are empty for every track; phases and deviation panels are translated
- Boost zones: one “+ Add” per empty zone, translated reasons, “Flick brake” / “Zone 3 · late”
- Grinder modal alignment and chart marker labels (no more “Drpp”)

### Docs
- [docs/ROAST-MODEL.md](docs/ROAST-MODEL.md#variety-families) — variety families table
- ROAST-MODEL: corrected Schwartzberg title and Kornman attribution, heuristic labels on the crack-temperature slope, rest advice vs Wang & Lim 2014, new Limits (colour vs time, probe vs fan, DTR as output, power headroom)
- BREW: Batali 2020 read correctly, boiling formula, After-brew basis table, water, community recipe table

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
