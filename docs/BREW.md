# Brew model

Kaffe’s Brew page is a **starting card**, not a lock. It does not read the Bézier and does not invent TDS/PE — After brew takes a refractometer Brix or TDS and places the cup on a Lockhart / SCA control chart. It does not treat a World Brewers Cup routine as law for a home V60 at 1 800 m.

The card is built from three corpora, in this order:

1. **Academic** — what actually moves the cup (TDS, PE, ratio, time). Temperature is a rate knob.
2. **Competition** — published winning recipes, almost all **Light** filter or espresso.
3. **Community** — Hoffmann and SCA-shaped daily skeletons where competition is silent.

Implementation: `src/lib/brew.ts` (`recommendBrew`, `snapshotFromKpro`, `boilingPointC`). Farm altitude stays on Generate. **Kitchen** altitude is a separate, persisted input.

The Roast section has two tabs. **Profile** attaches a Generate / library / .kpro roast. **This bag** is for a bought coffee: origin, variety, style, process, farm metres, and up to two flavor icons. Origin / variety move **density**, **seed size**, and a **flavor lean** (when you have not picked I want) — not a separate origin-indexed recipe table. Same `recommendBrew` path; no .kpro required.

---

## 1. What the literature actually says

Lockhart’s brewing control chart, still the SCA Golden Cup spine, defines a cup by **strength** (TDS) and **extraction** (PE), not by dripper brand. The usual certification band is about **55 g/L** (~1:18) and **18–22%** PE, with water at the grounds **90–96 °C**. SCA-certified auto drippers must hit **92 °C in the first minute**, hold at least that, and **never exceed 96 °C**.

UC Davis (Batali, Ristenpart & Guinard, 2020, *Sci. Rep.*, drip, trained panel of 12): 87 vs 90 vs 93 °C barely moved descriptive sensory **once PE was matched** — and they matched it by changing grind and time. So temperature matters mostly through extraction; it does not prove you never compensate. One coffee, one roast, no consumer test.

UC Davis (Liang et al., 2021, full immersion): equilibrium PE is about **21%** and is **insensitive** to roast level, grind, brew ratio, and temperature from **80–99 °C**. Temperature changes **how fast** you get there. Ratio sets TDS. That is why Switch / Clever / French press can give back time when the kettle is capped.

So the Brew page’s job is: pick a method skeleton → set a sea-level **wanted** temperature → **cap** it at local boil → spend the deficit on grind, time, and (if large) a slightly tighter ratio.

---

## 2. Kitchen altitude (not farm metres)

Open-kettle water cannot go past the local boiling point. An engineering fit for inhabited elevations:

$$
T_{\mathrm{boil}}\approx 100-\frac{h}{300}\quad(^\circ\mathrm{C})
$$

about −1 °C per 300 m. ISA barometric pressure plus the Antoine equation for water agrees within ~0.05 °C up to 3 600 m (1 500 m ≈ 95.0 °C, 1 800 m ≈ 94.0 °C, 2 600 m ≈ 91.4 °C). Weather moves the real boil by about ±0.5 °C.

| Brew site | $T_{\mathrm{boil}}$ | What a “96–100 °C Light filter” card becomes |
|---|---|---|
| Sea level | 100 °C | Reachable; cool if you want mid-SCA |
| 1 000 m | 96.7 °C | Off-boil is already the SCA top |
| 1 500 m | 95.0 °C | Off-boil ≈ 93–94 °C |
| 1 800 m | 94.0 °C | Off-boil ≈ 92–93 °C |
| 2 600 m | 91.4 °C | Boil is **under** the SCA 92 °C floor |

Kettle target for open methods:

$$
T_{\mathrm{kettle}}=\min(T_{\mathrm{wanted}},\,T_{\mathrm{boil}}-1)
$$

Pour at a **rolling boil** when you are against the ceiling. Do not print 96 °C when boil is 94.

**Do not grind finer just because a sea-level “96 °C Light” card is out of reach.** At 2 000 m boil is ~93 °C and the kettle sits at ~92 °C — that is Kasuya’s published 4:6 temperature and the middle of the SCA 90–96 °C band. UC Davis (2020): at fixed TDS/PE, 87 vs 93 °C barely moves the cup. Extra-fine clicks at 2 000 m are a fake deficit.

Grind / time / ratio only move when the kettle sits **under the SCA 92 °C floor** (above ~2 400 m: Bogotá, Cuzco). The correction grows **continuously** with the deficit instead of jumping at 92.0 °C: per 3 °C short, pour-over **+20 s**, immersion / hybrid **+40 s**, ~7% tighter ratio, and **one grind word** finer (max two). Between whole steps the grinder click moves a fraction of the band. The size is an estimate — Batali 2020 matched extraction with grind and time, but no paper gives Kaffe’s numbers. Let the After-brew reading close the rest.

**Espresso is pressurized.** A 93 °C group is still reachable at altitude. Only the fill water on a moka is kettle-capped.

Published recipe temperatures stay on the card: Kasuya / Chad **92 °C**, Medina **91 °C**, Wölfl **93 °C**, Peng **96 then 80 °C**, Rao **~97 °C**, Stanica **96 °C**. Hoffmann “just off boil” is 96 °C at sea level — at altitude that becomes local boil, not two finer clicks. The acid nudge never prints above **96 °C** (SCA ceiling). Rao is the one selectable exception because he published ~97.

`intent.altitudeM` is **farm** metres (density / heat). Brew uses a device-local kitchen setting. “Same as this lot” is optional, never the default.

---

## 2b. My recipes (this device)

Championship chips stay **cited and read-only**. A user card is a **clone**, never an edit of Hoffmann / Kasuya / WBrC.

