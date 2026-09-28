// Reader-facing summary of docs/BREW.md and docs/ROAST-MODEL.md — keep it in step with those docs.

export type ScienceTopic = "brew" | "roast";
export interface ScienceRef { id: string; text: string; url?: string }
export interface ScienceRefGroup { title: string; refs: ScienceRef[] }
export interface ScienceSection { id: string; title: string; body: string[]; refs: string[] }
export interface ScienceTab { intro: string; sections: ScienceSection[]; groups: ScienceRefGroup[]; limits: string[] }

/** Shared by both locales so a ref id always points at the same source. */
const REF_URL: Record<string, string> = {
  // Brew
  "sca-golden-cup": "https://sca.coffee/certified-home-brewer",
  "batali-2020": "https://doi.org/10.1038/s41598-020-73341-4",
  "frost-2020": "https://doi.org/10.1111/1750-3841.15326",
  "liang-2021": "https://doi.org/10.1038/s41598-021-85787-1",
  "liang-2021-sca": "https://sca.coffee/sca-news/25/issue-17/how-strong-is-the-coffee-youre-cupping-new-model-captures-the-equilibrium-extraction-nature-of-full-immersion-brewing-992ht",
  "sca-cupping": "https://sca.coffee/research/coffee-standards",
  "boil-table": "https://www.deleze.name/marcel/en/physique/TemperaturesEbullition/table_temperature-en.html",
  "pdg-2018": "https://perfectdailygrind.com/2018/10/how-does-elevation-affect-your-ideal-coffee-brew-temperature/",
  "medina-2023": "https://www.slowpoursupply.co/blogs/brew-recipes/recipe-recap-carlos-medina-s-representing-chile-world-brewers-cup-champion-recipe",
  "wolfl-2024": "https://www.cup-timer.com/en/recipe/martin-wolfl-wbrc-2024",
  "peng-2025": "https://www.slowpoursupply.co/blogs/journal/2025-world-brewers-cup-champion-george-pengs-solo-dripper-recipe",
  "stanica-2024": "https://worldaeropresschampionship.com/pages/1st-george-stanica-romania-2024",
  "pop-2025": "https://worldaeropresschampionship.com/pages/1st-nemo-pop-australia-2025",
  "merikanto-2021": "https://aeropress.com/blogs/blog/wac",
  "van-bunnik-2019": "https://worldaeropresschampionship.com/pages/recipes",
  "kasuya-2016": "https://kurasu.kyoto/blogs/kurasu-journal/2016-world-brewers-cup-champion-tetsu-kasuya",
  "wang-2017": "https://www.cup-timer.com/en/recipe/chad-wang-wbrc-2017",
  "mccarthy-2013": "https://sprudge.com/meet-the-worlds-best-brewer-james-mccarthy-brewers-cup-champ-38672.html",
  "hsu-2022": "https://www.cup-timer.com/en/recipe/shih-yuan-hsu-wbrc-2022",
  "du-2019": "https://gota.cafe/en/recipes/origami-m/origami-m-du",
  "bull-2025": "https://www.baristamagazine.com/justin-bull-rebounds-to-win-u-s-brewers-cup/",
  "wipvasutt-2023": "https://worldaeropresschampionship.com/pages/1st-tay-wipvasutt-thailand-2023",
  "sprofiler": "https://sprofiler.io/community-profiles",
  "hoffmann-v60": "https://www.youtube.com/watch?v=AI4ynXzkSQo",
  "rao-v60": "https://www.hario.co.uk/blogs/hario-ambassadors/hario-v60-recipe-interview-with-hario-ambassador-scott-rao",
  "hedrick-bloom": "https://www.youtube.com/watch?v=PNFVCmxBjQQ",
  "hoffmann-iced": "https://www.youtube.com/watch?v=PApBycDrPo0",
  "hoffmann-chemex": "https://www.timer.coffee/recipes/chemex/james-hoffmann-chemex-recipe/",
  "hoffmann-switch": "https://www.youtube.com/watch?v=QjIvN8mlK9Y",
  "fukahori-switch": "https://europeancoffeetrip.com/emi-fukahori-world-brewers-cup-2018-champion/",
  "kasuya-super-hybrid": "https://www.youtube.com/results?search_query=tetsu+kasuya+super+hybrid+2025",
  "hoffmann-french-press": "https://www.youtube.com/watch?v=st571DYYTR8",
  "hoffmann-cold-brew": "https://www.facebook.com/jameshoffmanncoffee/videos/everything-i-learned-about-cold-brew-coffeehere-is-the-recipe-if-youd-like-to-gi/2009932969795608/",
  "ccc-cold-brew": "https://counterculturecoffee.com/blogs/counter-culture-coffee/guide-to-cold-brew",
  "wac-archive": "https://worldaeropresschampionship.com/pages/recipes",
  // Shared by both tabs
  "kl-rest": "https://kaffelogicjp.com/en/pages/rest",
  "kl-rtd": "https://kaffelogicjp.com/en/pages/kl-rtd",
  "gcc-nano7": "https://greencoffeecollective.com/blogs/learn/kaffelogic-nano-7-guide",
  "rao-resting": "https://www.scottrao.com/blog/restingbeans",
  // Roast
  "hernandez-2007": "https://doi.org/10.1016/j.jfoodeng.2005.12.041",
  "van-boekel-2006": "https://doi.org/10.1016/j.biotechadv.2005.11.004",
  "kamal-2021": "https://doi.org/10.22161/ijhaf.5.3.1",
  "randriani-2016": "https://doi.org/10.22302/iccri.jur.pelitaperkebunan.v32i3.241",
  "kornman-2017": "https://royalcoffee.com/the-relationship-between-water-activity-and-the-maillard-reaction-in-roasting/",
  "rao-dtr-2016": "https://www.scottrao.com/blog/2016/8/25/development-time-ratio",
  "rao-espresso-2017": "https://www.scottrao.com/blog/roasting-for-espresso-vs-filter",
  "hilder-boosts": "https://community.kaffelogic.com/viewtopic.php?t=279",
  "kl-core-profiles": "https://www.kaffelogic.com/pages/profiles",
  "fnq-rest": "https://community.kaffelogic.com/viewtopic.php?t=228",
  "kl-fan-default": "https://kaffelogicjp.com/en/pages/uneven-roasting",
  "kl-fan-load": "https://kaffelogicjp.com/en/pages/studio_fanprofile",
  "kl-ref-load": "https://kaffelogic.atlassian.net/wiki/spaces/RWK/pages/11698443/Reference+load+size",
  "kl-fan-community": "https://community.kaffelogic.com/viewtopic.php?t=196",
  "kl-profiles-census": "https://kl-profiles.com/",
};

function ref(id: string, text: string): ScienceRef {
  const url = REF_URL[id];
  return url ? { id, text, url } : { id, text };
}

/* ------------------------------------------------------------------ */
/* English                                                             */
/* ------------------------------------------------------------------ */

