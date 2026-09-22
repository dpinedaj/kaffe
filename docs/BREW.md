# Brew model (Preview)

Kaffe’s Brew page is a **starting card**, not a lock. It does not read the Bézier, does not invent TDS/PE without a refractometer, and does not treat a World Brewers Cup routine as law for a home V60 at 1 800 m.

The card is built from three corpora, in this order:

1. **Academic** — what actually moves the cup (TDS, PE, ratio, time). Temperature is a rate knob.
2. **Competition** — published winning recipes, almost all **Light** filter or espresso.
3. **Community** — Hoffmann and SCA-shaped daily skeletons where competition is silent.

Implementation: `src/lib/brew.ts` (`recommendBrew`, `snapshotFromKpro`, `boilingPointC`). Farm altitude stays on Generate. **Kitchen** altitude is a separate, persisted input.

---

## 1. What the literature actually says

Lockhart’s brewing control chart, still the SCA Golden Cup spine, defines a cup by **strength** (TDS) and **extraction** (PE), not by dripper brand. The usual certification band is about **55 g/L** (~1:18) and **18–22%** PE, with water at the grounds **90–96 °C**. SCA-certified auto drippers must hit **92 °C in the first minute**, hold at least that, and **never exceed 96 °C**.

UC Davis (Batali, Frost, Guinard et al., 2020, drip): at **fixed TDS and PE**, 87 vs 90 vs 93 °C barely moved descriptive sensory or preference. The profile is the extraction, not the thermometer.

UC Davis (Liang et al., 2021, full immersion): equilibrium PE is about **21%** and is **insensitive** to roast level, grind, brew ratio, and temperature from **80–99 °C**. Temperature changes **how fast** you get there. Ratio sets TDS. That is why Switch / Clever / French press can give back time when the kettle is capped.

So the Brew page’s job is: pick a method skeleton → set a sea-level **wanted** temperature → **cap** it at local boil → spend the deficit on grind, time, and (if large) a slightly tighter ratio.

---

## 2. Kitchen altitude (not farm metres)

Open-kettle water cannot go past the local boiling point. An engineering fit for inhabited elevations:

$$
T_{\mathrm{boil}}\approx 100-\frac{h}{285}\quad(^\circ\mathrm{C})
$$

about −1 °C per 285 m. Barometric tables agree (1 500 m ≈ 95.0 °C, 1 800 m ≈ 94.0 °C, 2 600 m ≈ 91.4 °C).

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

Deficit $\Delta T=\max(0,\,T_{\mathrm{wanted}}-T_{\mathrm{kettle}})$. Per ~3 °C short: pour-over / batch **+20 s** and up to two grind steps finer; immersion / hybrid **+40 s**. If $\Delta T\ge 5$ °C, tighten ratio by ~7% (floor 1:13 filter, 1:7 moka). Pour at a **rolling boil** when you are against the ceiling. Do not print 96 °C when boil is 94.

**Espresso is pressurized.** A 93 °C group is still reachable at altitude. Only the fill water on a moka is kettle-capped.

Community practice at elevation (Erdélyi / Perfect Daily Grind): pour at boil, grind finer, stay longer, and/or dose slightly higher. Bogotá / Cuzco boil is too cool for an unadjusted sea-level Light card.

`intent.altitudeM` is **farm** metres (density / heat). Brew uses a device-local kitchen setting. “Same as this lot” is optional, never the default.

---

## 3. Competition cluster (Light only)

WBrC / WBC / WAC recipes are written for **one coffee, one roast, one room**. Kaffe uses them to **calibrate the Light row**, not to clone a stage routine.

### World Brewers Cup

Compulsory competition coffee sits roughly **Agtron 60–80** (Medium). Open-service winners are almost always **Light**.

