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

Rao’s working band is **20–25%** DTR. Under ~15% often reads sour/hollow; over ~30% flat or ashy. Chris Hilder: default Kaffelogic profiles sit near **~20%** at light levels.

Kaffe target:

$$
\mathrm{DTR} \approx 0.20 + 0.035\,\mathbf{1}_{\mathrm{dark}} - 0.015\,\mathbf{1}_{\mathrm{light}} + 0.02\,\mathbf{1}_{\mathrm{espresso}} - 0.015\,\mathbf{1}_{\mathrm{light+filter}} + 0.025\,w_{\mathrm{heavy}} - 0.03\,w_{\mathrm{volatile}}
$$

clamped to 15–27%. Development time is 40% slope-based and 60% this DTR, then $t_{\mathrm{end}} \ge t_{\mathrm{FC}}/(1-\mathrm{DTR})$.

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

| Goal | Idea | Typical curve |
|---|---|---|
| Floral | Volatile aromatics; heat them late and they disappear (Yeretzian-type roast-gas work). | High energy, early crack, very short development. |
| Fruity / bright | Organic acids survive a fast light roast; linger after crack and they collapse. | Fast dry, compact Maillard, short DTR. |
| Juicy | Acidity plus a little sweetness — not a race to drop. | Moderate dry, balanced mid. |
| Wine-like | Natural / anaerobic ferment character. | Slower start; do not flatten the dry. |
| Light sweet | Compact Maillard without caramelized darkness. | Slightly longer mid than fruit. |
| Deep sweet / body | Melanoidins and solubles need time (van Boekel; Royal: slower Maillard → more viscosity). | Longer Maillard, later crack, more development, less late fan. |
| Clean | Even heat, washed-style, no fermenty linger. | Small deltas, no late stall. |
| Balance | No single loud phase. | Classic 8–10 min, moderate DTR. |

Dark roast style marks floral/fruit/bright as **avoid** (those notes are already gone at a ~4.6 drop). Light style recommends them. Variety `flavorLean` and process (washed → clean/bright; natural → fruity/winey) nudge recommendations.

---

## 9. Fan

Official Nano 7 pattern: hold **~14 700 RPM**, then drop **~1 500 RPM** into development (`FAN_HOLD_RPM` / `FAN_END_RPM`). Large seeds get a little more early air; dark espresso a little less late air.

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