const BREW_EN: ScienceTab = {
  intro:
    "Brew gives you a starting card, not a lock. It is built from the extraction research first, then published competition recipes, then trusted community recipes where competition is silent — and your own taste has the last word.",
  sections: [
    {
      id: "extraction",
      title: "Strength, extraction and temperature",
      body: [
        "Coffee science describes a cup by two numbers, not by the dripper: **strength** (how much coffee is dissolved, TDS) and **extraction** (how much of the grounds ended up in the cup, PE). The classic Golden Cup target is about **55 g/L** (~1:18), **18–22%** extraction, with water at the grounds of **90–96 °C**.",
        "Temperature mostly works as a speed knob. A UC Davis panel found **87, 90 and 93 °C** barely changed the taste once extraction was matched with grind and time. Another UC Davis study found full-immersion brews settle near **21%** extraction whatever the roast, grind, ratio or temperature (**80–99 °C**); heat only changes how fast you get there, and the ratio sets strength.",
        "So Kaffe picks a method recipe, sets the temperature you would want at sea level, caps it at your local boil, and only then spends any shortfall on grind, time or a slightly tighter ratio.",
      ],
      refs: ["sca-golden-cup", "batali-2020", "frost-2020", "liang-2021"],
    },
    {
      id: "altitude",
      title: "Your kitchen altitude",
      body: [
        "An open kettle cannot get hotter than your local boiling point, which drops about **1 °C every 300 m**: boil ≈ 100 − altitude/300 °C. That gives about **95.0 °C** at 1 500 m, **94.0 °C** at 1 800 m and **91.4 °C** at 2 600 m; weather moves it by about ±0.5 °C. Kaffe aims the kettle no higher than 1 °C under local boil and tells you to pour at a rolling boil instead of printing 96 °C when you can’t reach it.",
        "It does **not** grind finer just because a sea-level card is out of reach. At 2 000 m the kettle sits near 92 °C — Kasuya’s published 4:6 temperature and inside the SCA band. Grind, time and ratio only move once the kettle falls under the SCA **92 °C** floor (above about 2 400 m, like Bogotá or Cuzco): for every 3 °C short, pour-over gets about **+20 s**, immersion **+40 s**, a ~7% tighter ratio and one grind step finer (two at most). Those sizes are an estimate; your After brew reading closes the rest.",
        "Kitchen altitude is its own setting, separate from the farm metres on the bag. Espresso is pressurized, so a 93 °C group still works up high; on a moka only the fill water is capped.",
      ],
      refs: ["boil-table", "pdg-2018", "batali-2020", "sca-golden-cup"],
    },
    {
      id: "competition",
      title: "Championship recipes",
      body: [
        "World Brewers Cup, AeroPress and Barista champions write for one coffee, one roast and one room, and almost always a **Light** roast. Kaffe uses them to calibrate its Light cards — around **1:14–1:16**, **91–96 °C** and **~1:45–3:00** for filter — and keeps each champion’s published temperature on the card. These cards stay cited and read-only; Edit makes your own copy.",
        "Filter champions on the list include McCarthy 2013 (Kalita), Kasuya 2016 (V60 4:6), Chad Wang 2017 (V60), Fukahori 2018 (GINA, shown as Clever), Du 2019 (Origami), Winton 2021 (V60), Hsu 2022 (OREA), Medina 2023 (Origami), Wölfl 2024 (OREA), Peng 2025 (SOLO, shown as V60) and Jaafar 2026 (UFO on a Switch). AeroPress brings Stanica 2024, Pop 2025, Merikanto 2021 and Little 2022; espresso follows the Barista cluster of about **1:2–1:2.5**, **90–94 °C**, **25–30 s**.",
        "Where a published recipe claims a cup, Kaffe offers it as a flavor pick — for example Kasuya’s bigger first pour for brightness, or Pop and Merikanto’s cooler water for sweetness. Dark roasts have no competition recipes; those cards are craft.",
      ],
      refs: ["mccarthy-2013", "kasuya-2016", "wang-2017", "du-2019", "hsu-2022", "medina-2023", "wolfl-2024", "peng-2025", "stanica-2024", "pop-2025", "merikanto-2021", "wbc-espresso"],
    },
    {
      id: "community",
      title: "Community and café recipes",
      body: [
        "Where the research doesn’t name a dripper and the champion used gear you may not own, Kaffe falls back on widely used recipes with published numbers: James Hoffmann’s V60, French press, Chemex, moka, Switch and cold brew, Scott Rao’s spin V60, Lance Hedrick’s double bloom, and the SCA cupping protocol (**8.25 g / 150 g**, **93 °C**, **4 min**).",
        "Café recipes were added only when a primary source gives the numbers; ones whose numbers disagree across sources were left out. The Hario Switch gets several named valve patterns, because the same dose and water can be a steep, a pour-over or a hybrid.",
        "Many recipes say “just off boil” for Light roasts. That is a sea-level instruction; at altitude Kaffe turns it into a rolling boil.",
      ],
      refs: ["hoffmann-v60", "hoffmann-french-press", "hoffmann-chemex", "hoffmann-moka", "hoffmann-switch", "fukahori-switch", "kasuya-super-hybrid", "hoffmann-cold-brew", "rao-v60", "hedrick-bloom", "sca-cupping", "cafe-recipes"],
    },
    {
      id: "grind",
      title: "Grind words and grinder clicks",
      body: [
        "Every card uses one of five grind words, from coarse to fine. Pick your grinder in Kitchen (about **210** mills from the Honest Coffee Guide charts) and Kaffe prints **starting clicks**, where zero is the burrs touching. “Medium” sits near the middle of each method’s range, not at the fine edge.",
        "On pour-over, Switch, Clever, espresso and moka the clicks also follow your dose: a bigger dose makes a deeper bed, so it goes coarser to keep the drain from stalling, and a tighter ratio goes finer to keep extraction. Full immersion doesn’t shift, because it settles at the same extraction anyway. On espresso the list shows only espresso-capable grinders.",
        "Clicks are a place to start, not a lock — burr wear and bean density move the number.",
      ],
      refs: ["honest-coffee-guide", "liang-2021"],
    },
    {
      id: "rest",
      title: "Rest, ready-to-drink and degassing",
      body: [
        "Fresh coffee keeps releasing CO₂, and a gassy bed blooms, domes and can taste uneven. A **Rest** roast degasses in the bag: Kaffe’s default brew day is **4**, and a Light Rest roast is still good through about **21 days** — day 10 is normal. A **ready-to-drink (RTD)** roast is made to drink in **1–3 days** and usually tastes hollow after day 4.",
        "While a Light roast is still blooming (up to about day 10; Medium about day 6), Kaffe suggests recipes that dump gas first — a long **3×** bloom of 45–60 s, a double bloom, or a blooming espresso — and avoids grinding finer on that bed. Espresso rests longer than filter; those day counts are café practice, not a paper.",
        "Kaffelogic’s “peak 3–5 days” label is when the cup starts to settle, not when it dies. Scott Rao finds air-roasted coffee often wants 1–4 weeks, and Nano roasters in the community say to rest longer than drum coffee — Kaffe treats that as craft.",
      ],
      refs: ["kl-rest", "kl-rtd", "gcc-nano7", "rao-resting", "hedrick-bloom"],
    },
    {
      id: "after-brew",
      title: "After brew: reading your cup",
      body: [
        "If you own a refractometer, After brew takes your measured Brix or TDS and places the cup on the brewing control chart. Kaffe never invents a TDS for you. Extraction = TDS × liquid ÷ dose, where the liquid depends on the brewer.",
        "For immersion (French press, Clever, AeroPress, cupping, cold brew, siphon) that is all the water, because the liquid left in the grounds is as strong as the cup. For pour-over it is the drained cup — about the water minus **2 g per gram** of coffee unless you weigh it. For espresso it is the weighed shot.",
        "The chart shows the SCA box (**1.15–1.35%** TDS) or the European one (**1.20–1.45%**), both at **18–22%** extraction; recipes that aim higher on purpose, like Rao’s spin V60, get their own window. Measure at room temperature, zero the meter with your brew water and filter espresso samples; Brix × 0.85 is only an approximation.",
      ],
      refs: ["sca-golden-cup", "liang-2021", "barista-hustle", "rao-v60"],
    },
    {
      id: "taste",
      title: "Taste: sour or bitter, weak or strong",
      body: [
        "No refractometer? Two taps work too, after Barista Hustle’s Coffee Compass. **Sour ↔ bitter** is extraction: sour means grind finer or brew a little longer; bitter means go coarser or shorter. **Weak ↔ strong** is strength: tighten the ratio for a fuller cup, loosen it for a lighter one.",
        "That split follows the research: ratio sets strength, while grind and time set extraction. Your taste is always the final check — the card is only a preview.",
        "Water matters too. SCA’s standard targets about **40 mg/L** alkalinity; hard, alkaline tap water buffers acids and flattens Light, bright cups, so the card warns you when that is likely.",
      ],
      refs: ["frost-2020", "liang-2021", "sca-golden-cup"],
    },
    {
      id: "your-coffee",
      title: "What the bag changes",
      body: [
        "This bag takes what is printed on a bought coffee — origin, variety, process, farm metres — and turns it into density, seed size and a flavor lean. It does not look up a separate recipe per country.",
        "Those feed small, signed nudges: bright, fruity or floral goals brew about 1 °C hotter (still capped) and a touch finer; body and deep-sweet goals brew about 2 °C cooler and coarser; naturals and honeys go a step coarser on paper, since they tend to clog. There is no published study behind these nudges; they are craft and will be wrong for some lots.",
      ],
      refs: [],
    },
  ],
  groups: [
    {
      title: "Research: extraction, temperature, cupping",
      refs: [
        ref("sca-golden-cup", "Lockhart, E.E. / SCA. The Coffee Brewing Handbook and Golden Cup — ~55 g/L, 18–22% extraction, 90–96 °C at the grounds; certified brewers reach 92 °C in the first minute and never exceed 96 °C."),
        ref("batali-2020", "Batali, M.E., Ristenpart, W.D. & Guinard, J.-X. (2020). Brew temperature, at fixed brew strength and extraction, has little impact on the sensory profile of drip brew coffee. Scientific Reports 10, 16450 — 87 / 90 / 93 °C at matched TDS and extraction."),
        ref("frost-2020", "Frost, S.C., Ristenpart, W.D. & Guinard, J.-X. (2020). Effects of brew strength, brew yield, and roast on the sensory quality of drip brew coffee. Journal of Food Science — strength and extraction dominate; roast still moves attributes."),
        ref("liang-2021", "Liang, J., Chan, K.C. & Ristenpart, W.D. (2021). An equilibrium desorption model for the strength and extraction yield of full immersion brewed coffee. Scientific Reports 11, 6904 — immersion settles near 21% extraction across roast, grind and 80–99 °C; ratio sets strength."),
        ref("liang-2021-sca", "SCA News. How strong is the coffee you’re cupping? — a plain-language write-up of Liang et al. (2021)."),
        ref("sca-cupping", "Specialty Coffee Association. Cupping protocol — 8.25 g / 150 mL, 93 °C, 4 min, break and skim."),
      ],
    },
    {
      title: "Altitude",
      refs: [
        ref("boil-table", "Boiling point vs elevation, barometric table (e.g. 1 800 m → 94.0 °C), matching the fit boil ≈ 100 − altitude/300 °C."),
        ref("pdg-2018", "Perfect Daily Grind (2018). How elevation affects brew temperature — Tamas Erdélyi: at 1 524 m you have lost ~5.5 °C; at Bogotá or Cuzco grind finer and/or use pressure."),
      ],
    },
    {
      title: "Competition",
      refs: [
        ref("medina-2023", "Medina, C. (2023). World Brewers Cup — Origami, ~16 g / 250 g, 91 °C, five 50 g pulses."),
        ref("wolfl-2024", "Wölfl, M. (2024). World Brewers Cup — OREA V4, 17 g / 270 g, 93 °C, ~2:20."),
        ref("peng-2025", "Peng, G. (2025). World Brewers Cup — SOLO, 15 g / 210 g, 96 °C then 80 °C, 1:45."),
        ref("stanica-2024", "Stanica, G. (2024). World AeroPress Championship — inverted, 18 g / 100 g at 96 °C, diluted."),
        ref("pop-2025", "Pop, N. (2025). World AeroPress Championship — upright, 18 g / 100 g at 84 °C plus a 70 g bypass at 50 °C."),
        ref("merikanto-2021", "Merikanto, T. (2021). World AeroPress Championship — inverted, 18 g / 200 g at 80 °C, gentle agitation."),
        ref("van-bunnik-2019", "van Bunnik, W. (2019). World AeroPress Championship — inverted 30 g / 100 g, ~40 s, diluted, served ~60 °C."),
        ref("kasuya-2016", "Kasuya, T. (2016). World Brewers Cup — the 4:6 method: the first 40% sets acid vs sweet (more water in pour one, more acidity)."),
        ref("wang-2017", "Wang, C. (2017). World Brewers Cup — V60, 15 g / 250 g, 92 °C, one centre pour, ~2:00."),
        ref("mccarthy-2013", "McCarthy, J. (2013). World Brewers Cup — Kalita Wave, 24 g / 380 g, column pour with low agitation, ~3:30."),
        ref("hsu-2022", "Hsu, S. Y. (2022). World Brewers Cup — OREA, 14 g / 200 g, first pour at 70 °C then 95 °C."),
        ref("du-2019", "Du, J. N. (2019). World Brewers Cup — Origami, 16 g / 240 g, 94 °C, three pours, no bloom, ~1:46."),
        ref("bull-2025", "Bull, J. (2025). US Brewers Cup — Hario Switch, percolation first, then steep."),
        ref("wipvasutt-2023", "Wipvasutt, T. (2023). World AeroPress Championship — 16 g plus 2 g mid-brew, 89 °C, split bypass."),
        ref("wbc-espresso", "World Barista Championship 2024–25 open-service espresso recipes (cluster ~1:2–1:2.5, 90–94 °C). World Coffee Events / competitor disclosures."),
        ref("sprofiler", "SproFiler community profiles for Gaggiuino — Adaptive Light/Dark, Blooming espresso, Extractamundo Dos!, Londinium, Leva, Low High Low, Stock 9 Bar, Filter 2.1."),
      ],
    },
    {
      title: "Community (Hoffmann and SCA-shaped)",
      refs: [
        ref("hoffmann-v60", "Hoffmann, J. The Ultimate V60 Technique — bloom, 60% pour, stir."),
        ref("rao-v60", "Rao, S. V60 — bloom spin, two pours, 20 g / 330 g, ~97 °C, 4:00–4:30."),
        ref("hedrick-bloom", "Hedrick, L. Double bloom, then one fast centre pour (for gassy coffees)."),
        ref("hoffmann-iced", "Hoffmann, J. Japanese iced filter — 65 g/L, 60% hot water onto 40% ice in the server."),
        ref("hoffmann-chemex", "Hoffmann, J. Chemex as a V60 adaptation — 30 g / 500 g, ~4:10."),
        ref("hoffmann-switch", "Hoffmann, J. Hario Switch daily driver — 15 g / 250 g, ~2:00 steep, open ~2:15."),
        ref("fukahori-switch", "Fukahori, E. Switch shop recipe (MAME): closed bloom, then open centre pour. Her WBrC 2018 routine was a GINA at 17 g / 220 g, 80 / 95 / 80 °C."),
        ref("kasuya-super-hybrid", "Kasuya, T. Super Hybrid (2025) — 20 g / 300 g, closed bloom, open middle pours, closed cool last pour at 70–80 °C, open ~3:30."),
        ref("wibawa-switch", "Wibawa, R. Double immersion on a Switch — 15 g / 220 g, 86 °C then 92 °C (WBrC 2024, 3rd). Hario Asia / competitor recaps."),
        ref("hoffmann-french-press", "Hoffmann, J. The Ultimate French Press Technique — 30 g / 500 g, break the crust, settle, plunge to the surface."),
        ref("hoffmann-moka", "Hoffmann, J. Moka — hot water to the valve, no tamp, off at the first blonde."),
        ref("hoffmann-cold-brew", "Hoffmann, J. Cold brew — ~75 g / 1 L, fridge ~12 h, finer than “boulders.”"),
        ref("ccc-cold-brew", "Counter Culture Coffee. Guide to cold brew — 1:8 concentrate."),
      ],
    },
    {
      title: "Rest and ready-to-drink (roast side, used for drink day)",
      refs: [
        ref("kl-rest", "Kaffelogic. Rest profile — peak 3–5 days."),
        ref("kl-rtd", "Kaffelogic. RTD profile — drink in 1–3 days."),
        ref("gcc-nano7", "Green Coffee Collective. Kaffelogic Nano 7 guide — community advice that Nano roasts want more rest than drum. Treated as craft: Wang & Lim (2014, Food Res. Int.) found fast, hot roasts degas faster at equal roast degree."),
        ref("rao-resting", "Rao, S. Resting roasts: is fresher better? — air and fluid-bed roasts often want 1–4 weeks, not 3–5 days."),
      ],
    },
    {
      title: "Also cited in Kaffe’s notes",
      refs: [
        ref("honest-coffee-guide", "Honest Coffee Guide grinder charts — micron bands per brew method for about 210 grinders; the source of Kaffe’s starting clicks."),
        ref("barista-hustle", "Barista Hustle — cited with Liang et al. (2021) for liquid retained in the spent grounds (Liang measured 2.48 ± 0.19 g/g in a drained bed)."),
        ref("cafe-recipes", "Well-documented café recipes (added 2026-09): Hoffmann’s A Better 1-Cup V60 (Hario USA), April Coffee Roasters, Tim Wendelboe, Stumptown, Sprudge and Blue Bottle siphon, SCA Golden Cup batch, Scott Rao’s Batch Brew Basics and allongé (Decent docs), Kyoto slow drip (Hario / Coffee Circle)."),
        ref("wac-archive", "World AeroPress Championship — full recipe archive."),
      ],
    },
  ],
  limits: [
    "The card is a preview; your taste is the last word.",
    "Light competition recipes calibrate Light filter and espresso only — Medium leans on SCA practice, and Dark is craft.",
    "Kaffe does not model water chemistry (ppm, calcium, magnesium); Medina specified ~65 ppm and Kaffe does not.",
    "Grinder clicks are starting points: burr wear and bean density move the real number.",
    "After brew needs a measured Brix or TDS; Kaffe does not invent a TDS target.",
    "Flavor and variety nudges are not from a paper and will be wrong for some lots.",
  ],
};

