# Changelog

## 1.0.0 — 2026-09-29

First public release. Kaffe is a local-first roast **and** brew studio: generate Kaffelogic Nano 7 `.kpro` profiles from the bean, overlay design vs log, keep a device-local library, and brew from the roast (or from a bag you bought) with a step timer, tasting and a measured After-brew reading. Installs as an offline app on phones and desktops.

### Brew
- **Starts on This bag** (the coffee you bought). The **Profile** tab attaches a Generate roast, a library profile or a dropped `.kpro`; “Brew →” in Generate and “Brew recipe” in Library jump straight to Brew
- **Recipes**: championship, community and academic scripts: Nas Jaafar (WBrC 2026), Matt Winton (WBrC 2021), Jibbi Little (WAC 2022), Kasuya 4:6, Hoffmann, Rao, Hedrick, Tim Wendelboe, Stumptown Chemex, Kyoto slow drip, Gaggiuino espresso phases and more. **Mine** recipes live on the device and share as JSON
- **Methods**: pour-over (V60, Origami, OREA, Chemex), Switch, Clever, AeroPress, French press, espresso, moka, cupping, cold brew, siphon and batch brew
- **Gassy vs degassed**: Light rests are still blooming through day 10 (Medium through day 6), so suggested scripts dump gas; no-bloom championship defaults wait until the lot is degassed and warn if overridden
- **Flavor icons** (up to two) pick the card that claims that cup
- **A real Prep step** for every recipe: heat the water, weigh and grind the dose, rinse and preheat, load and tare, with recipe-specific setup (Switch valve, inverted AeroPress, two kettles, ice, bypass)
- **Brew timer**: a full-screen clock over the recipe as step cards. Done steps tick off, the current one follows you, **Jump here** moves the clock, and in the last 10 seconds before each step the next card turns red and opens with 3-2-1 beeps. Keeps the screen awake
- **Kitchen card**: kitchen altitude (separate from farm metres) caps the kettle at local boil (100 − h/300), water (recipe / soft / hard), and a searchable mill picker with ~210 Honest Coffee Guide charts that prints starting clicks. Espresso only lists espresso-capable mills
- **In the cup (g)**: type the cup you want and the dose follows the ratio, net of the ~2 g/g the grounds keep
- **Taste**: two taps (sour / balanced / bitter, weak / right / strong, after the Barista Hustle Coffee Compass) plus stars and a note. Kaffe says what to change next
- **After brew**: Brix (×0.85) or TDS, extraction on the right mass (immersion uses all the water, percolation the drained cup, espresso the shot, plus bypass), and a Lockhart / SCA chart with SCA or Europe (ECBC) strength boxes and a next-cup ghost

### Roast
- **Generate**: roast times from drying / Maillard / development kinetics; origin, ~100 varieties grouped into families, process, moisture, density (altitude, g/L or a vessel), brew destination, roast style and up to two flavor goals
- Rest (peak 3–5 days) vs RTD (1–3 days) cup timing, recommended boost zones and a flick brake that ends before first crack
- Official-shaped fan Bézier timed from yellow → first crack → drop, with those points pinned so Studio DTR is the time actually roasted
- Interactive curve (add / delete / smooth / reset, walk the roast) and `.kpro` download
- **Overlay**: compare `.kpro` profiles and `.klog` design vs actual, RoR (actual vs design) with a ±3 °C band, structured track details, zone diff and phases. A logged first crack can be sent back to Generate
- **Library**: save, rename, favorite, roast date and notes, export JSON, all on this device
- Roaster picker (Kaffelogic Nano 7 for now)

### App
- Installable **PWA**: works offline, updates itself, an **Install** button that only shows when the browser can install Kaffe, per-browser install guides (including an iPhone Share-button guide and “Open in Safari” from in-app browsers), and an **Update ready** pill
- **How Kaffe works** in the ⋯ menu: plain-language Brew and Roast sections with numbered sources and limits; **Why?** links open the matching section
- **English and Spanish** (natural Latin American Spanish). Bloom, Rest, RTD, Maillard and method names stay English
- Phone-first layout: two-row header that folds on scroll, Brew | Roast switch, safe-area chrome
- Link previews with the Kaffe name, a description and an image

### Docs
- [docs/ROAST-MODEL.md](docs/ROAST-MODEL.md): equations, variety families, boosts, Rest/RTD, fan, limits, citations
- [docs/BREW.md](docs/BREW.md): SCA / UC Davis, altitude, water, grind clicks, WBrC / WAC, After brew, gassy vs degassed matrix