| Year | Champion | Brewer | Dose / water | Ratio | Temp | Time | Notes |
|---|---|---|---|---|---|---|---|
| 2023 | Carlos Medina (CL) | Origami | 15.5–16 g / 250 g | 1:16 | 91 °C | ~2:40–3:00 | Five 50 g pulses, 30 s apart |
| 2024 | Martin Wölfl (AT) | OREA V4 | 17 g / 270 g | 1:15.9 | 93 °C | 2:20–2:25 | ~490 µm, Melodrip, four pours |
| 2025 | George Peng | SOLO | 15 g / 210 g | 1:14 | 96 °C then 80 °C | 1:45 | Split-temp; serve ~50–65 °C |

Cluster used in code: Light filter **1:14–1:16**, **91–96 °C**, **~1:45–3:00**. Recent winners are **not** on a V60. The V60 card still uses that cluster because the physics (ratio, temp, time) transfers; the pour pattern does not have to.

**Dark has no WBrC corpus.** Those rows are craft.

### World AeroPress Championship

| Year | Champion | Position | Dose | Brew water | Temp | Then |
|---|---|---|---|---|---|---|
| 2024 | George Stanica (RO) | Inverted | 18 g | 100 g (50+50) | 96 °C | Press ~76–79 g, dilute to ~150–165 g |
| 2025 | Némo Pop (AU) | Upright + flow cap | 18 g | 100 g | 84 °C | 70 g bypass at 50 °C |

Light AeroPress in Kaffe is a **scaled Stanica**: concentrate + bypass. Medium/dark go upright and cooler (Pop’s direction, daily grind).

### World Barista Championship

Light espresso cluster: about **1:2–1:2.5**, **90–94 °C** group, **25–30 s**. Not kettle-capped.

---

## 4. Community skeletons

Used where the academic paper does not name a dripper and the competition winner used something you may not own.

| Method | Skeleton | Numbers we keep |
|---|---|---|
| V60 | Hoffmann *Ultimate V60 Technique* | 60 g/L idea; bloom ~2×; 60% by ~1:15; stir N–S / E–W; drawdown ~2:30–3:00 |
| Chemex | Hoffmann V60 adaptation | 30 g : 500 g (1:16.7), 95–100 °C, ~4:10; 3-ply to the spout; rinse hard |
| Hario Switch | Hoffmann daily driver | 15 g : 250 g; bloom; fill; steep ~2:00; stir; open ~2:15 |
| French press | Hoffmann *Ultimate French Press* | 30 g : 500 g; medium (not boulders); break/skim at 4:00; settle; plunge **to the surface** |
| Clever | Same hybrid idea as Switch | Fill, steep ~2:00, set on the cup to drain |
| Kalita Wave | Café / older WBrC flat-bottom | Centre pulses, flat bed, slightly longer than a V60 |
| Moccamaster | SCA certified home brewer | 60 g/L, medium, one slurry swirl, carafe off the plate |
| Moka | Hoffmann moka | Hot fill to the valve, no tamp, medium heat, **off at first blonde** |
| Cupping | SCA protocol | 8.25 g / 150 g, 93 °C, 4 min, break and skim |

Hoffmann often says “off boil” for Light. That is a **sea-level** instruction. At altitude it becomes “rolling boil.”

---

## 5. Cards in `recommendBrew`

Wanted temperatures are sea-level. Open-kettle methods are then capped (§2). Doses are a single-cup (or Chemex/FP carafe) starting point.

