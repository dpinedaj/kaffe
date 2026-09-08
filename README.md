# Kaffe

Local-first studio for [Kaffelogic Nano 7](https://www.kaffelogic.com/) profiles. Generate `.kpro` files from bean parameters and flavor goals, then overlay `.kpro` / `.klog` files in the browser. Nothing is uploaded.

Inspired by [KL Profile](https://apps.apple.com/us/app/kl-profile/id6799672617). Overlay comparison follows the [roast-overlay](https://ryoroasts.github.io/roast-overlay/) model (MIT).

## Run locally

You need Node 22+ (or Docker).

```bash
npm install
npm test
npm run dev
```

Open http://localhost:5173

Docker:

```bash
docker compose up --build
```

## What v1 does

- **Generate** — origin, process, altitude, brew, roast style, up to two flavor goals, live Bézier preview, download `.kpro`
- **Overlay** — compare profiles, design vs actual from a `.klog`, zone/scalar diff, phases, ±3 °C deviation
- **Library** — save, rename, favorite, export JSON (this device only)

`.kpro` is plain `key:value` ASCII. Curves are cubic Bézier groups of three pairs. A `.klog` already contains the design curve in the `=profile` column — Overlay uses that when a log is present.