- **New Recipe** (beside Import) opens a blank sheet for the current method. No championship steps are copied.
- **Edit** on a competition card copies that card. **Edit** on a My recipes card opens the same sheet for your copy.
- **My recipes** lists cards for the current method. Tap one to view it; tap a competition card to leave it.
- Storage is `localStorage` (`kaffe.brew.mine.v1`), same pattern as the roast library. GitHub Pages has no server.
- **Export** writes a single `kaffe.brew-recipe` JSON. **Export all** writes a `kaffe.brew-recipe-pack`. **Import** always creates new ids on this device.

Kitchen boil still caps an open-kettle Mine card. The roast attach is unchanged.

Implementation: `src/lib/brewRecipes.ts`, sheet `src/components/BrewRecipeSheet.tsx`.

---

## 3. Competition cluster (Light only)

WBrC / WBC / WAC recipes are written for **one coffee, one roast, one room**. Kaffe uses them to **calibrate the Light row**, not to clone a stage routine.

### World Brewers Cup

Compulsory competition coffee sits roughly **Agtron 60–80** (Medium). Open-service winners are almost always **Light**.

| Year | Champion | Brewer | Dose / water | Ratio | Temp | Time | In Kaffe |
|---|---|---|---|---|---|---|---|
| 2013 | James McCarthy (US) | Kalita Wave | 24 g / 380 g | 1:15.8 | just off boil | ~3:30 | **Kalita · column** |
| 2016 | Tetsu Kasuya (JP) | V60 | 20 g / 300 g | 1:15 | 92 °C | ~3:30 | **V60 · 4:6** acid or sweet |
| 2017 | Chad Wang (TW) | V60 | 15 g / 250 g | 1:16.7 | 92 °C | ~2:00 | **V60 · one-pour center** |
| 2018 | Emi Fukahori (CH) | GINA | 17 g / 220 g | 1:12.9 | 80 → 95 → 80 °C | ~3:30 | **Clever · 80/95/80** (GINA maps to Clever) |
| 2019 | Jia-Ning Du (CN) | Origami | 16 g / 240 g | 1:15 | 94 °C | ~1:46 | **Origami · three pours, no bloom** |
| 2012 | Matt Perger (AU) | V60 | 12 g / 200 g | 1:16.7 | 97 °C | ~2:20 | Fine grind + stir; same even-extraction school as **Rao spin** |
| 2021 | Matt Winton (CH) | V60 | 20 g / 300 g | 1:15 | 93 then 88 °C | ~2:40 | **V60 · five pours, cooler after bloom** (60 g × 5, no stir) |
| 2022 | Shih Yuan Hsu (TW) | OREA V3 | 14 g / 200 g | 1:14.3 | **70 then 95 °C** | ~2:00 | **OREA · cool first** |
| 2023 | Carlos Medina (CL) | Origami | 15.5–16 g / 250 g | 1:16 | 91 °C | ~2:40–3:00 | **Origami · five pulses** |
| 2024 | Martin Wölfl (AT) | OREA V4 | 17 g / 270 g | 1:15.9 | 93 °C | 2:20–2:25 | **OREA · Wölfl pulses** |
| 2025 | George Peng | SOLO | 15 g / 210 g | 1:14 | 96 °C then 80 °C | 1:45 | **V60 · split-temp** (Solo → V60) |
| 2026 | Nas Jaafar (MY) | UFO V3 on a Switch base | 15 g / 200 g | 1:13.3 | 92 °C | ~2:10 | **Switch · open pour, closed finish** — published round-one routine; finals details may differ |

US Brewers Cup 2025 (Justin Bull, Hario Switch): open first (acid), then closed steep (sweet). **Switch · open first**.

