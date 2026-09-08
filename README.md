# Kaffe

Local-first studio for [Kaffelogic Nano 7](https://www.kaffelogic.com/) profiles. Generate `.kpro` files from bean parameters and flavor goals, then overlay `.kpro` / `.klog` files in the browser. Nothing is uploaded.

Inspired by [KL Profile](https://apps.apple.com/us/app/kl-profile/id6799672617). Overlay comparison follows the [roast-overlay](https://ryoroasts.github.io/roast-overlay/) model (MIT).

**Roast science** (equations, boosts, RTD/Rest, flavors, citations) lives in **[docs/ROAST-MODEL.md](docs/ROAST-MODEL.md)**. A short version is below.

## Run locally

You need Node 22+ (or Docker).

```bash
npm install
npm test
npm run dev
```

Open http://localhost:5173

### Local overlay coach (dev only)

GitHub Pages never ships this. `npm run build` / `npm run preview` keep Overlay as it is today.

1. Copy `.env.example` to `.env`
2. Paste a Cursor API key from [Integrations](https://cursor.com/dashboard/integrations) as `CURSOR_API_KEY`
3. `npm run dev` — Overlay shows a **Local Cursor coach** box
4. Ask about a loaded `.klog` / `.kpro`. If the coach proposes parameters, open them in Generate or add the regenerated `.kpro` to the overlay

The key is read by the Vite **dev server** only (`CURSOR_API_KEY`, no `VITE_` prefix), so it is not baked into the browser bundle. The agent is called with an empty tool list so it cannot edit the repo.

Production preview (what GitHub Pages serves):

```bash
npm run build
npm run preview
```

Open http://localhost:4173

Docker:

```bash
docker compose up --build
```

Live: [https://dpinedaj.github.io/kaffe/](https://dpinedaj.github.io/kaffe/)

## What it does

- **Generate** — origin, variety, process, altitude or measured density, moisture, brew, roast style, **Rest / RTD** cup timing, up to two flavor goals, recommended boost zones, live Bézier preview (add / delete / smooth spikes / reset), download `.kpro`
- **Overlay** — compare profiles, design vs actual from a `.klog`, zone/scalar diff, phases, ±3 °C deviation. Local `npm run dev` only: Cursor overlay coach (off on GitHub Pages).
- **Library** — save, rename, favorite, export JSON (this device only)

`.kpro` is plain `key:value` ASCII, LF, no checksum. Curves are cubic Bézier groups of three pairs. A `.klog` already contains the design curve in the `=profile` column — Overlay uses that when a log is present, and only analyses samples up to `roast_end`.

---

## Roast model (short)

Kaffe times the roast from **slopes**, not from a family bucket. Nordic / classic / slow is a **label on total time** after the curve is built.

### Equations (reduced form)

Literature moisture loss (Schwartzberg 2002; Hernández et al. 2007, *J. Food Eng.*):

$$
\frac{dX}{dt} \propto -\frac{X^{2}}{d_{p}^{2}}\exp\left(\frac{-E_{a}}{T+273}\right)
$$

Kaffe keeps those dependencies as drying / Maillard / development RoR (°C/min), calibrated to a Nano 7 fluid bed:

$$
k_{\mathrm{bean}} = (680/\rho)^{0.5}\,(11/X)^{0.45}\,k_{\mathrm{size}}\,k_{\mathrm{process}}
$$

$$
\mathrm{RoR}_{\mathrm{dry}} = 40\cdot k_{\mathrm{bean}}\cdot k_{\mathrm{dry}}
$$

$$
\mathrm{RoR}_{\mathrm{mail}} = 12\cdot k_{\mathrm{bean}}^{0.5}\cdot k_{\mathrm{mail}}
$$

$$
T_{\mathrm{FC}} = 203.5 + 3.8\cdot(\rho-680)/80 + \mathrm{adj}
$$

$$
t_{\mathrm{dry}} = 60\cdot(150-50)/\mathrm{RoR}_{\mathrm{dry}}
$$

$$
t_{\mathrm{mail}} = 60\cdot(T_{\mathrm{FC}}-150)/\mathrm{RoR}_{\mathrm{mail}}
$$

Development mixes that slope with Rao DTR **~20–25%** (Hilder: default KL ~20% at light). Density from altitude uses Nepal 2021 (~0.11 g/L per metre). Beans **always start at room temperature**; the machine preheats the empty chamber (~250 °C).

Steeper dry + Maillard → acidity and aroma; shallower → body and caramel (van Boekel 2006; [Royal Coffee aW / Maillard](https://royalcoffee.com/the-relationship-between-water-activity-and-the-maillard-reaction-in-roasting/)).

### Boosts

A **boost** is not the BOOST kit. Chris Hilder: it is **°C/min added to RoR-error** so the PID pretends the roast is off-course and feeds extra (or less) heat through an endotherm or exotherm. The Nano has three slots. Rest only turns a zone on when the bean needs it (wet drying, Maillard stall, crash into crack, runaway dark espresso). Official Nordic uses a short **+3 °C/min into crack**.

### Rest vs RTD

| | Rest (default) | RTD |
|---|---|---|
| Drink | Peak **3–5 days** | **1–3 days** |
| Idea | CO₂ degasses in the bag | Force CO₂ out **in the roast** |
| Boosts | Only if needed | Maillard RoR step + energy **through** first crack; no negative after-crack brake |

Official: [RTD](https://kaffelogicjp.com/en/pages/kl-rtd), [Rest](https://kaffelogicjp.com/en/pages/rest). Fluid-bed lots often need more rest than drum coffee unless you use RTD.

### Flavors

Up to two goals share one budget. Floral / fruity / bright / juicy steepen the front and shorten development. Body / deep sweet lengthen Maillard and DTR. That follows roasting practice (Rao; volatile loss vs heat/time), not a single published “flavor → curve” paper. Full table and citations: [docs/ROAST-MODEL.md](docs/ROAST-MODEL.md).

### Code

| Piece | Where |
|---|---|
| Phase times, FC, DTR, RTD slopes | `src/lib/generate.ts` → `durationPlan` |
| Boost recommendations | `suggestedZones` / `suggestedRtdZones` |
| Flavor deltas | `FLAVOR_DELTA` |
| Density from altitude | `densityFromAltitude` |
| Origins, varieties, flavor copy | `src/lib/knowledge.ts` |