const ROAST_EN: ScienceTab = {
  intro:
    "Kaffe doesn’t pick a 6, 9 or 11 minute template and stretch it. It estimates how fast your beans will dry, brown, crack and develop from what you know about the lot, then draws the curve — today calibrated for the Kaffelogic Nano 7.",
  sections: [
    {
      id: "phases",
      title: "The phases of a roast",
      body: [
        "**Drying** runs from charge to yellow at about **150 °C**, while water evaporates and cools the bean. **Maillard** runs from yellow to first crack: sugars and amino acids brown into aroma, sweetness and body. **First crack** is steam breaking the cell wall, about **196–205 °C** inside the bean. **Development** is the time from crack to drop, and it sets roast degree.",
        "Kaffe estimates each phase’s speed, the crack temperature and time, and development, then labels the result from total time: Nordic under **7:45**, Classic **7:45–10:00**, Slow over **10:00**. The label is a description, not a control.",
        "The numbers are calibrated for the Kaffelogic Nano 7, a fluid-bed air roaster at about **120 g**, the one roaster Kaffe supports today. Another machine heats, measures and loads differently, so it needs its own calibration; Kaffe won’t translate a Nano profile to it.",
      ],
      refs: ["rao-2014", "van-boekel-2006", "schwartzberg-2002"],
    },
    {
      id: "moisture",
      title: "Moisture and drying",
      body: [
        "Roasting research models water leaving the bean as heat-driven diffusion, and evaporation soaks up a lot of heat. So wetter, larger or denser beans **climb more slowly** from about 50 to 150 °C. Kaffe doesn’t run that full model; it keeps the same directions, measured against a reference of **680 g/L** and **11%** moisture.",
        "Large beans like Pacamara and Maragogipe take longer to heat through; washed coffee dries a little faster than natural, honey or anaerobic. Faster drying and Maillard tend to read brighter and more aromatic with less body; slower reads more caramel and chocolate with more viscosity.",
      ],
      refs: ["schwartzberg-2002", "hernandez-2007", "labuza-1981", "kornman-2017"],
    },
    {
      id: "first-crack",
      title: "Predicting first crack",
      body: [
        "Kaffe estimates crack from density: crack ≈ 203.5 + 3.8 × (density − 680) / 80 °C. Denser seed has a stronger wall to break. That slope is Kaffe’s own heuristic — no published study links density to crack temperature, and Kaffelogic only says crack usually starts around **205 °C**. Washed lots get −0.5 °C, naturals +0.3 °C, and a guessed crack is kept at least **4 °C** under drop so a Light roast still has a development band.",
        "Moisture delays **when** crack comes, not the temperature. The Nano’s exposed probe reads several degrees hotter than the bean core (about 203–210 °C at crack). The best estimate is your own: log where this lot actually cracks and set Expected first crack.",
      ],
      refs: ["hernandez-2007", "schwartzberg-2002"],
    },
    {
      id: "development",
      title: "Development and DTR",
      body: [
        "DTR = time after first crack ÷ total time to drop. Münchow and colleagues found roast **colour** predicts flavor most, but at the same colour, **development time** moved the cup more than time-to-crack. Holding Agtron 76 and changing only post-crack time, short development tasted fruitier, sweeter and more acidic; long development roastier, nuttier and more bitter.",
        "The familiar **20–25%** is Scott Rao’s craft band for loaded drum roasters, and he notes high-energy roasters develop well nearer **15%**. The Nano is a high-power fluid bed, so Kaffe works in **15–27%**, adds a little for espresso and takes a little off for Light filter, and designs at least **60 s** of development.",
        "Kaffelogic’s roast level (0.1–5.9) is a stop on the profile’s temperature table, not a colour and not DTR. Kaffe’s Light is **1.6** (~209 °C), Medium **3.2** (~212 °C), Dark **4.6** (~215 °C): style sets the drop temperature, and the curve is reshaped so DTR stays in band.",
      ],
      refs: ["munchow-2020", "alstrup-2020", "rao-2014", "rao-dtr-2016", "rao-espresso-2017", "hilder-dta", "ribes-2020"],
    },
    {
      id: "density",
      title: "Density from farm altitude",
      body: [
        "Higher farms tend to grow denser beans. A 2021 Nepal study measured about **620 kg/m³** at 800–900 m rising to about **688 kg/m³** at 1 400–1 500 m — roughly **0.11 g/L per metre** — and an Indonesian study found the same direction.",
        "Without a measurement, Kaffe estimates density ≈ 640 + 0.11 × (altitude − 850) g/L, kept between 600 and 780, then nudges it for origin and variety. If you measured the lot, turn Density from altitude off: denser seed gets more preheat and a longer dry; softer seed less preheat and more fan.",
      ],
      refs: ["kamal-2021", "randriani-2016"],
    },
    {
      id: "boosts",
      title: "Boosts",
      body: [
        "The BOOST kit is hardware; a boost **zone** is software. The Nano steers by rate of rise, and a boost adds a fixed number of °C/min to that target — like aiming up-current when sailing. If the roast drifts off the design line the boost is diluted: +5 °C/min for 2 minutes is not a guaranteed +10 °C.",
        "Following Rao, a roast should enter crack already slowing down, so on Rest Kaffe never adds heat into crack automatically. Its flick brake runs from about **45 s** to **3 s** before crack at **−2 to −6 °C/min**, because Kaffelogic advises finishing any negative boost before crack starts.",
        "Of the Nano’s three slots, Rest only turns one on when the bean needs it: drying for wet (about 12%+) or dense natural and anaerobic lots, Maillard for honey or body goals, and an after-crack brake for dark, espresso or body roasts arriving hot.",
      ],
      refs: ["hilder-boosts", "rao-2014", "kl-roasters-companion"],
    },
    {
      id: "rtd",
      title: "Rest vs ready-to-drink",
      body: [
        "**Rest** (the default) follows Kaffelogic’s Rest profiles: CO₂ stays in the bean and leaves in the bag, peaking **3–5 days** after roast. **RTD** follows Kaffelogic’s ready-to-drink profiles: the roast drives CO₂ out itself, so the coffee is best in **1–3 days** and drops off around day 4.",
        "For RTD, Kaffe adds a step of extra rate of rise in Maillard and a boost through first crack, uses slightly steeper slopes, and skips any after-crack brake, which would hold gas in. Rest uses boosts only where the bean needs them.",
        "Community advice says Nano roasts need more rest than drum coffee. Kaffe treats that as craft: one study found fast, hot roasts actually degas **faster** at the same roast degree. The Cup timing switch is this choice — not the BOOST kit.",
      ],
      refs: ["kl-rest", "kl-rtd", "kl-core-profiles", "fnq-rest", "gcc-nano7", "wang-lim-2014"],
    },
    {
      id: "flavor",
      title: "Flavor goals",
      body: [
        "You can pick up to two flavor goals; two picks split one budget. Floral, fruity, bright and juicy lean on steeper drying and Maillard with shorter development, because volatile aromas and acids are lost with heat and time. Deep sweet and body lean on a longer Maillard and more development, since browning compounds need time.",
        "These are craft rules from roasting practice, not a published map from a flavor word to a curve. A roast can’t create notes the bean doesn’t have — colour and time move a shared acid-and-browning space; they don’t rewrite origin. That is why a Dark style marks floral and fruit as ones to avoid, and why variety and process nudge the suggestions.",
      ],
      refs: ["rao-2014", "kornman-2017", "yeretzian-2002", "van-boekel-2006", "munchow-2020"],
    },
    {
      id: "fan",
      title: "Fan",
      body: [
        "The Nano’s default fan is **14 700 RPM**. Across **101** public Nano profiles (Sep 2026), 72 start around 14 700, the median drop is **1 500 RPM**, and most ease the fan down mid-roast rather than at crack.",
        "Kaffe follows that current official shape — more air while drying to move moisture and keep the bed even, then less in development so the heater can finish — easing from about 14 700 to 13 200 RPM, with no late cliff and no crash at crack. Batch size doesn’t change the shape; the BOOST firmware adjusts fan speed for load around the **120 g** reference.",
      ],
      refs: ["kl-fan-default", "kl-profiles-census", "kl-fan-community", "kl-fan-load", "kl-ref-load", "schwartzberg-2002"],
    },
  ],
  groups: [
    {
      title: "Heat, mass, Maillard",
      refs: [
        ref("schwartzberg-2002", "Schwartzberg, H.G. (2002). Modeling bean heating during batch roasting of coffee beans. In Engineering and Food for the 21st Century, pp. 862–881. CRC Press — moisture-loss and energy balances used by later roasting models."),
        ref("hernandez-2007", "Hernández, J.A., Heyd, B., Irles, C., Valdovinos, B. & Trystram, G. (2007). Analysis of the heat and mass transfer during coffee batch roasting. Journal of Food Engineering 78(4), 1141–1148."),
        ref("van-boekel-2006", "van Boekel, M.A.J.S. (2006). Formation of flavour compounds in the Maillard reaction. Biotechnology Advances 24(2), 230–233."),
        ref("labuza-1981", "Labuza, T.P. & Saltmarch, M. (1981). The nonenzymatic browning reaction as affected by water in foods. In Water Activity: Influences on Food Quality. Academic Press — browning rate peaks at water activity near 0.6–0.7."),
      ],
    },
    {
      title: "Density, altitude, green quality",
      refs: [
        ref("kamal-2021", "Kamal, B.K., Acharya, B., Srivastava, A.K. & Pandey, M. (2021). Effect of different altitudes in qualitative and quantitative attributes of green coffee beans (Coffea arabica) in Nepal. International Journal of Horticulture, Agriculture and Food Science 5(3), 1–7."),
        ref("randriani-2016", "Randriani, E., Dani & Mubassysyir, H. (2016). Physical bean quality of Arabica coffee cultivated at high and medium altitude. Pelita Perkebunan 32(3) — highland bulk density ~0.72 vs ~0.65 g/mL at medium altitude."),
      ],
    },
    {
      title: "Craft roasting (DTR, acids, body)",
      refs: [
        ref("rao-2014", "Rao, S. (2014). The Coffee Roaster’s Companion — DTR ~20–25%; the phase language used across specialty roasting."),
        ref("kornman-2017", "Kornman, C. (2017). The relationship between water activity and the Maillard reaction in roasting. Royal Coffee — preliminary sample-roaster tests: faster Maillard, more sweetness and acidity, less viscosity; slower, more body."),
        ref("yeretzian-2002", "Yeretzian, C., Jordan, A., Badoud, R. & Lindinger, W. (2002). From the green bean to the cup of coffee: investigating coffee roasting by on-line monitoring of volatiles. European Food Research and Technology 214, 92–104 — aromatics are made and then lost with heat and time."),
      ],
    },
    {
      title: "Kaffelogic (machine, boosts, Rest/RTD)",
      refs: [
        ref("hilder-boosts", "Hilder, C. Boosts – C/min vs %/min. Kaffelogic community — boosts as °C/min added to rate-of-rise error."),
        ref("kl-rtd", "Kaffelogic. RTD profile — drink in 1–3 days."),
        ref("kl-rest", "Kaffelogic. Rest profile — peak 3–5 days."),
        ref("kl-core-profiles", "Kaffelogic. Core profiles overview."),
        ref("fnq-rest", "Fnq. Rest time and profile selection. Kaffelogic community — the RTD rate-of-rise step, “T through crack” and CO₂."),
        ref("gcc-nano7", "Green Coffee Collective. Kaffelogic Nano 7: Everything You Need to Know — fluid-bed rest vs drum; RTD as the drink-now exception."),
        ref("kl-fan-default", "Kaffelogic. Uneven roasting — default fan 14 700 RPM; the Studio transform is a uniform RPM shift."),
        ref("kl-fan-load", "Kaffelogic. Fan profile vs load (BOOST)."),
        ref("kl-ref-load", "Kaffelogic. Reference load size (120 g)."),
        ref("kl-fan-community", "Kaffelogic community. Fan profiling — no drastic fan change into first crack."),
        ref("kl-profiles-census", "Public Nano 7 profile library — Kaffe’s fan-shape census of 101 profiles."),
      ],
    },
    {
      title: "Also cited in Kaffe’s notes",
      refs: [
        ref("munchow-2020", "Münchow, Alstrup, Steen & Giacalone (2020). Beverages 6:29 — colour is the stronger flavor predictor; at constant colour, development time moves the cup more than time to crack."),
        ref("alstrup-2020", "Alstrup, Petersen, Larsen & Münchow (2020). Beverages 6:70 — Agtron 76 held, post-crack time 90 / 143 / 266 / 390 s: short reads fruitier and more acidic, long roastier and more bitter."),
        ref("rao-dtr-2016", "Rao, S. (2016). Blog note on development time ratio — the 20–25% band as craft, not a law."),
        ref("rao-espresso-2017", "Rao, S. (2017). Blog note on roasting for espresso vs filter — espresso is often a slightly darker colour, not a much longer DTR."),
        ref("hilder-dta", "Hilder, C. Development Time Analysis. Kaffelogic community — on a fixed curve, raising roast level always raises DTR; default profiles sit near 20% at light levels."),
        ref("ribes-2020", "Ribes (2020). LightSide on a Nano 7 — 10% vs 15% DTR as espresso; 15% gained body and bitterness."),
        ref("wang-lim-2014", "Wang & Lim (2014). Food Research International — fast, hot roasts degas faster at equal roast degree, with larger pores."),
        ref("kl-roasters-companion", "Kaffelogic. Kaffelogic Roaster’s Companion — finish any negative boost before first crack begins."),
        ref("knopp-2006", "Knopp et al. (2006) — natural-process coffee carries more glucose and fructose, so it browns faster."),
      ],
    },
  ],
  limits: [
    "The numbers are calibrated for the Nano 7 fluid bed at about 120 g, not a drum or a 4 kg shop roaster.",
    "Kaffe has no bean-core thermometer or lot-specific kinetics — only the probe, density, moisture, process, variety and flavor.",
    "Colour is not modelled from time: a fast Nordic and a slow roast at the same “Light” level will not match in Agtron, so measure colour if you can.",
    "The probe reads air as well as bean (about 5–10 °C above the bean surface), and Kaffe does not shift its crack estimate for fan speed.",
    "There is no good kinetic data for anaerobic lots; their adjustments are guesses.",
    "Heater power headroom is not checked; a cold room, low mains or a wet, dense lot can leave a steep design curve out of reach.",
  ],
};

