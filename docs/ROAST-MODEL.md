# Roast model

Kaffe does not pick a 6 / 9 / 11 minute bucket and then stretch a curve to fit. It estimates **dehydration slope**, **Maillard slope**, **first-crack temperature and time**, and **development**, then labels the result Nordic / classic / slow from total time.

This is a **reduced-form** model for Nano 7 Bézier profiles. It keeps the same *dependencies* as the literature (wetter and denser seed slow the front; faster Maillard reads brighter and thinner; DTR near 20%). It does **not** integrate Hernández’s moisture ODE inside the bean, and the numerical coefficients are calibrated to Kaffelogic fluid-bed behaviour, not to a drum.

Implementation: `src/lib/generate.ts` (`durationPlan`, `suggestedZones`, `densityFromAltitude`, `FLAVOR_DELTA`).

---

## 1. Phases

| Phase | Probe window (typical) | What changes |
|---|---|---|
| Charge / drying | ~25–50 °C → yellow (~150 °C) | Evaporative cooling. The Nano charges **room-temperature** beans into a ~250 °C chamber (`preheat_nominal_temperature`). The design curve’s first handle is a PID setpoint, not a drum-style charge temp. |
| Maillard | ~150 °C → first crack | Reducing sugars + amino acids → melanoidins, aroma, perceived sweetness/body. |
| First crack | ~196–205 °C internal; ~203–210 °C on a naked KL probe | Steam ruptures the cell wall. Moisture dump is endothermic; then the bean can go exothermic. |
| Development | crack → drop | Roast degree. DTR is (time after first crack) / (total roast time). |

Yellow at ~150 °C is the usual colour-change / start-of-Maillard marker in roasting practice (Rao). First-crack temperatures follow bean-core measurements in the 196–205 °C band; Kaffelogic’s exposed probe reads several degrees hotter.

---

## 2. Moisture kinetics (why drying slope depends on moisture and density)

Schwartzberg (2002), as used by Hernández et al. (*J. Food Eng.* 78:1141–1148, 2007), gives moisture loss as Arrhenius diffusion:

$$
\frac{dX}{dt} = -4.32\times 10^{9}\,\frac{X^{2}}{d_{p}^{2}}\exp\left(\frac{-9889}{T_{b}+273.15}\right)
$$

$X$ is moisture (kg water / kg dry matter), $d_{p}$ effective diameter, $T_{b}$ bean temperature (°C). Evaporation is strongly endothermic (latent heat ~2790 kJ/kg in Schwartzberg). Wetter, larger, or denser seed therefore **slows the 50 → 150 °C rise**.

Kaffe does not integrate that ODE. It keeps the same signs as a drying slope (°C/min):

$$
k_{\mathrm{bean}} = \left(\frac{680}{\rho}\right)^{0.5}\left(\frac{11}{X}\right)^{0.45}\,k_{\mathrm{size}}\,k_{\mathrm{process}}
$$

- $\rho$: settled bulk density (g/L). Reference 680 g/L.
- $X$: green moisture (%). Reference 11% (typical export).
- $k_{\mathrm{size}}$: 1.08 small, 1.0 medium, 0.82 large (Pacamara / Maragogipe take longer to heat through).
- $k_{\mathrm{process}}$: washed 1.04, natural 0.94, honey 0.92, anaerobic 0.90.

Then (RoR in °C/min):

$$
\mathrm{RoR}_{\mathrm{dry}} = 40\cdot k_{\mathrm{bean}}\cdot k_{\mathrm{dry}} \in [28,85]
$$

$$
\mathrm{RoR}_{\mathrm{mail}} = 12\cdot k_{\mathrm{bean}}^{0.5}\cdot k_{\mathrm{mail}} \in [7,28]
$$

$$
\mathrm{RoR}_{\mathrm{dev}} = 7\cdot k_{\mathrm{dev}} \in [4,14]
$$

$$
t_{\mathrm{dry}} = 60\cdot \frac{150-50}{\mathrm{RoR}_{\mathrm{dry}}}
$$

$$
t_{\mathrm{mail}} = 60\cdot \frac{T_{\mathrm{FC}}-150}{\mathrm{RoR}_{\mathrm{mail}}}
$$

Development time mixes that slope with Rao DTR (section 4).

$k_{\mathrm{dry}}$, $k_{\mathrm{mail}}$, $k_{\mathrm{dev}}$ are dimensionless multipliers from flavor, roast style, brew, and RTD (below). **Steeper dry/Maillard** → more perceived acidity and aroma, less body. **Shallower** → caramel, viscosity, chocolate (Royal Coffee aW / Maillard cupping).