| Method | Light | Medium | Dark |
|---|---|---|---|
| V60 | 15 g · 1:16 · 96 °C · 2:45 · med-fine | 15 g · 1:16.7 · 93 °C · 2:35 · med | 15 g · 1:17 · 90 °C · 2:20 · med |
| Kalita Wave | 15 g · 1:16 · 96 °C · 3:00 · med | 15 g · 1:16.5 · 93 °C · 2:50 · med | 15 g · 1:17 · 90 °C · 2:35 · med-coarse |
| Origami | 15.5 g · 1:16 · **91 °C** · 2:40 · med-fine (Medina) | 15 g · 1:16 · 93 °C · 2:35 · med | 15 g · 1:16.5 · 90 °C · 2:25 · med |
| Chemex | 30 g · 1:16.7 · 96 °C · 4:10 · med | same, 93 °C | 30 g · 1:17 · 90 °C · 3:50 · med-coarse |
| Switch | 15 g · 1:16.7 · 96 °C · 2:45 · med | 15 g · 1:16.7 · 93 °C · 2:45 · med-coarse | 15 g · 1:16.7 · 90 °C · 2:30 · med-coarse |
| Clever | 15 g · 1:16.7 · 96 °C · 3:00 · med | 15 g · 1:16.7 · 93 °C · 3:00 · med-coarse | 15 g · 1:17 · 90 °C · 2:45 · med-coarse |
| AeroPress | 15 g · 1:6 brew + 1:5 bypass · 96 °C · inverted | 15 g · 1:14.7 · 93 °C · upright | 15 g · 1:15.3 · 85 °C · upright |
| French press | 30 g · 1:16.7 · 96 °C · 9:00 (Hoffmann settle) | same, 93 °C | 30 g · 1:16.7 · 90 °C · 4:00 (no long settle) |
| Moccamaster | 30 g · 1:16.7 · 96 °C · 6:00 · med | same, 93 °C | 30 g · 1:17 · 90 °C · 5:30 · med-coarse |
| Moka | 18 g · 1:10 fill · 96 °C · ~1:15 to blonde · med-fine | 18 g · 1:9 · 93 °C | 18 g · 1:8 · 90 °C · fine |
| Espresso | 18 g · 1:2.3 · 93 °C group · 28 s | 18 g · 1:2 · 92 °C · 27 s | 18 g · 1:2 · 90 °C · 25 s |
| Cupping | 8.25 g · 1:18.2 · **93 °C SCA** · 4:00 · med-coarse (all styles) | same | same |

Steps are in `buildSteps`. They scale bloom and pour weights with the dose.

---

## 6. Extrapolation from the roast (honest, small)

There is **no** published “Castillo + Light Sweet + L1.6 → this V60 pour.” Nudges are craft, signed the same way as the roast model, and shown in the Why copy.

| Input | Nudge |
|---|---|
| Flavors `fruity` / `bright` / `juicy` / `floral` / `winey` | +1 °C wanted (then cap); one grind step finer; pour-over −10 s |
| Flavors `body` / `deepSweet` | −2 °C; one step coarser; +15 s |
| Hard density or small seed | one step finer |
| Soft density or large seed | one step coarser |
| Natural / honey-clog risk | one step coarser on paper beds |
| Rest, day 0–2 | still degassing; 3× bloom, 45–60 s; one step coarser if the bed domes |
| Rest Light, day 3–10 | **still good, still blooming** — KL 3–5 days is the *start* of the window. Fluid-bed CO₂ hangs around; a long bloom at day 10 is normal |
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
| Bigger dose, same ratio | water = dose × ratio; bloom 2–3× dose | deeper bed → **coarser** (~1 step from 1.45× card dose) so it does not stall | scales ~dose^0.4 |
| Smaller dose | same | shallower bed → **finer** (≤0.7×) | shorter |
| Tighter ratio (e.g. 1:16 → 1:14) | less water | **finer** — less solvent, keep PE | same target |
| Looser ratio | more water | **coarser** — more solvent | same target |
| Immersion / Switch / Clever / cupping | water follows ratio | **no grind shift** from dose/ratio | card time |

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

## 8. Limits

- Preview. Taste is last.
- **Light** competition calibrates Light filter / espresso only. Medium is SCA + compulsory-coffee adjacent. **Dark is craft.**
- WBrC 2024–25 winners used OREA / SOLO, not a V60. We keep a V60 card because people own one.
- No water chemistry (ppm, Ca/Mg). Medina specified ~65 ppm; we do not.
- No grind microns — only a five-step qualitative scale.
- No refractometer loop. We do not print a TDS target as if it were measured.
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