/* ------------------------------------------------------------------ */
/* Español                                                             */
/* ------------------------------------------------------------------ */

const BREW_ES: ScienceTab = {
  intro:
    "Brew te da una carta de partida, no un candado. Se arma primero con la investigación sobre extracción, luego con recetas de competencia publicadas y, donde la competencia no dice nada, con recetas confiables de la comunidad — y tu paladar tiene la última palabra.",
  sections: [
    {
      id: "extraction",
      title: "Fuerza, extracción y temperatura",
      body: [
        "La ciencia del café describe una taza con dos números, no con el gotero: **fuerza** (cuánto café hay disuelto, TDS) y **extracción** (cuánto del café molido terminó en la taza, PE). El objetivo clásico Golden Cup es cerca de **55 g/L** (~1:18), **18–22%** de extracción, con el agua sobre el café a **90–96 °C**.",
        "La temperatura funciona sobre todo como una perilla de velocidad. Un panel de UC Davis encontró que **87, 90 y 93 °C** casi no cambiaban el sabor una vez igualada la extracción con molienda y tiempo. Otro estudio de UC Davis encontró que la inmersión total se asienta cerca de **21%** de extracción sin importar tueste, molienda, ratio o temperatura (**80–99 °C**); el calor solo cambia qué tan rápido llegas, y el ratio fija la fuerza.",
        "Por eso Kaffe elige una receta de método, fija la temperatura que querrías a nivel del mar, la limita a tu ebullición local y solo entonces gasta lo que falte en molienda, tiempo o un ratio un poco más cerrado.",
      ],
      refs: ["sca-golden-cup", "batali-2020", "frost-2020", "liang-2021"],
    },
    {
      id: "altitude",
      title: "La altitud de tu cocina",
      body: [
        "Una tetera abierta no pasa de la ebullición local, que baja cerca de **1 °C cada 300 m**: ebullición ≈ 100 − altitud/300 °C. Eso da cerca de **95,0 °C** a 1 500 m, **94,0 °C** a 1 800 m y **91,4 °C** a 2 600 m; el clima la mueve unos ±0,5 °C. Kaffe apunta la tetera a no más de 1 °C bajo la ebullición local y te dice que viertas a hervor fuerte en vez de imprimir 96 °C cuando no llegas.",
        "**No** muele más fino solo porque una carta a nivel del mar queda fuera de alcance. A 2 000 m la tetera queda cerca de 92 °C — la temperatura publicada del 4:6 de Kasuya y dentro de la banda SCA. Molienda, tiempo y ratio solo se mueven cuando la tetera cae bajo el piso SCA de **92 °C** (por encima de unos 2 400 m, como Bogotá o Cuzco): por cada 3 °C que faltan, el pour-over suma cerca de **+20 s**, la inmersión **+40 s**, un ratio ~7% más cerrado y un paso de molienda más fino (dos como máximo). Esos tamaños son una estimación; tu lectura de Después del brew cierra el resto.",
        "La altitud de la cocina es su propio ajuste, aparte de los metros de finca de la bolsa. El espresso va a presión, así que un grupo a 93 °C sigue funcionando en altura; en una moka solo el agua de llenado queda limitada.",
      ],
      refs: ["boil-table", "pdg-2018", "batali-2020", "sca-golden-cup"],
    },
    {
      id: "competition",
      title: "Recetas de campeonato",
      body: [
        "Los campeones del World Brewers Cup, de AeroPress y de Barista escriben para un café, un tueste y un salón, y casi siempre un tueste **Light**. Kaffe los usa para calibrar sus cartas Light — cerca de **1:14–1:16**, **91–96 °C** y **~1:45–3:00** en filtro — y deja en la carta la temperatura publicada de cada campeón. Estas cartas quedan citadas y de solo lectura; Editar hace tu propia copia.",
        "Entre los campeones de filtro están McCarthy 2013 (Kalita), Kasuya 2016 (V60 4:6), Chad Wang 2017 (V60), Fukahori 2018 (GINA, mostrada como Clever), Du 2019 (Origami), Winton 2021 (V60), Hsu 2022 (OREA), Medina 2023 (Origami), Wölfl 2024 (OREA), Peng 2025 (SOLO, mostrada como V60) y Jaafar 2026 (UFO sobre una Switch). AeroPress trae a Stanica 2024, Pop 2025, Merikanto 2021 y Little 2022; el espresso sigue el grupo de Barista de cerca de **1:2–1:2,5**, **90–94 °C**, **25–30 s**.",
        "Cuando una receta publicada promete una taza, Kaffe la ofrece como opción de sabor — por ejemplo, el primer vertido más grande de Kasuya para brillo, o el agua más fresca de Pop y Merikanto para dulzor. Los tuestes oscuros no tienen recetas de competencia; esas cartas son oficio.",
      ],
      refs: ["mccarthy-2013", "kasuya-2016", "wang-2017", "du-2019", "hsu-2022", "medina-2023", "wolfl-2024", "peng-2025", "stanica-2024", "pop-2025", "merikanto-2021", "wbc-espresso"],
    },
    {
      id: "community",
      title: "Recetas de la comunidad y de cafeterías",
      body: [
        "Donde la investigación no nombra un gotero y el campeón usó equipo que quizá no tienes, Kaffe recurre a recetas muy usadas con números publicados: el V60, la prensa francesa, la Chemex, la moka, la Switch y el cold brew de James Hoffmann, el V60 con spin de Scott Rao, el doble bloom de Lance Hedrick y el protocolo de cupping de la SCA (**8,25 g / 150 g**, **93 °C**, **4 min**).",
        "Las recetas de cafetería entraron solo cuando una fuente primaria da los números; las que no coinciden entre fuentes se dejaron fuera. La Hario Switch tiene varios patrones de válvula con nombre, porque la misma dosis y agua puede ser una infusión, un pour-over o un híbrido.",
        "Muchas recetas dicen “recién hervida” para tuestes Light. Es una instrucción a nivel del mar; en altura Kaffe la convierte en hervor fuerte.",
      ],
      refs: ["hoffmann-v60", "hoffmann-french-press", "hoffmann-chemex", "hoffmann-moka", "hoffmann-switch", "fukahori-switch", "kasuya-super-hybrid", "hoffmann-cold-brew", "rao-v60", "hedrick-bloom", "sca-cupping", "cafe-recipes"],
    },
    {
      id: "grind",
      title: "Palabras de molienda y clicks de molino",
      body: [
        "Cada carta usa una de cinco palabras de molienda, de gruesa a fina. Elige tu molinillo en Cocina (cerca de **210** molinos de las cartas de Honest Coffee Guide) y Kaffe imprime **clicks de partida**, donde cero es burrs tocando. “Media” queda cerca del centro del rango de cada método, no en el borde fino.",
        "En pour-over, Switch, Clever, espresso y moka los clicks también siguen tu dosis: más dosis hace una cama más alta, así que va más gruesa para que el drenaje no se atasque, y un ratio más cerrado va más fino para conservar la extracción. La inmersión total no se mueve, porque igual se asienta en la misma extracción. En espresso la lista muestra solo molinillos aptos para espresso.",
        "Los clicks son un punto de partida, no un candado — el desgaste de los burrs y la densidad del grano mueven el número.",
      ],
      refs: ["honest-coffee-guide", "liang-2021"],
    },
    {
      id: "rest",
      title: "Rest, listo para tomar y desgasificación",
      body: [
        "El café fresco sigue soltando CO₂, y una cama con gas hace bloom, se abomba y puede extraer disparejo. Un tueste **Rest** desgasifica en la bolsa: el día de brew por defecto de Kaffe es el **4**, y un Rest Light sigue bien hasta cerca de **21 días** — el día 10 es normal. Un tueste **listo para tomar (RTD)** está hecho para tomarse en **1–3 días** y suele saber hueco después del día 4.",
        "Mientras un Light sigue haciendo bloom (hasta cerca del día 10; Medium cerca del día 6), Kaffe sugiere recetas que sacan el gas primero — un bloom largo de **3×** y 45–60 s, un doble bloom o un espresso Blooming — y evita moler más fino sobre esa cama. El espresso reposa más que el filtro; esos días son práctica de cafetería, no un paper.",
        "La etiqueta “pico 3–5 días” de Kaffelogic es cuando la taza empieza a asentarse, no cuando se muere. Scott Rao encuentra que el café tostado por aire suele querer 1–4 semanas, y en la comunidad del Nano dicen que reposa más que el de tambor — Kaffe lo trata como oficio.",
      ],
      refs: ["kl-rest", "kl-rtd", "gcc-nano7", "rao-resting", "hedrick-bloom"],
    },
    {
      id: "after-brew",
      title: "Después del brew: leer tu taza",
      body: [
        "Si tienes refractómetro, Después del brew toma tu Brix o TDS medido y ubica la taza en la carta de control de brew. Kaffe nunca inventa un TDS por ti. Extracción = TDS × líquido ÷ dosis, donde el líquido depende del método.",
        "En inmersión (prensa francesa, Clever, AeroPress, cupping, cold brew, sifón) es toda el agua, porque el líquido que queda en el café molido es tan fuerte como la taza. En pour-over es la taza drenada — cerca del agua menos **2 g por gramo** de café si no la pesas. En espresso es el shot pesado.",
        "La carta muestra la caja SCA (**1,15–1,35%** TDS) o la europea (**1,20–1,45%**), ambas con **18–22%** de extracción; las recetas que buscan más a propósito, como el V60 con spin de Rao, tienen su propia ventana. Mide a temperatura ambiente, pon el medidor en cero con tu agua de brew y filtra las muestras de espresso; Brix × 0,85 es solo una aproximación.",
      ],
      refs: ["sca-golden-cup", "liang-2021", "barista-hustle", "rao-v60"],
    },
    {
      id: "taste",
      title: "Cata: ácida o amarga, débil o fuerte",
      body: [
        "¿Sin refractómetro? Dos toques también sirven, según el Coffee Compass de Barista Hustle. **Ácida ↔ amarga** es extracción: ácida pide moler más fino o preparar un poco más largo; amarga, más grueso o más corto. **Débil ↔ fuerte** es fuerza: cierra el ratio para una taza más llena, ábrelo para una más suave.",
        "Esa división sigue la investigación: el ratio fija la fuerza, y la molienda y el tiempo fijan la extracción. Tu paladar siempre es la prueba final — la carta es solo un adelanto.",
        "El agua también cuenta. El estándar SCA apunta a cerca de **40 mg/L** de alcalinidad; el agua de la llave dura y alcalina amortigua los ácidos y aplana las tazas Light y brillantes, así que la carta te avisa cuando es probable.",
      ],
      refs: ["frost-2020", "liang-2021", "sca-golden-cup"],
    },
    {
      id: "your-coffee",
      title: "Lo que cambia la bolsa",
      body: [
        "Este café toma lo que viene impreso en un café comprado — origen, variedad, proceso, metros de finca — y lo convierte en densidad, tamaño de grano y un sesgo de sabor. No busca una receta aparte por país.",
        "Eso alimenta ajustes chicos y con signo: las metas brillantes, frutales o florales preparan cerca de 1 °C más caliente (siempre con el límite) y un poco más fino; body y dulce profundo, cerca de 2 °C más fresco y más grueso; naturales y honey van un paso más grueso en papel, porque tienden a atascar. No hay un estudio publicado detrás de estos ajustes; son oficio y fallarán con algunos lotes.",
      ],
      refs: [],
    },
  ],
  groups: [
    {
      title: "Investigación: extracción, temperatura, cupping",
      refs: [
        ref("sca-golden-cup", "Lockhart, E.E. / SCA. The Coffee Brewing Handbook y Golden Cup — ~55 g/L, 18–22% de extracción, 90–96 °C sobre el café; las cafeteras certificadas llegan a 92 °C en el primer minuto y nunca pasan de 96 °C."),
        ref("batali-2020", "Batali, M.E., Ristenpart, W.D. & Guinard, J.-X. (2020). Brew temperature, at fixed brew strength and extraction, has little impact on the sensory profile of drip brew coffee. Scientific Reports 10, 16450 — 87 / 90 / 93 °C con TDS y extracción iguales."),
        ref("frost-2020", "Frost, S.C., Ristenpart, W.D. & Guinard, J.-X. (2020). Effects of brew strength, brew yield, and roast on the sensory quality of drip brew coffee. Journal of Food Science — fuerza y extracción dominan; el tueste igual mueve atributos."),
        ref("liang-2021", "Liang, J., Chan, K.C. & Ristenpart, W.D. (2021). An equilibrium desorption model for the strength and extraction yield of full immersion brewed coffee. Scientific Reports 11, 6904 — la inmersión se asienta cerca de 21% de extracción con cualquier tueste, molienda y 80–99 °C; el ratio fija la fuerza."),
        ref("liang-2021-sca", "SCA News. How strong is the coffee you’re cupping? — resumen en lenguaje sencillo de Liang et al. (2021)."),
        ref("sca-cupping", "Specialty Coffee Association. Protocolo de cupping — 8,25 g / 150 mL, 93 °C, 4 min, romper y limpiar."),
      ],
    },
    {
      title: "Altitud",
      refs: [
        ref("boil-table", "Tabla barométrica de ebullición vs altitud (p. ej. 1 800 m → 94,0 °C), que coincide con ebullición ≈ 100 − altitud/300 °C."),
        ref("pdg-2018", "Perfect Daily Grind (2018). How elevation affects brew temperature — Tamas Erdélyi: a 1 524 m perdiste ~5,5 °C; en Bogotá o Cuzco muele más fino y/o usa presión."),
      ],
    },
    {
      title: "Competencia",
      refs: [
        ref("medina-2023", "Medina, C. (2023). World Brewers Cup — Origami, ~16 g / 250 g, 91 °C, cinco pulsos de 50 g."),
        ref("wolfl-2024", "Wölfl, M. (2024). World Brewers Cup — OREA V4, 17 g / 270 g, 93 °C, ~2:20."),
        ref("peng-2025", "Peng, G. (2025). World Brewers Cup — SOLO, 15 g / 210 g, 96 °C y luego 80 °C, 1:45."),
        ref("stanica-2024", "Stanica, G. (2024). World AeroPress Championship — invertida, 18 g / 100 g a 96 °C, diluida."),
        ref("pop-2025", "Pop, N. (2025). World AeroPress Championship — normal, 18 g / 100 g a 84 °C más un bypass de 70 g a 50 °C."),
        ref("merikanto-2021", "Merikanto, T. (2021). World AeroPress Championship — invertida, 18 g / 200 g a 80 °C, agitación suave."),
        ref("van-bunnik-2019", "van Bunnik, W. (2019). World AeroPress Championship — invertida 30 g / 100 g, ~40 s, diluida, servida a ~60 °C."),
        ref("kasuya-2016", "Kasuya, T. (2016). World Brewers Cup — el método 4:6: el primer 40% define ácido vs dulce (más agua en el primer vertido, más acidez)."),
        ref("wang-2017", "Wang, C. (2017). World Brewers Cup — V60, 15 g / 250 g, 92 °C, un vertido al centro, ~2:00."),
        ref("mccarthy-2013", "McCarthy, J. (2013). World Brewers Cup — Kalita Wave, 24 g / 380 g, vertido en columna con poca agitación, ~3:30."),
        ref("hsu-2022", "Hsu, S. Y. (2022). World Brewers Cup — OREA, 14 g / 200 g, primer vertido a 70 °C y luego 95 °C."),
        ref("du-2019", "Du, J. N. (2019). World Brewers Cup — Origami, 16 g / 240 g, 94 °C, tres vertidos, sin bloom, ~1:46."),
        ref("bull-2025", "Bull, J. (2025). US Brewers Cup — Hario Switch, primero percolación y luego infusión."),
        ref("wipvasutt-2023", "Wipvasutt, T. (2023). World AeroPress Championship — 16 g más 2 g a mitad del brew, 89 °C, bypass dividido."),
        ref("wbc-espresso", "World Barista Championship 2024–25, recetas de espresso del servicio abierto (grupo ~1:2–1:2,5, 90–94 °C). World Coffee Events / declaraciones de los competidores."),
        ref("sprofiler", "Perfiles de la comunidad SproFiler para Gaggiuino — Adaptive Light/Dark, Blooming espresso, Extractamundo Dos!, Londinium, Leva, Low High Low, Stock 9 Bar, Filter 2.1."),
      ],
    },
    {
      title: "Comunidad (Hoffmann y estilo SCA)",
      refs: [
        ref("hoffmann-v60", "Hoffmann, J. The Ultimate V60 Technique — bloom, 60% del vertido, revolver."),
        ref("rao-v60", "Rao, S. V60 — bloom con spin, dos vertidos, 20 g / 330 g, ~97 °C, 4:00–4:30."),
        ref("hedrick-bloom", "Hedrick, L. Doble bloom y luego un vertido rápido al centro (para cafés con gas)."),
        ref("hoffmann-iced", "Hoffmann, J. Filtro japonés con hielo — 65 g/L, 60% de agua caliente sobre 40% de hielo en la jarra."),
        ref("hoffmann-chemex", "Hoffmann, J. Chemex como adaptación del V60 — 30 g / 500 g, ~4:10."),
        ref("hoffmann-switch", "Hoffmann, J. Hario Switch de todos los días — 15 g / 250 g, ~2:00 de infusión, abrir a ~2:15."),
        ref("fukahori-switch", "Fukahori, E. Receta Switch de su tienda (MAME): bloom cerrado y luego vertido abierto al centro. Su rutina del WBrC 2018 fue una GINA a 17 g / 220 g, 80 / 95 / 80 °C."),
        ref("kasuya-super-hybrid", "Kasuya, T. Super Hybrid (2025) — 20 g / 300 g, bloom cerrado, vertidos del medio abiertos, último vertido cerrado y fresco a 70–80 °C, abrir a ~3:30."),
        ref("wibawa-switch", "Wibawa, R. Doble inmersión en una Switch — 15 g / 220 g, 86 °C y luego 92 °C (WBrC 2024, 3.º). Hario Asia / resúmenes de competidores."),
        ref("hoffmann-french-press", "Hoffmann, J. The Ultimate French Press Technique — 30 g / 500 g, romper la costra, dejar asentar, bajar el émbolo hasta la superficie."),
        ref("hoffmann-moka", "Hoffmann, J. Moka — agua caliente hasta la válvula, sin compactar, apagar en el primer chorro rubio."),
        ref("hoffmann-cold-brew", "Hoffmann, J. Cold brew — ~75 g / 1 L, refrigerador ~12 h, más fino que “piedras.”"),
        ref("ccc-cold-brew", "Counter Culture Coffee. Guía de cold brew — concentrado 1:8."),
      ],
    },
    {
      title: "Rest y listo para tomar (lado del tueste, para el día de brew)",
      refs: [
        ref("kl-rest", "Kaffelogic. Perfil Rest — pico 3–5 días."),
        ref("kl-rtd", "Kaffelogic. Perfil RTD — tomar en 1–3 días."),
        ref("gcc-nano7", "Green Coffee Collective. Guía del Kaffelogic Nano 7 — consejo de la comunidad: los tuestes Nano quieren más reposo que los de tambor. Se trata como oficio: Wang & Lim (2014, Food Res. Int.) encontraron que los tuestes rápidos y calientes desgasifican más rápido al mismo grado de tueste."),
        ref("rao-resting", "Rao, S. Resting roasts: is fresher better? — los tuestes por aire y lecho fluido suelen querer 1–4 semanas, no 3–5 días."),
      ],
    },
    {
      title: "También citado en las notas de Kaffe",
      refs: [
        ref("honest-coffee-guide", "Cartas de molinos de Honest Coffee Guide — bandas de micras por método para cerca de 210 molinos; de ahí salen los clicks de partida de Kaffe."),
        ref("barista-hustle", "Barista Hustle — citado junto a Liang et al. (2021) por el líquido que retiene el café usado (Liang midió 2,48 ± 0,19 g/g en una cama drenada)."),
        ref("cafe-recipes", "Recetas de cafetería bien documentadas (agregadas 2026-09): A Better 1-Cup V60 de Hoffmann (Hario USA), April Coffee Roasters, Tim Wendelboe, Stumptown, sifón de Sprudge y Blue Bottle, batch SCA Golden Cup, Batch Brew Basics y allongé de Scott Rao (docs de Decent), Kyoto slow drip (Hario / Coffee Circle)."),
        ref("wac-archive", "World AeroPress Championship — archivo completo de recetas."),
      ],
    },
  ],
  limits: [
    "La carta es un adelanto; tu paladar tiene la última palabra.",
    "Las recetas de competencia Light calibran solo filtro y espresso Light — Medium se apoya en la práctica SCA, y Dark es oficio.",
    "Kaffe no modela la química del agua (ppm, calcio, magnesio); Medina especificó ~65 ppm y Kaffe no.",
    "Los clicks de molino son un punto de partida: el desgaste de los burrs y la densidad del grano mueven el número real.",
    "Después del brew necesita un Brix o TDS medido; Kaffe no inventa un objetivo de TDS.",
    "Los ajustes por sabor y variedad no salen de un paper y fallarán con algunos lotes.",
  ],
};