WAC years we do **not** clone as extra chips (same drink family as Stanica / Pop / van Bunnik): Filip Kucharczyk 2016 (81 °C high-dose concentrate), Carolina Garay 2018 (85 °C + room-temp top-up), Paulina Miczka 2017. **Jibbi Little 2022** is kept as its own card — stirred inverted 94 g at 92 °C plus a 150 g bypass at 90 °C, a hot-bypass cup the others do not make — **AeroPress · stirred inverted + hot bypass**. **Tay Wipvasutt 2023** is a different drink (mid-brew grounds + split bypass) — **AeroPress · mid-brew charge**. Full archive: [worldaeropresschampionship.com/pages/recipes](https://worldaeropresschampionship.com/pages/recipes).

Cluster used in code: Light filter **1:14–1:16**, **91–96 °C**, **~1:45–3:00**. Recent winners are **not** on a V60. The V60 card still uses that cluster because the physics (ratio, temp, time) transfers; the pour pattern does not have to.

**Dark has no WBrC corpus.** Those rows are craft.

### World AeroPress Championship

| Year | Champion | Position | Dose | Brew water | Temp | Then |
|---|---|---|---|---|---|---|
| 2024 | George Stanica (RO) | Inverted | 18 g | 100 g (50+50) | 96 °C | Press ~76–79 g, dilute to ~150–165 g |
| 2025 | Némo Pop (AU) | Upright + flow cap | 18 g | 100 g | 84 °C | 70 g bypass at 50 °C |
| 2022 | Jibbi Little (AU) | Inverted | 18 g | 94 g | 92 °C | 35 stirs, press to 2:10, 150 g bypass at 90 °C |

Light AeroPress in Kaffe is a **scaled Stanica**: concentrate + bypass. Medium/dark go upright and cooler (Pop’s direction, daily grind).

### World Barista Championship

Light espresso cluster: about **1:2–1:2.5**, **90–94 °C** group, **25–30 s**. Not kettle-capped.

That cluster is **not** the only espresso card. Anyone with a **PID and flow control** (paddle, needle valve, dimmer, Decent, Gaggiuino) gets timed phases: fill at X ml/s, hold Y bar for Z seconds, then decline. Gaggiuino users also get the exact [SproFiler](https://sprofiler.io/community-profiles) name as a shortcut. Utility profiles (`[UT] Boiler Off`, Cycle, PZ Cal, Tube Fill, FlimsyLC PREP) are calibration, not drinks — we skip them.

Phases follow Decent / IUIUIU / SproFiler write-ups: blooming = fill to 4–5 bar, pump off ~30 s, ramp to 8–9 bar, decline; turbo (Extractamundo) = 8 ml/s to 4.5 bar, soak to 6 g, 3 ml/s capped at 6 bar; Londinium = fast flood, 3 bar until 4–8 g drips, rise to ~8.5 bar, spring decline; Adaptive Light = fill, 0 bar decay soak, 6 s rise, descending tail.

| Script | SproFiler name | What it does | Suggest when |
|---|---|---|---|
| Adaptive Light | `Adaptive for Light Roast` | Descending pressure after a hold. Sweetness/clarity over body. | Light default |
| Blooming | `Blooming espresso` | Long soak, then extract. Pour-over flavours, less sharp sour. | Light + floral |
| Turbo | `Extractamundo Dos!` | 15–20 s, 6 bar cap, paper in the basket. High extraction, low bitterness. | Light + fruit / acid |
| Low–high–low | `Low High Low` | Fast **1:3.5**, needs scales. Lower TDS, fewer harsh notes. | Selectable (Light, harsh lots) |
| Londinium / lever | `Londinium` (Leva 6 / Leva 9 same family) | Spring-lever rise then decline. Syrupy body. | Medium, or body / deep-sweet |
| Adaptive Dark | `Adaptive Dark Roast` | Cooler (~88 °C), slower tail. Creamy Dark. | Dark / heavy |
| Stock 9 bar | `Stock - 9 Bar` | Pump-on Classic feel. You cut the shot. | Selectable, café traditional |
| Filter on espresso | `Filter` | Paper + puck screen, 1:5, dilute ~230 g. | When the Gaggia is the only brewer |

Same-family names we do **not** clone as extra chips: IUIUIU Classic (all-rounder under Londinium/Adaptive), Allonge (blooming lungo), Flimsy / LMD / LowRider / Funky Town (variants or machine-specific).

---

## 4. Community skeletons

Used where the academic paper does not name a dripper and the competition winner used something you may not own.

| Method | Skeleton | Numbers we keep |
|---|---|---|
| V60 | Hoffmann *Ultimate V60 Technique* | 60 g/L idea; bloom ~2×; 60% of the water in by the 1:15 mark; stir N–S / E–W; finish ~3:30 |
| Chemex | Hoffmann V60 adaptation | 30 g : 500 g (1:16.7), 95–100 °C, ~4:10; 3-ply to the spout; rinse hard |
| Hario Switch | Four valve patterns — see §4b | 15 g : 250 g card; mode sets the clock and the open/close script |
| French press | Hoffmann *Ultimate French Press* | 30 g : 500 g; medium (not boulders); break/skim at 4:00; settle; plunge **to the surface** |
| Clever | Same hybrid idea as Switch | Fill, steep ~2:00, set on the cup to drain |
| Kalita Wave | Café / older WBrC flat-bottom | Centre pulses, flat bed, slightly longer than a V60 |
| OREA | Wölfl WBrC 2024 + official V4 pulses | 17 g / 270 g, 93 °C, four pours, ~2:20, fast flat bed |
| Cold brew | Hoffmann fridge steep; CCC concentrate | ~1:13, 12–16 h fridge, medium grind; no kettle |
| Moka | Hoffmann moka | Hot fill to the valve, no tamp, medium heat, **off at first blonde** |
| Cupping | SCA protocol | 8.25 g / 150 g, 93 °C, 4 min, break and skim |

Hoffmann often says “off boil” for Light. That is a **sea-level** instruction. At altitude it becomes “rolling boil.”

---

### Well-documented community and café recipes (added 2026-09)

Chosen for wide adoption and a primary source with numbers. Recipes whose numbers disagree across sources (Osmotic Flow, Tøllefsen 2015 pour splits, a Hoffmann batch recipe) are left out.

| Brewer | Recipe | Numbers | Source |
|---|---|---|---|
| V60 | Hoffmann *A Better 1-Cup V60* (2023) | 15 g / 250 g, freshly boiled, 50 g bloom + four 50 g pours by 2:00, ~3:00 | Hario USA |
| Kalita / flat | April two pours (Patrik Rolf, WBrC 2019 2nd) | 13 g / 200 g, 94 °C, 2 × 100 g (30 g circles + 70 g centre) | April Coffee Roasters |
| Kalita / pour-over | Tim Wendelboe | 65 g/L, ~60 g stirred bloom, to 200 g by 0:30, done ~3:00–3:30 | timwendelboe.no |
| Chemex | Stumptown | 42 g / 700 g, ~96 °C, 150 g bloom → 450 → 700 g, ~4:00 | stumptowncoffee.com |
| French press | Tim Wendelboe | 65–70 g/L boiling, 4–5 min, stir + skim, press, settle 1–5 min | timwendelboe.no |
| Cold brew | Kyoto slow drip | 60 g to ~500 g ice + water, ~1 drop / 2 s, 5 h+, dilute | Hario / Coffee Circle |
| Espresso | Rao allongé | 18 g → ~90 g, ~92 °C, 8–9 bar, 4–4.5 ml/s, no pre-infusion, 30–60 s, ~22–23% PE | Decent docs |
| Siphon | Sprudge | 35 g / 560 g (1:16), ~93 °C held, stir 0:00 / 0:30, off at 2:00, ~3:30 | Sprudge |
| Siphon | Blue Bottle | 24 g / 300 g, 90 °C, grounds at 0:40, 70 s, 10 stirs, ~3:10 | Blue Bottle via Gota (secondary) |
| Batch brew | SCA Golden Cup | 55 g/L ±10%, 92–96 °C at the grounds, 4–8 min, 2.5–5 cm bed | SCA certified brewer / Moccamaster |
| Batch brew | Scott Rao | 1:16–1:18, coarse, 3–5 cm bed, 6:00–6:30 contact, no bypass under ~4 L | Rao, *Batch Brew Basics* |
| Batch brew | Tim Wendelboe | 32.5 g / 500 g (65 g/L), stir when dripping starts, stir the carafe | timwendelboe.no |

Siphon is treated as **immersion** in After brew and uses the HCG steep band (siphon 375–800 µm); batch brew is **percolation** on the pour-over band (filter machine 300–900 µm). No source splits siphon or batch by roast; Medium / Dark rows follow the other brewers’ cooler, coarser direction.

## 4b. Hario Switch valve patterns

Closed = immersion. Open = V60 percolation. The same 15 g : 250 g card can be four different drinks. Championship and shop scripts we keep:

| Mode | Valve | Source | What it does |
|---|---|---|---|
| **Steep + release** | Closed the whole steep, open to drain | Hoffmann daily driver | Forgiving, more body. Suggested for Dark, heavy/sweet, or naturals that clog. |
| **Closed bloom → open pour** | Closed bloom, then open for the rest | Emi Fukahori, WBrC 2018 champion; MAME shops | Clarity and consistency. Suggested for Light + fruity / bright / juicy / floral. |
| **Super Hybrid** | Closed bloom → open mid pours → closed last (cool 70–80 °C) → open drain | Tetsu Kasuya 2025 Super Hybrid; Bøen / Zhang competition shape | Sweetness and body without a harsh finish. Suggested default for Light without a loud acid goal. |
| **Closed first, open last** | Closed bloom + first pour (~60%), open last pour | Common shop hybrid (the “closed first pour, open last” pattern) | More body than Fukahori, more clarity than a full steep. Suggested for Medium washed. |
| **Double immersion** | Closed pulse, drain, closed pulse, drain | Ryan Wibawa, WBrC 2024 3rd (Switch) | Two short immersions (he used 86 °C then 92 °C). Cleaner than one long steep. Selectable; not the auto pick. |

The UI defaults from roast style + flavor + process (`suggestedSwitchMode`). You can override; the card keeps the pick you tapped.

---

## 4c. Flavor-mapped competition recipes

Same chip pattern as the Switch, only where a published recipe actually claims a cup. We do **not** invent a “blueberry V60.”

### AeroPress (WAC) — temperate water is a real cluster

WAC winners repeatedly drop brew temperature to **keep sweetness and cut bitterness**, then **temper the cup** with cooler bypass or a cooler serve.

| Recipe | Script | Flavor it aims at | Suggest when |
|---|---|---|---|
| **Stanica, WAC 2024** | Inverted, ~96 °C, 18 g / 100 g, dilute | Fruit / acid | Light + fruity / bright / juicy — including juicy + light-sweet |
| **Pop, WAC 2025** | Upright, **84 °C brew**, **70 g bypass at 50 °C** already in the carafe | Sweet / defined | Medium, Dark, or body / deep-sweet |
| **Merikanto, WAC 2021** | Inverted, **80 °C**, 18 g / 200 g, gentle, no bypass | Sweet-sour, low astringency | Light + floral / winey, or light-sweet without a fruit word |
| **van Bunnik, WAC 2019** | Inverted 30 g / 100 g, 40 s, dilute, serve ~60 °C | Acid + sweet together | Selectable; not the auto pick |
| **Wipvasutt, WAC 2023** | 16 g in, **2 g more at 0:45**, press, room-temp then hot bypass | Aroma / Kenya-like | Selectable; not the auto pick |

Pop and Merikanto are the “temperate water” recipes. Lock their published temperatures — do not add the usual +1 °C acid nudge on top of 80–84 °C.

### V60

| Recipe | Script | Flavor |
|---|---|---|
| Hoffmann Ultimate | Bloom, 60% pour, stir | Balanced / daily. Dark or heavy. |
| Kasuya 4:6, **larger** first pour | First 40% then three equal pours | Bright / juicy. Light + acid. |
| Kasuya 4:6, **smaller** first pour (his WBrC 2016 cup) | Same, less water in pour 1 | Honey / sweet. Light-sweet or Medium. |
| Peng WBrC 2025, adapted | 96 °C bloom + mid, **80 °C** last pour | Floral / clean finish. Light + floral. |
| Rao spin | Aggressive bloom spin, two pours, 4:00–4:30 | Even / high extraction. Light + clean. |
| Hedrick double bloom | 45 g, 90 g, fast centre pour, no swirl | Clear on gassy lots. Light Rest still degassing (≤10 days), or winey. |
| Hoffmann Japanese iced | 60% hot onto 40% ice in the server | Flash-chill / bright. Select when you want a cold cup — not fridge cold brew. |

Kasuya’s lever is pour size, not a new dripper. The V60 card temperature (and the fruit-hotter-than-body nudge) stays unless you pick Peng.

### Gassy vs degassed (the pick, not a lock)

Light Rest is still blooming through day 10. Championship no-bloom / turbo cards stay on the chip list; the **suggested** pick dumps gas until the lot is degassed.

| Method | Still blooming (Light ≤10 d, Medium ≤6 d) | Degassed Light + juicy / floral |
|---|---|---|
| V60 | Hedrick (45 s + 45 s bloom when gassy) | 4:6 acid / Peng / Rao |
| Switch | Super Hybrid (60 s closed bloom) | Fukahori (washed acid) or Bull (acid natural) |
| Origami | Medina five pulses | Du (no bloom) |
| Espresso | Blooming | Extractamundo turbo / Adaptive Light |
| OREA | Hsu if the process clogs; else Wölfl | Hsu (natural / floral / winey) or Wölfl |
| Clever | Full steep (or GINA if floral/sweet) | Short steep for washed acid |
| AeroPress | Merikanto if acid / floral / winey | Stanica for fruit (juicy + light-sweet stays Stanica once degassed) |
| Kalita / Chemex / FP | McCarthy / Hoffmann — already bloom or immerse | Same |

Do **not** stack altitude + acid + hard-density finer clicks on a gassy paper or puck bed. Honey and anaerobic clog like a natural.

Skipped as redundant: Domatiotis 2014 and Tøllefsen 2015 (standard V60 pulses), Perger 2012 (same even-extraction school as Rao; needs a sieve at home).

### French press / Clever / cold brew

Fewer championship scripts, still a real fork: Hoffmann settle vs classic 4:00; long vs short Clever steep; fridge ready vs 1:8 concentrate.

### Chemex / Moka / cupping

One cited skeleton each — Hoffmann Chemex, Hoffmann moka, SCA cupping. The card still shows so you can see the credit and clone it. We do not invent a second fork.

---

## 5. Cards in `recommendBrew`

Wanted temperatures are sea-level. Open-kettle methods are then capped (§2). Doses are a single-cup (or Chemex/FP carafe) starting point.

| Method | Light | Medium | Dark |
|---|---|---|---|
| V60 | 15 g · 1:16 · 96 °C · 2:45 · med | 15 g · 1:16.7 · 93 °C · 2:35 · med | 15 g · 1:17 · 90 °C · 2:20 · med |
| Kalita Wave | 15 g · 1:16 · 96 °C · 3:00 · med | 15 g · 1:16.5 · 93 °C · 2:50 · med | 15 g · 1:17 · 90 °C · 2:35 · med-coarse |
| Origami | 15.5 g · 1:16 · **91 °C** · 2:40 · med (Medina) | 15 g · 1:16 · 93 °C · 2:35 · med | 15 g · 1:16.5 · 90 °C · 2:25 · med |
| Chemex | 30 g · 1:16.7 · 96 °C · 4:10 · med | same, 93 °C | 30 g · 1:17 · 90 °C · 3:50 · med-coarse |
| Switch | 15 g · 1:16.7 · 96 °C · 2:45 · med | 15 g · 1:16.7 · 93 °C · 2:45 · med-coarse | 15 g · 1:16.7 · 90 °C · 2:30 · med-coarse |
| Clever | 15 g · 1:16.7 · 96 °C · 3:00 · med | 15 g · 1:16.7 · 93 °C · 3:00 · med-coarse | 15 g · 1:17 · 90 °C · 2:45 · med-coarse |
| AeroPress | 15 g · 1:6 brew + 1:5 bypass · 96 °C · inverted | 15 g · 1:14.7 · 93 °C · upright | 15 g · 1:15.3 · 85 °C · upright |
| French press | 30 g · 1:16.7 · 96 °C · 9:00 (Hoffmann settle) | same, 93 °C | 30 g · 1:16.7 · 90 °C · 4:00 (no long settle) |
| OREA | 17 g · 1:15.9 · **93 °C** · 2:20 · med (Wölfl) | 16 g · 1:16 · 93 °C · 2:45 · med | 16 g · 1:16.5 · 90 °C · 2:35 · med |
| Cold brew | 60 g · 1:13.3 · fridge · **16 h** · med | 60 g · 1:13.3 · 14 h · med-coarse | 60 g · 1:13.3 · 12 h · med-coarse |
| Moka | 18 g · 1:10 fill · 96 °C · ~1:15 to blonde · med-fine | 18 g · 1:9 · 93 °C | 18 g · 1:8 · 90 °C · fine |
| Espresso | 18 g · 1:2.3 · 93 °C group · 28 s | 18 g · 1:2 · 92 °C · 27 s | 18 g · 1:2 · 90 °C · 25 s |
| Cupping | 8.25 g · 1:18.2 · **93 °C SCA** · 4:00 · med-coarse (all styles) | same | same |

Steps are in `buildSteps`. They scale bloom and pour weights with the dose.

---

## 6. Extrapolation from the roast (honest, small)

There is **no** published “Castillo + Light Sweet + L1.6 → this V60 pour.” Nudges are craft, signed the same way as the roast model, and shown in the Why copy.

| Input | Nudge |
|---|---|
| Flavors `fruity` / `bright` / `juicy` / `floral` / `winey` | +1 °C wanted (then cap); one grind step finer **unless still blooming on paper**; pour-over −10 s |
| Flavors `body` / `deepSweet` | −2 °C; one step coarser; +15 s |
| Hard density or small seed | one step finer **unless still blooming on paper** |
| Soft density or large seed | one step coarser |
| Natural / honey / anaerobic | one step coarser on paper; does not stack on the gassy coarsen |
| Rest, day 0–2 | still degassing; 3× bloom, 45–60 s; one step coarser if the bed domes |
| Rest Light, day 3–10 | **still good, still blooming**. Defaults dump gas — see the matrix below. Paper / puck beds do **not** grind finer for altitude / acid / density while gassy. Altitude only grinds finer when the kettle is **under 92 °C**, not at 2 000 m. Net grind shift is capped at ±2 steps. Overriding to Bull / Du / turbo / short Clever adds a warning |
| Rest Light, day 11–21 | still good; bloom can shorten toward 2× |
| Rest Light, day 22–35 | aging — faster drawdown, click finer if it races; freeze leftover |
| Rest Light, day 36+ | fading. Medium / dark windows are shorter (good through ~16 / ~10) |
| RTD, day 1–3 | planned window |
| RTD, day 4+ | warn: front-loaded flavour is usually gone |

Do **not** recommend a fresher bag at day 10. Rao: air-roaster coffee often wants 1–4 weeks. Filter “acceptable” is commonly cited through ~35 days. GCC: Nano Rest needs *more* rest than drum, not less.

### Dose and ratio (user-editable)

Ratio is **strength**. Grind is **extraction** (and, on a percolation bed, flow). Liang 2021: at immersion equilibrium, PE ~21% regardless of ratio — ratio then only sets TDS.

| Change | Water / steps | Grind (pour-over, batch, espresso, moka) | Time |
|---|---|---|---|
| Bigger dose, same ratio | water = dose × ratio; bloom 2–3× dose | deeper bed → **coarser** (clicks move with bed; the grind word jumps ~1 step at 1.45× card dose) so it does not stall | pour-over scales ~dose^0.4 |
| Smaller dose | same | shallower bed → **finer** (≤0.7×) | shorter |
| Tighter ratio (e.g. 1:16 → 1:14) | less water | **finer** — less solvent, keep PE | same target |
| Looser ratio | more water | **coarser** — more solvent | same target |
| Switch / Clever | water follows ratio | drain is a paper bed → **same coarsen / fine as pour-over** | card time |
| Immersion / cupping / cold brew / AeroPress | water follows ratio | **no grind shift** from dose/ratio (Liang: equilibrium PE) | card time (hours for cold brew) |

The card dose/ratio are the method default. Editing them recomputes every pour weight in the steps.

A `.kpro` import reads Kaffe `profile_description` (origin · variety · process · metres · brew · style, `Flavor:`, `Cup: Rest|RTD`) and `recommended_level`. Other designers still yield style from level and brew from the short name (`F-` / `E-` / `C-`).

---

## 7. Rest vs RTD on the cup

Same *intent* as the roast model ([ROAST-MODEL.md](ROAST-MODEL.md)), but the **drinkable window is longer than KL’s 3–5 day peak label** — especially Light on a Nano.

| | Rest | RTD |
|---|---|---|
| Designed for | Degassing in the bag | Drink **1–3 days** |
| Brew default day | 4 | 2 |
| Light still good | Through ~**21 days**; day 10 is normal | Front-loaded; usually hollow after day 4 |
| Bloom | Long (3×, 45–60 s) while it still foams — often through day 10 on Light | Short; RTD already dumped CO₂ in the roast |

KL Rest 3–5 days is when the cup *starts* to settle, not when it dies. Official: [Rest](https://kaffelogicjp.com/en/pages/rest), [RTD](https://kaffelogicjp.com/en/pages/kl-rtd). Fluid-bed: [Green Coffee Collective Nano 7 guide](https://greencoffeecollective.com/blogs/learn/kaffelogic-nano-7-guide). Air-roaster rest: [Rao, *Resting roasts*](https://www.scottrao.com/blog/restingbeans).

---

## 7b. After brew: what the extraction is computed on

$$
\mathrm{PE} = \frac{\mathrm{TDS}\times m}{\mathrm{dose}}
$$

$m$ depends on the brewer (Liang et al. 2021 measured **2.48 ± 0.19 g/g** retained in a drained bed; Barista Hustle):

| Basis | Methods | $m$ |
|---|---|---|
| Immersion | French press, Clever, Switch steeps, AeroPress, cupping, cold brew, siphon | **all the water** (+ bypass). The liquid left in the grounds is as strong as the cup, so the weighed cup is not asked for. |
| Percolation | V60, Kalita, Origami, Chemex, OREA, batch brew, moka, Switch open-pour | the drained cup — default **water − 2 g × dose** (+ bypass). Weigh it if you can. |
| Shot | Espresso | the weighed shot (+ dilution for Filter-on-espresso). |

The chart’s ratio diagonals are labelled by the **poured** ratio ((water + bypass) ÷ dose) and drawn on the same basis, so a default reading sits on its own line. Strength box: **SCA** 1.15–1.35% TDS or **European (ECBC)** 1.20–1.45%, both 18–22% PE. Rao’s spin V60 (published 22–24.5%) and the turbo shot get their own extraction window so the app does not call its own recipe “over”.

Measure at room temperature, zero the meter with your brew water, filter espresso samples. Brix × 0.85 is an approximation (independent tests put the factor ~0.83–0.90 across strengths).

Espresso rests longer than filter (Light: gassy to ~day 14, good to ~30). Pressure pushes CO₂ through the puck; the day counts are café practice, not a paper.

**Water.** SCA’s standard targets ~150 mg/L TDS, ~68 mg/L calcium hardness and **~40 mg/L alkalinity**. High-alkalinity tap water buffers acids and flattens Light / acid cups — the card warns. The Kitchen water row is by effect (recipe, soft, hard), not a lab reading.

## 8. Limits

- Preview. Taste is last.
- **Light** competition calibrates Light filter / espresso only. Medium is SCA + compulsory-coffee adjacent. **Dark is craft.**
- WBrC 2024–25 winners used OREA / SOLO, not a V60. We keep a V60 card because people own one.
- No water chemistry (ppm, Ca/Mg). Medina specified ~65 ppm; we do not.
- Grind stays a five-step word. Kitchen can search a grinder (Honest Coffee Guide charts, ~210 mills; one-letter typos and squashed model codes still match) and we print **starting clicks**. Zero is burrs touching. Each HCG band is already that method — **medium sits near the middle of the V60 / steep / espresso window**, not the fine edge. Light V60 starts **medium**; juicy steps once to medium-fine. On pour-over / Switch / Clever / espresso / moka the click number also follows **dose vs this card** (full immersion does not — Liang). 1Zpresso / Timemore ESP read as rotation.number.tick. Not a lock — burr wear and bean density move the number. On espresso the picker lists only espresso-capable mills: filter-only models (Timemore C2 / C3 / C3S non-ESP, Baratza Encore, Fellow Ode, 1Zpresso ZP6 / JX, Hario Mini Mill…) are hidden even though HCG extrapolates an espresso band for them. Filter methods list every mill. Cera+ CGE01 has no HCG chart; its clicks are an estimate from the maker’s 20 µm step (HCG micron ranges ÷ 20).
- After brew takes a **measured** Brix or TDS. We do not invent a TDS target.
- Flavor / variety nudges are **not** a paper. They will be wrong for some lots.
- Moka and espresso are different machines. Moka is not a cheap espresso.

---

## References

### Academic (extraction, temperature, cupping)

1. Lockhart, E.E. / SCA. *The Coffee Brewing Handbook* and Golden Cup: ~55 g/L, 18–22% PE, 90–96 °C at the grounds. SCA certified brewer spec: 92 °C within the first minute, never exceed 96 °C. [SCA certified home brewer](https://sca.coffee/certified-home-brewer)
2. Batali, M.E., Ristenpart, W.D. & Guinard, J.-X. (2020). Brew temperature, at fixed brew strength and extraction, has little impact on the sensory profile of drip brew coffee. *Scientific Reports*, 10, 16450. 87 / 90 / 93 °C at matched TDS/PE. [https://doi.org/10.1038/s41598-020-73341-4](https://doi.org/10.1038/s41598-020-73341-4)
3. Frost, S.C., Ristenpart, W.D. & Guinard, J.-X. (2020). Effects of brew strength, brew yield, and roast on the sensory quality of drip brew coffee. *Journal of Food Science*. TDS/PE dominate; roast still moves attributes. [https://doi.org/10.1111/1750-3841.15326](https://doi.org/10.1111/1750-3841.15326)
4. Liang, J., Chan, K.C. & Ristenpart, W.D. (2021). An equilibrium desorption model for the strength and extraction yield of full immersion brewed coffee. *Scientific Reports*, 11, 6904. Equilibrium PE ~21%; $K$ insensitive to roast, grind, and 80–99 °C; ratio sets TDS. [https://doi.org/10.1038/s41598-021-85787-1](https://doi.org/10.1038/s41598-021-85787-1) · [SCA write-up](https://sca.coffee/sca-news/25/issue-17/how-strong-is-the-coffee-youre-cupping-new-model-captures-the-equilibrium-extraction-nature-of-full-immersion-brewing-992ht)
5. Specialty Coffee Association. Cupping protocol: 8.25 g / 150 mL, 93 °C, 4 min, break and skim. [SCA cupping standards](https://sca.coffee/research/coffee-standards)

### Altitude

6. Boiling point vs elevation, barometric table (e.g. 1 800 m → 94.0 °C). [Deleze table](https://www.deleze.name/marcel/en/physique/TemperaturesEbullition/table_temperature-en.html). ISA + Antoine fit $T_{\mathrm{boil}}\approx 100-h/300$.
7. Perfect Daily Grind (2018). How elevation affects brew temperature. Tamas Erdélyi: at 1 524 m you have lost ~5.5 °C; at Bogotá / Cuzco grind finer and/or use pressure. [https://perfectdailygrind.com/2018/10/how-does-elevation-affect-your-ideal-coffee-brew-temperature/](https://perfectdailygrind.com/2018/10/how-does-elevation-affect-your-ideal-coffee-brew-temperature/)

### Competition

8. Medina, C. (2023). World Brewers Cup. Origami, ~16 g / 250 g, 91 °C, five 50 g pulses. Recap: [Slow Pour Supply](https://www.slowpoursupply.co/blogs/brew-recipes/recipe-recap-carlos-medina-s-representing-chile-world-brewers-cup-champion-recipe) · [Cup Timer](https://www.cup-timer.com/en/recipe/carlos-medina-wbrc-2023)
9. Wölfl, M. (2024). World Brewers Cup. OREA V4, 17 g / 270 g, 93 °C, ~2:20. [Cup Timer](https://www.cup-timer.com/en/recipe/martin-wolfl-wbrc-2024) · [OREA V4 guides](https://www.orea.uk/guides-v4)
10. Peng, G. (2025). World Brewers Cup. SOLO, 15 g / 210 g, 96 °C then 80 °C, 1:45. [Slow Pour Supply](https://www.slowpoursupply.co/blogs/journal/2025-world-brewers-cup-champion-george-pengs-solo-dripper-recipe)
11. Stanica, G. (2024). World AeroPress Championship. Inverted, 18 g / 100 g at 96 °C, dilute. [WAC recipe](https://worldaeropresschampionship.com/pages/1st-george-stanica-romania-2024)
12. Pop, N. (2025). World AeroPress Championship. Upright, 18 g / 100 g at 84 °C + 70 g bypass at 50 °C. [WAC recipe](https://worldaeropresschampionship.com/pages/1st-nemo-pop-australia-2025)
12b. Merikanto, T. (2021). World AeroPress Championship. Inverted, 18 g / 200 g at **80 °C**, gentle agitation. [WAC / AeroPress](https://aeropress.com/blogs/blog/wac)
12c. van Bunnik, W. (2019). World AeroPress Championship. Inverted 30 g / 100 g, ~40 s, dilute, serve ~60 °C. [WAC recipes](https://worldaeropresschampionship.com/pages/recipes)
12d. Kasuya, T. (2016). World Brewers Cup. 4:6 method: first 40% sets acid vs sweet (more water in pour 1 = more acidity). [Kurasu write-up](https://kurasu.kyoto/blogs/kurasu-journal/2016-world-brewers-cup-champion-tetsu-kasuya)
12e. Wang, C. (2017). World Brewers Cup. V60, 15 g / 250 g, 92 °C, one centre pour, ~2:00. [Cup Timer](https://www.cup-timer.com/en/recipe/chad-wang-wbrc-2017)
12f. McCarthy, J. (2013). World Brewers Cup. Kalita Wave, 24 g / 380 g, column / low agitation, ~3:30. [Sprudge](https://sprudge.com/meet-the-worlds-best-brewer-james-mccarthy-brewers-cup-champ-38672.html)
12g. Hsu, S. Y. (2022). World Brewers Cup. OREA, 14 g / 200 g, first pour 70 °C then 95 °C. [Cup Timer](https://www.cup-timer.com/en/recipe/shih-yuan-hsu-wbrc-2022)
12h. Du, J. N. (2019). World Brewers Cup. Origami, 16 g / 240 g, 94 °C, three pours, no bloom, ~1:46. [Gota](https://gota.cafe/en/recipes/origami-m/origami-m-du)
12i. Bull, J. (2025). US Brewers Cup. Hario Switch, percolation first then steep. [Barista Magazine](https://www.baristamagazine.com/justin-bull-rebounds-to-win-u-s-brewers-cup/)
12j. Wipvasutt, T. (2023). World AeroPress Championship. 16 g + 2 g mid-brew, 89 °C, split bypass. [WAC recipe](https://worldaeropresschampionship.com/pages/1st-tay-wipvasutt-thailand-2023)
13. World Barista Championship 2024–25 open-service espresso recipes (cluster: ~1:2–1:2.5, 90–94 °C). World Coffee Events / competitor disclosures.
13b. SproFiler community profiles for Gaggiuino (Adaptive Light/Dark, Blooming espresso, Extractamundo Dos!, Londinium, Leva, Low High Low, Stock 9 Bar, Filter 2.1). [sprofiler.io/community-profiles](https://sprofiler.io/community-profiles)

### Community (Hoffmann and SCA-shaped)

14. Hoffmann, J. *The Ultimate V60 Technique*. Bloom, 60% pour, stir. [YouTube](https://www.youtube.com/watch?v=AI4ynXzkSQo)
14b. Rao, S. V60: bloom spin, two pours, 20 g / 330 g, ~97 °C, 4:00–4:30. [Hario UK](https://www.hario.co.uk/blogs/hario-ambassadors/hario-v60-recipe-interview-with-hario-ambassador-scott-rao)
14c. Hedrick, L. Double bloom then one fast centre pour (gassy lots). [YouTube](https://www.youtube.com/watch?v=PNFVCmxBjQQ)
14d. Hoffmann, J. Japanese iced filter: 65 g/L, 60% hot / 40% ice in the server. [YouTube](https://www.youtube.com/watch?v=PApBycDrPo0)
15. Hoffmann, J. Chemex as a V60 adaptation, 30 g / 500 g, ~4:10. Write-up: [timer.coffee](https://www.timer.coffee/recipes/chemex/james-hoffmann-chemex-recipe/)
16. Hoffmann, J. Hario Switch daily driver, 15 g / 250 g, ~2:00 steep, open ~2:15. [YouTube](https://www.youtube.com/watch?v=QjIvN8mlK9Y)
16b. Fukahori, E. Switch shop recipe (MAME): closed bloom, then open centre pour. Her WBrC 2018 routine was different — a GINA at 17 g / 220 g, 80 / 95 / 80 °C (the Clever card here). Recap: [European Coffee Trip](https://europeancoffeetrip.com/emi-fukahori-world-brewers-cup-2018-champion/)
16c. Kasuya, T. Super Hybrid 2025: 20 g / 300 g, closed bloom, open mid pours, closed cool last 70–80 °C, open ~3:30. [YouTube / 4:6 Switch notes](https://www.youtube.com/results?search_query=tetsu+kasuya+super+hybrid+2025)
16d. Wibawa, R. Double immersion on a Switch, 15 g / 220 g, 86 °C then 92 °C. WBrC 2024 3rd. Hario Asia / competitor recaps.
17. Hoffmann, J. *The Ultimate French Press Technique*, 30 g / 500 g, break crust, settle, plunge to the surface. [YouTube](https://www.youtube.com/watch?v=st571DYYTR8)
18. Hoffmann, J. Moka: hot fill to the valve, no tamp, off at first blonde.
18b. Hoffmann, J. Cold brew: ~75 g / 1 L, fridge ~12 h, finer than “boulders.” [Facebook/recipe notes](https://www.facebook.com/jameshoffmanncoffee/videos/everything-i-learned-about-cold-brew-coffeehere-is-the-recipe-if-youd-like-to-gi/2009932969795608/) · Counter Culture 1:8 concentrate. [CCC guide](https://counterculturecoffee.com/blogs/counter-culture-coffee/guide-to-cold-brew)

### Rest / RTD (roast side, used for drink day)

19. Kaffelogic. Rest (peak 3–5 days). [https://kaffelogicjp.com/en/pages/rest](https://kaffelogicjp.com/en/pages/rest) · RTD (drink 1–3 days). [https://kaffelogicjp.com/en/pages/kl-rtd](https://kaffelogicjp.com/en/pages/kl-rtd)
20. Green Coffee Collective. *Kaffelogic Nano 7* — community advice that Nano roasts want **more** rest than drum. Treat as craft: Wang & Lim (2014, *Food Res. Int.*) found fast, hot roasts degas *faster* at equal roast degree. [https://greencoffeecollective.com/blogs/learn/kaffelogic-nano-7-guide](https://greencoffeecollective.com/blogs/learn/kaffelogic-nano-7-guide)
21. Rao, S. *Resting roasts: is fresher better?* Air / fluid-bed: often **1–4 weeks**, not 3–5 days. [https://www.scottrao.com/blog/restingbeans](https://www.scottrao.com/blog/restingbeans)