---

## 3. First crack

$$
T_{\mathrm{FC}} = 203.5 + 3.8\cdot\frac{\rho-680}{80} + \mathrm{adj} + \delta_{\mathrm{process}}
\quad \in \bigl[196,\ \min(212,\,T_{\mathrm{drop}}-4)\bigr]
$$

- Density raises crack temperature (stronger cell wall, more energy to rupture). Moisture mainly **delays the time** to crack via evaporative cooling, not the crack temperature itself (Hernández: initial moisture strongly affects the drying *phase*; bean-temperature kinetics at 9–13% are closer to each other than to $X=0$).
- Washed $-0.4$ °C, natural $+0.3$ °C (typical KL-user spread; washed often sounds slightly earlier).
- Variety and flavor `fcTemp` adj stack on top.
- Capped **4 °C below drop** so a light roast still has a development band.

Manual **Expected first crack** overrides $T_{\mathrm{FC}}$ for timing and `expect_fc` in the `.kpro`.

---

## 4. Development (DTR)

DTR is (time from first crack to **drop**) / (time to drop). On the Nano, **roast_end starts cooling** (`cooldown_*` in the `.kpro`; klog ignores samples after `roast_end`). Studio’s red level marker is drop; the last blue handle is unused profile time, not roast time (KL community). Official Nordic still eases ~1 °C in the last minute (~1 °C/min) as headroom if you raise level — it does not flick. A last-minute RoR near 0 stacks the yellow Bézier handle on the last blue point and Studio warns to move it (or use Smooth Point). Kaffe keeps that tail at ~2 °C over 60 s (~2 °C/min), writes the last triple as `[blue, end-blue, yellow CP]` like Nordic, and measures DTR at drop temperature.

**Colour vs time.** Münchow, Alstrup, Steen & Giacalone (2020, *Beverages* 6:29) found roast **colour** the stronger flavour predictor, but at constant colour **development time** (crack → drop) moved the cup more than time-to-crack. Alstrup, Petersen, Larsen & Münchow (2020, *Beverages* 6:70) held Agtron 76 and varied only post-crack time (90 / 143 / 266 / 390 s, dropping cooler when slower). Short development read fruitier, sweeter, more acid; long development read roastier, nuttier, more bitter. So a generator that claims a DTR must actually spend that time between crack temperature and drop temperature.