const ROAST_ES: ScienceTab = {
  intro:
    "Kaffe no elige una plantilla de 6, 9 u 11 minutos para estirarla. Estima qué tan rápido tu grano va a secarse, dorarse, hacer crack y desarrollarse según lo que sabes del lote, y luego dibuja la curva — hoy calibrada para la Kaffelogic Nano 7.",
  sections: [
    {
      id: "phases",
      title: "Las fases de un tueste",
      body: [
        "El **drying** va de la carga al amarillo, cerca de **150 °C**, mientras el agua se evapora y enfría el grano. **Maillard** va del amarillo al first crack: azúcares y aminoácidos se doran en aroma, dulzor y cuerpo. El **first crack** es el vapor rompiendo la pared celular, cerca de **196–205 °C** dentro del grano. El **development** es el tiempo del crack al drop, y define el grado de tueste.",
        "Kaffe estima la velocidad de cada fase, la temperatura y el tiempo del crack y el development, y luego nombra el resultado por tiempo total: Nordic bajo **7:45**, Classic **7:45–10:00**, Slow sobre **10:00**. El nombre describe, no controla.",
        "Los números están calibrados para la Kaffelogic Nano 7, una tostadora de aire en lecho fluido a cerca de **120 g**, la única que Kaffe soporta hoy. Otra máquina calienta, mide y carga distinto, así que necesita su propia calibración; Kaffe no traduce un perfil Nano a otra tostadora.",
      ],
      refs: ["rao-2014", "van-boekel-2006", "schwartzberg-2002"],
    },
    {
      id: "moisture",
      title: "Humedad y drying",
      body: [
        "La investigación de tueste modela la salida del agua como una difusión impulsada por el calor, y la evaporación se lleva mucha energía. Por eso el grano más húmedo, más grande o más denso **sube más lento** de cerca de 50 a 150 °C. Kaffe no corre ese modelo completo; mantiene las mismas direcciones, medidas contra una referencia de **680 g/L** y **11%** de humedad.",
        "Los granos grandes como Pacamara y Maragogipe tardan más en calentarse por dentro; el lavado seca un poco más rápido que el natural, honey o anaerobic. Un drying y un Maillard más rápidos suelen dar más brillo y aroma con menos cuerpo; más lentos dan más caramelo y chocolate, con más viscosidad.",
      ],
      refs: ["schwartzberg-2002", "hernandez-2007", "labuza-1981", "kornman-2017"],
    },
    {
      id: "first-crack",
      title: "Predecir el first crack",
      body: [
        "Kaffe estima el crack desde la densidad: crack ≈ 203,5 + 3,8 × (densidad − 680) / 80 °C. Un grano más denso tiene una pared más fuerte que romper. Esa pendiente es una heurística propia de Kaffe — ningún estudio publicado relaciona densidad y temperatura de crack, y Kaffelogic solo dice que el crack suele empezar cerca de **205 °C**. Los lavados llevan −0,5 °C, los naturales +0,3 °C, y un crack estimado se mantiene al menos **4 °C** bajo el drop para que un Light conserve una banda de development.",
        "La humedad retrasa **cuándo** llega el crack, no su temperatura. La sonda expuesta del Nano marca varios grados más que el centro del grano (cerca de 203–210 °C en el crack). La mejor estimación es la tuya: anota dónde hace crack este lote y ponlo en First crack esperado.",
      ],
      refs: ["hernandez-2007", "schwartzberg-2002"],
    },
    {
      id: "development",
      title: "Development y DTR",
      body: [
        "DTR = tiempo después del first crack ÷ tiempo total hasta el drop. Münchow y colegas encontraron que el **color** del tueste predice más el sabor, pero con el mismo color el **tiempo de development** movió la taza más que el tiempo hasta el crack. Con Agtron 76 fijo y cambiando solo el tiempo después del crack, el development corto supo más frutal, dulce y ácido; el largo, más tostado, a nuez y amargo.",
        "El conocido **20–25%** es la banda de oficio de Scott Rao para tambores cargados, y él mismo nota que las tostadoras de mucha energía desarrollan bien cerca de **15%**. El Nano es un lecho fluido de mucha potencia, así que Kaffe trabaja en **15–27%**, suma un poco para espresso, resta un poco para filtro Light y diseña al menos **60 s** de development.",
        "El nivel de tueste de Kaffelogic (0,1–5,9) es una parada en la tabla de temperaturas del perfil, no un color ni un DTR. El Light de Kaffe es **1,6** (~209 °C), Medium **3,2** (~212 °C), Dark **4,6** (~215 °C): el estilo fija la temperatura de drop y la curva se rehace para que el DTR quede en banda.",
      ],
      refs: ["munchow-2020", "alstrup-2020", "rao-2014", "rao-dtr-2016", "rao-espresso-2017", "hilder-dta", "ribes-2020"],
    },
    {
      id: "density",
      title: "Densidad desde la altitud de la finca",
      body: [
        "Las fincas más altas suelen dar granos más densos. Un estudio de Nepal de 2021 midió cerca de **620 kg/m³** a 800–900 m subiendo a cerca de **688 kg/m³** a 1 400–1 500 m — unos **0,11 g/L por metro** — y un estudio de Indonesia encontró la misma dirección.",
        "Sin una medición, Kaffe estima densidad ≈ 640 + 0,11 × (altitud − 850) g/L, entre 600 y 780, y luego la ajusta por origen y variedad. Si mediste el lote, apaga Densidad por altitud: el grano más denso recibe más preheat y un drying más largo; el más blando, menos preheat y más fan.",
      ],
      refs: ["kamal-2021", "randriani-2016"],
    },
    {
      id: "boosts",
      title: "Boosts",
      body: [
        "El kit BOOST es hardware; una **zona** de boost es software. El Nano se guía por el rate of rise, y un boost suma una cantidad fija de °C/min a ese objetivo — como apuntar contra la corriente al navegar. Si el tueste se sale de la línea de diseño el boost se diluye: +5 °C/min por 2 minutos no garantiza +10 °C.",
        "Siguiendo a Rao, un tueste debería entrar al crack ya desacelerando, así que en Rest Kaffe nunca agrega calor hacia el crack por su cuenta. Su freno de flick va de cerca de **45 s** a **3 s** antes del crack, a **−2 a −6 °C/min**, porque Kaffelogic aconseja terminar cualquier boost negativo antes de que empiece el crack.",
        "De las tres zonas del Nano, Rest solo enciende una cuando el grano la necesita: drying para lotes húmedos (cerca de 12% o más) o naturales y anaerobic densos, Maillard para honey o metas de cuerpo, y un freno después del crack para tuestes oscuros, espresso o de cuerpo que llegan calientes.",
      ],
      refs: ["hilder-boosts", "rao-2014", "kl-roasters-companion"],
    },
    {
      id: "rtd",
      title: "Rest vs listo para tomar",
      body: [
        "**Rest** (por defecto) sigue los perfiles Rest de Kaffelogic: el CO₂ se queda en el grano y sale en la bolsa, con pico **3–5 días** después del tueste. **RTD** sigue los perfiles listos para tomar de Kaffelogic: el tueste mismo saca el CO₂, así que el café está mejor en **1–3 días** y se cae hacia el día 4.",
        "En RTD, Kaffe agrega un escalón de rate of rise en Maillard y un boost a través del first crack, usa pendientes un poco más empinadas y omite el freno después del crack, que retendría el gas. Rest usa boosts solo donde el grano los necesita.",
        "En la comunidad se dice que los tuestes del Nano necesitan más reposo que el café de tambor. Kaffe lo trata como oficio: un estudio encontró que los tuestes rápidos y calientes en realidad desgasifican **más rápido** al mismo grado de tueste. El switch Cuándo tomar es esta elección — no el kit BOOST.",
      ],
      refs: ["kl-rest", "kl-rtd", "kl-core-profiles", "fnq-rest", "gcc-nano7", "wang-lim-2014"],
    },
    {
      id: "flavor",
      title: "Metas de sabor",
      body: [
        "Puedes elegir hasta dos metas de sabor; dos elecciones se reparten un mismo presupuesto. Floral, frutal, brillante y jugoso se apoyan en un drying y un Maillard más empinados con development más corto, porque los aromas volátiles y los ácidos se pierden con calor y tiempo. Dulce profundo y cuerpo se apoyan en un Maillard más largo y más development, porque los compuestos del dorado necesitan tiempo.",
        "Son reglas de oficio de la práctica de tueste, no un mapa publicado de una palabra de sabor a una curva. Un tueste no puede crear notas que el grano no tiene — el color y el tiempo mueven un espacio compartido de acidez y dorado; no reescriben el origen. Por eso un estilo Dark marca floral y frutal como a evitar, y por eso la variedad y el proceso ajustan las sugerencias.",
      ],
      refs: ["rao-2014", "kornman-2017", "yeretzian-2002", "van-boekel-2006", "munchow-2020"],
    },
    {
      id: "fan",
      title: "Fan",
      body: [
        "El fan por defecto del Nano es **14 700 RPM**. En **101** perfiles públicos del Nano (sep. 2026), 72 empiezan cerca de 14 700, la bajada mediana es de **1 500 RPM** y la mayoría baja el fan a mitad del tueste, no en el crack.",
        "Kaffe sigue esa forma oficial actual — más aire durante el drying para sacar la humedad y mantener el lecho parejo, y menos en development para que el calentador termine — bajando de cerca de 14 700 a 13 200 RPM, sin caída tardía y sin desplome en el crack. El tamaño de la carga no cambia la forma; el firmware BOOST ajusta la velocidad del fan según la carga, alrededor de la referencia de **120 g**.",
      ],
      refs: ["kl-fan-default", "kl-profiles-census", "kl-fan-community", "kl-fan-load", "kl-ref-load", "schwartzberg-2002"],
    },
  ],
  groups: [
    {
      title: "Calor, masa, Maillard",
      refs: [
        ref("schwartzberg-2002", "Schwartzberg, H.G. (2002). Modeling bean heating during batch roasting of coffee beans. En Engineering and Food for the 21st Century, pp. 862–881. CRC Press — balances de humedad y energía que usan los modelos de tueste posteriores."),
        ref("hernandez-2007", "Hernández, J.A., Heyd, B., Irles, C., Valdovinos, B. & Trystram, G. (2007). Analysis of the heat and mass transfer during coffee batch roasting. Journal of Food Engineering 78(4), 1141–1148."),
        ref("van-boekel-2006", "van Boekel, M.A.J.S. (2006). Formation of flavour compounds in the Maillard reaction. Biotechnology Advances 24(2), 230–233."),
        ref("labuza-1981", "Labuza, T.P. & Saltmarch, M. (1981). The nonenzymatic browning reaction as affected by water in foods. En Water Activity: Influences on Food Quality. Academic Press — el dorado es más rápido con actividad de agua cerca de 0,6–0,7."),
      ],
    },
    {
      title: "Densidad, altitud, calidad del verde",
      refs: [
        ref("kamal-2021", "Kamal, B.K., Acharya, B., Srivastava, A.K. & Pandey, M. (2021). Effect of different altitudes in qualitative and quantitative attributes of green coffee beans (Coffea arabica) in Nepal. International Journal of Horticulture, Agriculture and Food Science 5(3), 1–7."),
        ref("randriani-2016", "Randriani, E., Dani & Mubassysyir, H. (2016). Physical bean quality of Arabica coffee cultivated at high and medium altitude. Pelita Perkebunan 32(3) — densidad aparente ~0,72 en altura vs ~0,65 g/mL a altitud media."),
      ],
    },
    {
      title: "Oficio de tueste (DTR, ácidos, cuerpo)",
      refs: [
        ref("rao-2014", "Rao, S. (2014). The Coffee Roaster’s Companion — DTR ~20–25%; el lenguaje de fases que usa el tueste de especialidad."),
        ref("kornman-2017", "Kornman, C. (2017). The relationship between water activity and the Maillard reaction in roasting. Royal Coffee — pruebas preliminares en tostadora de muestras: Maillard más rápido, más dulzor y acidez, menos viscosidad; más lento, más cuerpo."),
        ref("yeretzian-2002", "Yeretzian, C., Jordan, A., Badoud, R. & Lindinger, W. (2002). From the green bean to the cup of coffee: investigating coffee roasting by on-line monitoring of volatiles. European Food Research and Technology 214, 92–104 — los aromas se forman y luego se pierden con calor y tiempo."),
      ],
    },
    {
      title: "Kaffelogic (máquina, boosts, Rest/RTD)",
      refs: [
        ref("hilder-boosts", "Hilder, C. Boosts – C/min vs %/min. Comunidad Kaffelogic — los boosts como °C/min sumados al error de rate of rise."),
        ref("kl-rtd", "Kaffelogic. Perfil RTD — tomar en 1–3 días."),
        ref("kl-rest", "Kaffelogic. Perfil Rest — pico 3–5 días."),
        ref("kl-core-profiles", "Kaffelogic. Resumen de perfiles de fábrica."),
        ref("fnq-rest", "Fnq. Rest time and profile selection. Comunidad Kaffelogic — el escalón de rate of rise en RTD, “T through crack” y el CO₂."),
        ref("gcc-nano7", "Green Coffee Collective. Kaffelogic Nano 7: Everything You Need to Know — reposo en lecho fluido vs tambor; RTD como la excepción para tomar ya."),
        ref("kl-fan-default", "Kaffelogic. Tueste disparejo — fan por defecto 14 700 RPM; la transformación de Studio es un desplazamiento uniforme de RPM."),
        ref("kl-fan-load", "Kaffelogic. Perfil de fan vs carga (BOOST)."),
        ref("kl-ref-load", "Kaffelogic. Tamaño de carga de referencia (120 g)."),
        ref("kl-fan-community", "Comunidad Kaffelogic. Perfilado de fan — sin cambios bruscos de fan hacia el first crack."),
        ref("kl-profiles-census", "Biblioteca pública de perfiles Nano 7 — el censo de formas de fan de Kaffe sobre 101 perfiles."),
      ],
    },
    {
      title: "También citado en las notas de Kaffe",
      refs: [
        ref("munchow-2020", "Münchow, Alstrup, Steen & Giacalone (2020). Beverages 6:29 — el color predice más el sabor; con el mismo color, el tiempo de development mueve la taza más que el tiempo hasta el crack."),
        ref("alstrup-2020", "Alstrup, Petersen, Larsen & Münchow (2020). Beverages 6:70 — Agtron 76 fijo, tiempo después del crack 90 / 143 / 266 / 390 s: corto sabe más frutal y ácido, largo más tostado y amargo."),
        ref("rao-dtr-2016", "Rao, S. (2016). Nota de blog sobre el development time ratio — la banda de 20–25% como oficio, no como ley."),
        ref("rao-espresso-2017", "Rao, S. (2017). Nota de blog sobre tostar para espresso vs filtro — el espresso suele ser de un color un poco más oscuro, no de un DTR mucho más largo."),
        ref("hilder-dta", "Hilder, C. Development Time Analysis. Comunidad Kaffelogic — en una curva fija, subir el nivel de tueste siempre sube el DTR; los perfiles por defecto quedan cerca de 20% en niveles claros."),
        ref("ribes-2020", "Ribes (2020). LightSide en un Nano 7 — 10% vs 15% de DTR como espresso; con 15% ganó cuerpo y amargor."),
        ref("wang-lim-2014", "Wang & Lim (2014). Food Research International — los tuestes rápidos y calientes desgasifican más rápido al mismo grado de tueste, con poros más grandes."),
        ref("kl-roasters-companion", "Kaffelogic. Kaffelogic Roaster’s Companion — termina cualquier boost negativo antes de que empiece el first crack."),
        ref("knopp-2006", "Knopp et al. (2006) — el café de proceso natural trae más glucosa y fructosa, así que se dora más rápido."),
      ],
    },
  ],
  limits: [
    "Los números están calibrados para el lecho fluido del Nano 7 a cerca de 120 g, no para un tambor ni una tostadora de 4 kg.",
    "Kaffe no tiene termómetro en el centro del grano ni cinética por lote — solo la sonda, densidad, humedad, proceso, variedad y sabor.",
    "El color no se modela desde el tiempo: un Nordic rápido y un tueste lento con el mismo nivel “Light” no van a coincidir en Agtron, así que mide el color si puedes.",
    "La sonda lee aire además de grano (cerca de 5–10 °C sobre la superficie del grano), y Kaffe no corrige su estimación de crack por la velocidad del fan.",
    "No hay buenos datos cinéticos para lotes anaerobic; sus ajustes son suposiciones.",
    "No se revisa el margen de potencia del calentador; un cuarto frío, voltaje bajo o un lote húmedo y denso pueden dejar fuera de alcance una curva de diseño empinada.",
  ],
};

export const SCIENCE: Record<"en" | "es", Record<ScienceTopic, ScienceTab>> = {
  en: { brew: BREW_EN, roast: ROAST_EN },
  es: { brew: BREW_ES, roast: ROAST_ES },
};