6. Boiling point vs elevation, barometric table (e.g. 1 800 m → 94.0 °C). [Deleze table](https://www.deleze.name/marcel/en/physique/TemperaturesEbullition/table_temperature-en.html). Engineering fit $T_{\mathrm{boil}}\approx 100-h/285$.
7. Perfect Daily Grind (2018). How elevation affects brew temperature. Tamas Erdélyi: at 1 524 m you have lost ~5.5 °C; at Bogotá / Cuzco grind finer and/or use pressure. [https://perfectdailygrind.com/2018/10/how-does-elevation-affect-your-ideal-coffee-brew-temperature/](https://perfectdailygrind.com/2018/10/how-does-elevation-affect-your-ideal-coffee-brew-temperature/)

### Competition

8. Medina, C. (2023). World Brewers Cup. Origami, ~16 g / 250 g, 91 °C, five 50 g pulses. Recap: [Slow Pour Supply](https://www.slowpoursupply.co/blogs/brew-recipes/recipe-recap-carlos-medina-s-representing-chile-world-brewers-cup-champion-recipe) · [Cup Timer](https://www.cup-timer.com/en/recipe/carlos-medina-wbrc-2023)
9. Wölfl, M. (2024). World Brewers Cup. OREA V4, 17 g / 270 g, 93 °C, ~2:20. [Cup Timer](https://www.cup-timer.com/en/recipe/martin-wolfl-wbrc-2024)
10. Peng, G. (2025). World Brewers Cup. SOLO, 15 g / 210 g, 96 °C then 80 °C, 1:45. [Slow Pour Supply](https://www.slowpoursupply.co/blogs/journal/2025-world-brewers-cup-champion-george-pengs-solo-dripper-recipe)
11. Stanica, G. (2024). World AeroPress Championship. Inverted, 18 g / 100 g at 96 °C, dilute. [WAC recipe](https://worldaeropresschampionship.com/pages/1st-george-stanica-romania-2024)
12. Pop, N. (2025). World AeroPress Championship. Upright, 18 g / 100 g at 84 °C + 70 g bypass at 50 °C. [WAC recipe](https://worldaeropresschampionship.com/pages/1st-nemo-pop-australia-2025)
13. World Barista Championship 2024–25 open-service espresso recipes (cluster: ~1:2–1:2.5, 90–94 °C). World Coffee Events / competitor disclosures.

### Community (Hoffmann and SCA-shaped)

14. Hoffmann, J. *The Ultimate V60 Technique*. Bloom, 60% pour, stir. [YouTube](https://www.youtube.com/watch?v=AI4ynXzkSQo)
15. Hoffmann, J. Chemex as a V60 adaptation, 30 g / 500 g, ~4:10. Write-up: [timer.coffee](https://www.timer.coffee/recipes/chemex/james-hoffmann-chemex-recipe/)
16. Hoffmann, J. Hario Switch daily driver, 15 g / 250 g, ~2:00 steep, open ~2:15. [YouTube](https://www.youtube.com/watch?v=QjIvN8mlK9Y)
17. Hoffmann, J. *The Ultimate French Press Technique*, 30 g / 500 g, break crust, settle, plunge to the surface. [YouTube](https://www.youtube.com/watch?v=st571DYYTR8)
18. Hoffmann, J. Moka: hot fill to the valve, no tamp, off at first blonde.

### Rest / RTD (roast side, used for drink day)

19. Kaffelogic. Rest (peak 3–5 days). [https://kaffelogicjp.com/en/pages/rest](https://kaffelogicjp.com/en/pages/rest) · RTD (drink 1–3 days). [https://kaffelogicjp.com/en/pages/kl-rtd](https://kaffelogicjp.com/en/pages/kl-rtd)
20. Green Coffee Collective. *Kaffelogic Nano 7* — convection leaves cell structure more intact; Rest needs **more** days than drum, not fewer. [https://greencoffeecollective.com/blogs/learn/kaffelogic-nano-7-guide](https://greencoffeecollective.com/blogs/learn/kaffelogic-nano-7-guide)
21. Rao, S. *Resting roasts: is fresher better?* Air / fluid-bed: often **1–4 weeks**, not 3–5 days. [https://www.scottrao.com/blog/restingbeans](https://www.scottrao.com/blog/restingbeans)