**The 20–25% number** is Scott Rao’s craft band for drum roasters at typical load, dropped between the end of first crack and the start of second (*The Coffee Roaster’s Companion*; [2016 note](https://www.scottrao.com/blog/2016/8/25/development-time-ratio)). It is a correlation from exceptional lots, not a kinetic law. Rao’s own exception: high burner-to-batch energy (sample roaster, lightly loaded drum) develops well nearer **15%**. The Nano 7 is a high-power fluid bed at 120 g, so Kaffe sits in **15–27%**, not a forced 20–25%. Chris Hilder / KL community: default profiles are ~**20%** at light levels; on a *fixed* KL curve, raising level always raises DTR — to keep DTR in-band while changing drop °C you have to reshape the post-crack slope (which is what Alstrup et al. did).

**Espresso vs filter.** Rao ([2017](https://www.scottrao.com/blog/roasting-for-espresso-vs-filter)) argues espresso is often a **slightly darker colour** because brew temperature is lower, not a larger DTR at the same colour. Kaffe’s roast-style level is that colour lever. The extra **+2 pp DTR** for espresso is a modest solubility/body overlay (same direction as Alstrup’s longer development at constant colour). It is not a 25–30% internet rule. On this machine, Ribes (2020, LightSide on a Nano 7) compared **10% vs 15%** DTR as espresso; 15% gained body and bitterness. Light filter’s extra **−1.5 pp** matches short development → more acid/fruit at a light drop.

### Roast style vs Kaffelogic level

The Nano displays **level 0.1–5.9**. That number is a stop on the profile’s `roast_levels` table (seven temperatures, index 0…6 — Classic L3 = 227 °C). It is **not** a universal colour and it is **not** DTR.

| | Official KL (JP manual) | Official cores on this machine | Kaffe style |
|---|---|---|---|
| Lighter | **1.5–2.0** | Washed/Natural v1.1 **1.4**; Classic **1.2**; Cupping **1.4** | Light **1.6** (~209 °C on the Nordic table) |
| Medium | **2.5–3.5** | Rest 1500–2000 m **2.0**; some altitude Rest **3.0–3.2** | Medium **3.2** (~212 °C) |
| Darker | **4.0+** | Super dark **5.6** | Dark **4.6** (~215 °C) |

On a **fixed** curve, raising level always raises DTR (Hilder, *Development Time Analysis*). Kaffe does not do that: style sets the **drop °C**, and the Bézier is reshaped so DTR stays in the 15–27% band (same move Alstrup et al. made — hold colour, change post-crack time). Light used to write **2.2**, which is already the official “medium” side of the lighter band and hotter than every current official light/filter core. Colour (Münchow) still dominates the cup; a “light” DTR at L2.2 can grind medium if first crack is ~207 °C and you still run to 210–213 °C.

Kaffe target (craft overlay on that evidence, clamped 15–27%):

$$
\mathrm{DTR} \approx 0.20 + 0.035\,\mathbf{1}_{\mathrm{dark}} - 0.015\,\mathbf{1}_{\mathrm{light}} + 0.02\,\mathbf{1}_{\mathrm{espresso}} - 0.015\,\mathbf{1}_{\mathrm{light+filter}} + 0.025\,w_{\mathrm{heavy}} - 0.03\,w_{\mathrm{volatile}}
$$

Development time is 40% slope-based and 60% this DTR, then $t_{\mathrm{end}} \ge t_{\mathrm{FC}}/(1-\mathrm{DTR})$. Yellow, first crack, and drop are pinned, then rebuilt with **monotone cubics** (Fritsch–Carlson) so RoR stays C1 and declining through drop. Studio DTR, development clock, and late RoR are read off that finished curve.

**Roast family** is not a control. After the curve exists:

| Label | Total time |
|---|---|
| Nordic | < 7:45 (465 s) |
| Classic | 7:45–10:00 |
| Slow | > 10:00 |

Community / official KL evidence: Nordic Light ~5:20–6:30; Classic / Ninja / Firestarter ~9:00–9:35; Nano 7 typical ~10 min at 120 g.

---

## 5. Density from altitude

Kamal et al. (2021, Nepal, *IJHAF*): bulk density rose from **~620 kg/m³ at 800–900 m** to **~688 kg/m³ at 1400–1500 m** (slope ≈ **0.11 g/L per metre**). Other highland studies show the same direction (e.g. Indonesia: high vs medium altitude 0.72 vs 0.65 g/mL).

Kaffe:

$$
\rho = 640 + 0.11\,(h-850) + \delta_{\mathrm{origin}} + \delta_{\mathrm{variety}}
\quad \in [600,780]
$$

Turn **Density from altitude** off when you have a measured g/L. Heat then follows that reading: denser seed → more preheat and a longer dry; softer seed → less preheat and more fan.

---

## 6. Boosts (RoR-error, not the Boost kit)

The **BOOST kit** is hardware (chamber rings + variable batch size). A **boost zone** is software.

Chris Hilder: the Nano controls **rate of rise**, not temperature error. A boost is a constant **°C/min added to RoR-error** every PID cycle — like aiming up-current when sailing. Official Nordic Light uses a short **+3 °C/min into crack**. Community espresso sometimes uses **−6…−15** after crack; Kaffe stays in **−6…−2**.

`roast_min_desired_rate_of_rise` is the **floor** of what that controller may ask for while catching the profile. The Nordic baseline copies **−0.7**. Kaffelogic Studio warns when the Bézier itself never goes below ~0.8 °C/min: −0.7 then permits an unduly negative correction. Kaffe sets the field to about **design min RoR − 1**, clamped to **[−1, −0.2]** (so typical generated curves write **−0.2**). It is saved in the `.kpro`, not a separate machine pref.

Nano 7 has **three** slots. Rest (default) only enables a zone when the bean needs it:

| Slot / role | When | Why |
|---|---|---|
| Drying | Moisture ≳ 12% or dense natural/anaerobic | Endothermic water loss can stall RoR before yellow. |
| Maillard | Honey process or body / deep-sweet | Colour-change dip; hold RoR so sugars brown. |
| Into first crack | Light + volatile and/or dense, or design RoR crashing | Moisture dump. Short +boost so the curve does not fall into crack. Rao: enter crack already decelerating — do not slam heat *at* crack. |
| After crack | Dark / espresso / body *and* hot design RoR | Bean goes exothermic. Negative boost tames a flick. |

Boost is **diluted** if the roast leaves the design line (Hilder): a +5 °C/min zone for 2 min is not a guaranteed +10 °C.

---

## 7. RTD vs Rest

Official Kaffelogic core profiles ([RTD](https://kaffelogicjp.com/en/pages/kl-rtd), [Rest](https://kaffelogicjp.com/en/pages/rest), [profiles overview](https://www.kaffelogic.com/pages/profiles)):

| | **Rest** (default) | **RTD** |
|---|---|---|
| Drink | Peak **3–5 days** after roast | **1–3 days**; flavour drops hard around day 4 |
| CO₂ | Stays in the seed, degasses in the bag | Driven out **during** the roast |
| Boosts | Only if the bean needs them | Always a Maillard **RoR step**, then **+boost through first crack** (“T through crack”). No negative after-crack brake (that would hold gas in). |
| Slopes | Baseline | Slightly steeper dry (esp. ≥ 1500 m), Maillard, and development |

Fluid-bed coffee often needs **more rest than drum coffee** at the same colour: convection leaves cell structure more intact, so CO₂ escapes slowly (Green Coffee Collective / KL community). RTD is the exception.

Fnq (KL community, *Rest Time and Profile Selection*): RTD 1500–2000 shows a large RoR step just after drying–Maillard, plus sustained energy through crack to force CO₂ out and flatten dip/flick. Rest profiles do that less directly. Altitude bands matter for how CO₂ moves.

Kaffe’s **Cup timing** switch is this concept, not the BOOST kit.

---

## 8. Flavor goals

Up to two flavors share one adjustment budget (`FLAVOR_DELTA` in `generate.ts`). They are **craft heuristics** from roasting practice (Rao; Royal Coffee Maillard/aW; SCA cupping language), not a published mapping from a flavor word to a unique curve.

Volatile group (steeper dry/Maillard, shorter DTR): floral, fruity, bright, juicy.  
Heavy group (shallower, longer mid and development): body, deep sweet.

These are **roast levers**, not a full SCA wheel. Variety-locked notes (blueberry, jasmine, bergamot) cannot be extracted from a bean that does not have the precursors (Münchow: colour and time move a shared acid/Maillard space; they do not rewrite origin).

| Goal | Idea | Typical curve |
|---|---|---|
| Floral | Volatile aromatics; heat them late and they disappear (Yeretzian-type roast-gas work). | High energy, early crack, very short development. |
| Fruity / bright | Organic acids survive a fast light roast; linger after crack and they collapse. | Fast dry, compact Maillard, short DTR. |
| Juicy | Acidity plus a little sweetness — not a race to drop. | Moderate dry, balanced mid. |
| Wine-like | Natural / anaerobic ferment character. | Slower start; do not flatten the dry. |
| Light sweet | Honey / cane / simple syrup. Compact Maillard, no caramelized darkness. | Slightly longer mid than fruit. |
| Deep sweet / body | Panela, molasses, cooked fruit, and viscosity — not candy or milk chocolate. Melanoidins need time (van Boekel; Royal). | Longer Maillard, later crack, more development, less late fan. |
| Clean | Even heat, washed-style, no fermenty linger. | Small deltas, no late stall. |
| Balance | No single loud phase. | Classic 8–10 min, moderate DTR. |

Dark roast style marks floral/fruit/bright as **avoid** (those notes are already gone at a ~4.6 drop). Light style recommends them. Variety `flavorLean` and process (washed → clean/bright; natural → fruity/winey) nudge recommendations.

---

## 9. Fan

The Nano’s default is **14 700 RPM** ([Studio / uneven roast](https://kaffelogicjp.com/en/pages/uneven-roasting); calibration display is 120 g @ 14 700). Across **101 public profiles** on [kl-profiles.com](https://kl-profiles.com/) (Sep 2026): 72 start at ~14 700; median drop is **1 500 RPM**; the majority ease in mid-roast, not at first crack.

| Family | Examples | Drop |
|---|---|---|
| Current official | (KL) Washed/Natural v1.1, Explorer, Filter altitude packs, Firestarter, JLightEthiopia | Mid-roast (~55–62% of a 10:00 fan), 14 700 → 13 200 |
| Nordic community | NordicLight | Earlier (~4:35 already down) |
| Older Rest cores | Rest v1.0 altitude, ninjaturtle, shapeshifter | Hold until ~9:00, then drop |

Kaffe follows the **current official / majority** family, not Rest v1.0’s late cliff and not a crash at crack (community [fan profiling](https://community.kaffelogic.com/viewtopic.php?t=196)).

Schwartzberg (2002) / Hernández: convective supply $\propto E\,G'(T_{\mathrm{GI}}-T_B)$. High $G'$ through drying moves moisture and keeps a fluid bed even (KL: raise the *whole* curve if circulation is sluggish). Lower $G'$ in development reduces cooling so the PID can finish; the official −1 500 RPM (~10%) is craft, not an integrated $G'(t)$ ODE. Drum “airflow” essays say the same in phase language: more air to dry, less into development.

**Times** (seconds) mix the roast phases with the official 10 min clock, then clamp **before first crack**:

$$
\alpha = 0.78 + \delta_{\mathrm{style}}+\delta_{\mathrm{flavor}}+\delta_{\mathrm{process}}+\delta_{\mathrm{RTD}}+\delta_{\mathrm{size}}+\delta_{X}+\delta_{\rho}
$$

$$
t_{\mathrm{hold}} = 0.55\bigl(t_{\mathrm{yellow}} + \alpha\,(t_{\mathrm{FC}}-t_{\mathrm{yellow}})\bigr) + 0.45\cdot 0.50\,T
\quad \le t_{\mathrm{FC}}-20
$$

$$
t_{\mathrm{low}} = t_{\mathrm{FC}} + \beta\,(T-t_{\mathrm{FC}}),\quad \beta \approx 0.72
$$

$\alpha$ rises (hold longer) for dark, body, natural/anaerobic, RTD, large seed, wetter, denser. It falls for light, floral/bright, washed, small seed. $\beta$ is higher for dark/espresso (low plateau later in a long development) and lower for light and RTD (reach low sooner after crack so heat can drive CO₂ — boosts still do the RoR-error work).

**RPM**

$$
N_{\mathrm{hold}} = 14700 + \Delta + \delta_{\mathrm{size}} + 25\cdot\max(0, X-11)
$$

$$
N_{\mathrm{end}} = 13200 + \Delta + \delta_{\mathrm{style}} + \delta_{\mathrm{RTD}} + \delta_{\mathrm{espresso}} + \delta_{\mathrm{heavy/volatile}}
$$

$\Delta$ is the uniform Studio transform (flavor / density / process / moisture on the whole curve). Light $+80$ / dark $-100$ on the *end* only; RTD $-80$ end; espresso $-50$ end. Clamped 12 000–16 800; drop at least 700 RPM.

Batch size does **not** change this shape. BOOST firmware adds $\Delta\mathrm{RPM} = 34.3\,(m-120)$ on a **120 g** reference ([JP Studio fan chart](https://kaffelogicjp.com/en/pages/studio_fanprofile); [reference load size](https://kaffelogic.atlassian.net/wiki/spaces/RWK/pages/11698443/Reference+load+size)). High-altitude *machine* calibration (spin faster for thinner air) stays on the roaster, not in the `.kpro`.

Implementation: `planFanSchedule` / `buildOfficialFanCurve` in `src/lib/generate.ts`.

---

## 10. Limits

- Coefficients are **Nano 7 fluid-bed**, ~120 g, not a drum or a 4 kg shop machine.
- No lot-specific $E_{a}$, diameter, or bean-core thermocouple — only probe, density, moisture, process, variety, flavor.
- DTR on a **light** drop is tight because drop sits only a few degrees above crack.
- `.kpro` start padding is **20 °C at t = 0** (Kaffelogic dummy). The first real handle on the Nordic baseline is ~49 °C at ~7 s; dragging it floors at 25 °C. Beans are still ambient at charge.

---

## References

### Heat, mass, Maillard

1. Schwartzberg, H.G. (2002). Modeling coffee roasting. In Welti-Chanes, J., Barbosa-Cánovas, G.V. & Aguilera, J.M. (eds.), *Engineering and Food for the 21st Century*. CRC Press. Moisture-loss and energy balances used by later roasting models.
2. Hernández, J.A., Heyd, B., Irles, C., Valdovinos, B. & Trystram, G. (2007). Analysis of the heat and mass transfer during coffee batch roasting. *Journal of Food Engineering*, 78(4), 1141–1148. [https://doi.org/10.1016/j.jfoodeng.2005.12.041](https://doi.org/10.1016/j.jfoodeng.2005.12.041)
3. van Boekel, M.A.J.S. (2006). Formation of flavour compounds in the Maillard reaction. *Biotechnology Advances*, 24(2), 230–233. [https://doi.org/10.1016/j.biotechadv.2005.11.004](https://doi.org/10.1016/j.biotechadv.2005.11.004)
4. Labuza, T.P. & Saltmarch, M. (1981). The nonenzymatic browning reaction as affected by water in foods. In Rockland, L.B. & Stewart, G.F. (eds.), *Water Activity: Influences on Food Quality*. Academic Press. Maillard rate vs water activity (peak near $a_{w} \approx 0.6$–$0.7$).

### Density, altitude, green physical quality

5. Kamal, B.K., Acharya, B., Srivastava, A.K. & Pandey, M. (2021). Effect of different altitudes in qualitative and quantitative attributes of green coffee beans (*Coffea arabica*) in Nepal. *International Journal of Horticulture, Agriculture and Food Science*, 5(3), 1–7. [https://doi.org/10.22161/ijhaf.5.3.1](https://doi.org/10.22161/ijhaf.5.3.1)
6. Randriani, E., Dani, & Mubassysyir, H. (2016). Physical bean quality of Arabica coffee cultivated at high and medium altitude. *Pelita Perkebunan*, 32(3). Highland bulk density ~0.72 vs ~0.65 g/mL at medium altitude. [https://doi.org/10.22302/iccri.jur.pelitaperkebunan.v32i3.241](https://doi.org/10.22302/iccri.jur.pelitaperkebunan.v32i3.241)

### Craft roasting (DTR, acids, body)

7. Rao, S. (2014). *The Coffee Roaster’s Companion*. (DTR ~20–25%; phase language used throughout specialty roasting.)
8. Apodaca, C. (2017). The relationship between water activity and the Maillard reaction in roasting. Royal Coffee. Faster Maillard → more sweetness/acidity, less viscosity; slower → more body. [https://royalcoffee.com/the-relationship-between-water-activity-and-the-maillard-reaction-in-roasting/](https://royalcoffee.com/the-relationship-between-water-activity-and-the-maillard-reaction-in-roasting/)
9. Yeretzian, C., Jordan, A., Badoud, R. & Lindinger, W. (2002). From the green bean to the cup of coffee: investigating coffee roasting by on-line monitoring of volatiles. *European Food Research and Technology*, 214, 92–104. Volatile aromatics are generated and then lost with heat/time.

### Kaffelogic (machine, boosts, RTD/Rest)

10. Hilder, C. Boosts as °C/min added to RoR-error. Kaffelogic community, *Boosts – C/min vs %/min*. [https://community.kaffelogic.com/viewtopic.php?t=279](https://community.kaffelogic.com/viewtopic.php?t=279)
11. Kaffelogic. RTD profile (drink 1–3 days). [https://kaffelogicjp.com/en/pages/kl-rtd](https://kaffelogicjp.com/en/pages/kl-rtd) · Rest profile (peak 3–5 days). [https://kaffelogicjp.com/en/pages/rest](https://kaffelogicjp.com/en/pages/rest) · Core profiles. [https://www.kaffelogic.com/pages/profiles](https://www.kaffelogic.com/pages/profiles)
12. Fnq. Rest time and profile selection (RTD RoR step, “T through crack”, CO₂). Kaffelogic community. [https://community.kaffelogic.com/viewtopic.php?t=228](https://community.kaffelogic.com/viewtopic.php?t=228)
13. Green Coffee Collective. *Kaffelogic Nano 7: Everything You Need to Know* — fluid-bed rest vs drum; RTD as the drink-now exception. [https://greencoffeecollective.com/blogs/learn/kaffelogic-nano-7-guide](https://greencoffeecollective.com/blogs/learn/kaffelogic-nano-7-guide)
14. Kaffelogic. Default fan 14 700 RPM; Studio transform is a uniform RPM shift (×10). [Uneven roasting](https://kaffelogicjp.com/en/pages/uneven-roasting) · [Fan profile vs load (BOOST)](https://kaffelogicjp.com/en/pages/studio_fanprofile) · [Reference load size](https://kaffelogic.atlassian.net/wiki/spaces/RWK/pages/11698443/Reference+load+size) · Community: no drastic fan change into first crack. [https://community.kaffelogic.com/viewtopic.php?t=196](https://community.kaffelogic.com/viewtopic.php?t=196)
15. Public Nano 7 library (fan-shape census, 101 profiles). [https://kl-profiles.com/](https://kl-profiles.com/)
