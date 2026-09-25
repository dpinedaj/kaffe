import { interpolate } from "./translate";
import type { Locale } from "./translate";

const en = {
  "tech.switch.steep.flavor": "Body / chocolate",
  "tech.switch.steep.mechanic": "Closed the whole steep, open to drain",
  "tech.switch.steep.blurb":
    "Hoffmann daily driver. Forgiving, more body. Best for Dark, heavy/sweet roasts, and naturals that clog.",
  "tech.switch.fukahori.flavor": "Fruit / clarity",
  "tech.switch.fukahori.mechanic": "Closed bloom, then open for the rest",
  "tech.switch.fukahori.blurb":
    "Emi Fukahori / MAME shops. Closed bloom then open pour. Her WBrC 2018 win was the GINA 80/95/80 (on Clever here).",
  "tech.switch.hybrid.flavor": "Sweet / rounded",
  "tech.switch.hybrid.mechanic": "Closed bloom → open mid pours → closed last pour → open drain",
  "tech.switch.hybrid.blurb":
    "Tetsu Kasuya 2025 Super Hybrid. Sweetness and body without a harsh finish. Default for Light without a loud acid goal.",
  "tech.switch.hold.flavor": "Balanced / Medium",
  "tech.switch.hold.mechanic": "Closed bloom + first pour, open last pour",
  "tech.switch.hold.blurb":
    "Shop hybrid: more body than Fukahori, more clarity than a full steep. Suggested for Medium washed cups.",
  "tech.switch.double.flavor": "Clean / controlled",
  "tech.switch.double.mechanic": "Closed pulse, drain, closed pulse, drain",
  "tech.switch.double.blurb":
    "Ryan Wibawa (WBrC 2024, 3rd on a Switch). Two short immersions. Cleaner than one long steep.",
  "tech.switch.bull.flavor": "Acid then sweet",
  "tech.switch.bull.mechanic": "Valve open for the first pour, close to steep, open to drain",
  "tech.switch.bull.blurb":
    "Justin Bull, US Brewers Cup 2025 (then WBrC hybrid 40% percolation / 60% immersion). Open first for acidity, closed steep for sweetness and body. The inverse of closed-first.",

  "tech.aeropress.stanica.flavor": "Fruit / acid",
  "tech.aeropress.stanica.mechanic": "Inverted concentrate at ~96 °C, dilute",
  "tech.aeropress.stanica.blurb":
    "George Stanica, WAC 2024. Hot inverted 18 g / 100 g at 96 °C, press ~76–79 g, dilute. Bright Light filter in an AeroPress.",
  "tech.aeropress.pop.flavor": "Sweet / defined",
  "tech.aeropress.pop.mechanic": "Upright 84 °C brew, 50 °C bypass in the carafe",
  "tech.aeropress.pop.blurb":
    "Némo Pop, WAC 2025. The temperate-water recipe: 18 g, 100 g at 84 °C, 70 g bypass at 50 °C. Sweetness and definition, less bitterness.",
  "tech.aeropress.merikanto.flavor": "Sweet-sour balance",
  "tech.aeropress.merikanto.mechanic": "Inverted, 80 °C, gentle stir, no bypass",
  "tech.aeropress.merikanto.blurb":
    "Tuomas Merikanto, WAC 2021. 18 g / 200 g at 80 °C, coarse, almost no agitation — temperate water to strip astringency off a Light roast.",
  "tech.aeropress.wendelien.flavor": "Acid + sweet",
  "tech.aeropress.wendelien.mechanic": "Inverted 30 g / 100 g, 40 s press, dilute",
  "tech.aeropress.wendelien.blurb":
    "Wendelien van Bunnik, WAC 2019. Short, violent concentrate, then bypass and cool the cup to ~60 °C. Acidity and sweetness together.",
  "tech.aeropress.tay.flavor": "Aroma / Kenya-like",
  "tech.aeropress.tay.mechanic": "Add 2 g more grounds at 0:45, then room-temp + hot bypass",
  "tech.aeropress.tay.blurb":
    "Tay Wipvasutt, WAC 2023. 16 g in, 2 g more mid-brew, press ~75 g, then room-temp water then hot. Aroma without a second temperate kettle.",

  "tech.v60.hoffmann.flavor": "Balanced / daily",
  "tech.v60.hoffmann.mechanic": "Bloom, 60% pour, stir N–S / E–W",
  "tech.v60.hoffmann.blurb":
    "Community skeleton. Body and evenness. The card default when no louder flavor goal is set.",
  "tech.v60.kasuya-acid.flavor": "Bright / juicy",
  "tech.v60.kasuya-acid.mechanic": "Larger first pour of the first 40%",
  "tech.v60.kasuya-acid.blurb":
    "Tetsu Kasuya, WBrC 2016. First 40% sets acid vs sweet: more water in pour 1 = more acidity. Then three equal pours for strength.",
  "tech.v60.kasuya-sweet.flavor": "Honey / sweet",
  "tech.v60.kasuya-sweet.mechanic": "Smaller first pour of the first 40%",
  "tech.v60.kasuya-sweet.blurb":
    "Same 4:6 method. Less water in pour 1, more in pour 2 — Kasuya’s own WBrC 2016 cup was this sweet side.",
  "tech.v60.peng.flavor": "Floral / clean finish",
  "tech.v60.peng.mechanic": "96 °C bloom and mid pour, 80 °C last pour",
  "tech.v60.peng.blurb":
    "George Peng, WBrC 2025 (Solo, adapted here to a V60). Hot front for structure, cool last pour to keep florals and cut late bitterness.",
  "tech.v60.chad.flavor": "Clear / tea-like",
  "tech.v60.chad.mechanic": "Bloom, then one continuous centre pour. No spirals.",
  "tech.v60.chad.blurb":
    "Chad Wang, WBrC 2017. 15 g / 250 g at 92 °C, ~2:00. He skipped pre-warming the cone and poured only in the centre.",
  "tech.v60.rao.flavor": "Even / high extraction",
  "tech.v60.rao.mechanic": "Aggressive bloom spin, two pours, gentle spins",
  "tech.v60.rao.blurb":
    "Scott Rao. Plastic V60, 20 g / 330 g at ~97 °C, 4:00–4:30. The spin levels the bed so you can push extraction without bitterness.",
  "tech.v60.hedrick.flavor": "Clear / gassy lots",
  "tech.v60.hedrick.mechanic": "45 g, 90 g, then a fast centre pour. No swirl on the blooms.",
  "tech.v60.hedrick.blurb":
    "Lance Hedrick. Two blooms dump CO₂ so the main pour does not channel. Suggested while a Light Rest lot is still gassy.",
  "tech.v60.iced.flavor": "Bright / flash-chill",
  "tech.v60.iced.mechanic": "Hot brew onto ice in the server · 60% hot / 40% ice",
  "tech.v60.iced.blurb":
    "Hoffmann iced filter. Not cold brew — aromatics lock in as the coffee hits ice. Grind a click finer. Select this when you want a cold cup.",

  "tech.kalita.wave.flavor": "Even / daily",
  "tech.kalita.wave.mechanic": "Centre pulses, keep a flat bed",
  "tech.kalita.wave.blurb": "Café / older WBrC flat-bottom skeleton. Forgiving. Suggested for Medium / Dark.",
  "tech.kalita.mccarthy.flavor": "Sweet / low bitter",
  "tech.kalita.mccarthy.mechanic": "Bloom, then keep a water column — no aggressive spirals",
  "tech.kalita.mccarthy.blurb":
    "James McCarthy, WBrC 2013. Kalita Wave, 24 g / 380 g, just off boil, ~3:30. Restricted flow so the column absorbs agitation and pulls sweetness, not bitterness.",

  "tech.origami.medina.flavor": "Even / Light",
  "tech.origami.medina.mechanic": "Five 50 g-style pulses, 30 s apart",
  "tech.origami.medina.blurb": "Carlos Medina, WBrC 2023. 15.5–16 g / 250 g at 91 °C. The current Origami card.",
  "tech.origami.du.flavor": "Vivid acid / floral",
  "tech.origami.du.mechanic": "60 → 140 → 240, no separate bloom, ~1:46",
  "tech.origami.du.blurb":
    "Jia-Ning Du, WBrC 2019. 16 g / 240 g at 94 °C. Fast, high-energy extraction — the first Origami world win.",

  "tech.orea.wolfl.flavor": "Clean / Light",
  "tech.orea.wolfl.mechanic": "Four pours, fast flat bed, ~2:20",
  "tech.orea.wolfl.blurb": "Martin Wölfl, WBrC 2024. 17 g / 270 g at 93 °C. The current OREA card.",
  "tech.orea.hsu.flavor": "Wild fruit / tame ferment",
  "tech.orea.hsu.mechanic": "First pour 70 °C, then 95 °C pulses",
  "tech.orea.hsu.blurb":
    "Shih Yuan Hsu, WBrC 2022. 14 g / 200 g. Cool opening tames fermented fruit; hotter pulses build sweetness. The inverse of Peng.",

  "tech.frenchpress.hoffmann.flavor": "Clean / Light",
  "tech.frenchpress.hoffmann.mechanic": "Break at 4:00, settle to ~9:00, plunge to the surface",
  "tech.frenchpress.hoffmann.blurb": "Ultimate French Press. The long settle drops silt. Suggested for Light.",
  "tech.frenchpress.classic.flavor": "Body / Dark",
  "tech.frenchpress.classic.mechanic": "Break, plunge, pour — no long settle",
  "tech.frenchpress.classic.blurb": "Four-minute press. More body, more silt. Suggested for Dark or heavy/sweet.",

  "tech.coldbrew.rtd.flavor": "Smooth / daily",
  "tech.coldbrew.rtd.mechanic": "~1:13, 12–16 h in the fridge",
  "tech.coldbrew.rtd.blurb": "Hoffmann-style ready-to-drink. Suggested for Light.",
  "tech.coldbrew.concentrate.flavor": "Heavy / travel",
  "tech.coldbrew.concentrate.mechanic": "1:8 fridge steep, then cut with water or ice",
  "tech.coldbrew.concentrate.blurb": "Counter Culture concentrate. Suggested for Dark or when you want a stronger base.",

  "tech.clever.steep.flavor": "Body / even",
  "tech.clever.steep.mechanic": "On the counter ~2:00, then on the cup",
  "tech.clever.steep.blurb": "Full immersion, then drain. Suggested for Dark, heavy, or naturals.",
  "tech.clever.short.flavor": "Brighter / Light",
  "tech.clever.short.mechanic": "On the counter ~1:15, then drain",
  "tech.clever.short.blurb": "Less contact, more clarity. Suggested for Light + acid.",
  "tech.clever.gina.flavor": "Layered sweet → open → juicy",
  "tech.clever.gina.mechanic": "Closed 80 °C, open 95 °C, closed 80 °C",
  "tech.clever.gina.blurb":
    "Emi Fukahori, WBrC 2018 on a GINA. Maps to a Clever: immerse cool (sweetness), drip hot (layers), immerse cool (juicy body). The world-winning temperature switch.",

  "tech.espresso.adaptive-light.flavor": "Sweet / clear",
  "tech.espresso.adaptive-light.mechanic": "Flow-aware, descending pressure after a hold",
  "tech.espresso.adaptive-light.blurb":
    "SproFiler Adaptive for Light Roast. Descending pressure for sweetness and clarity at the expense of body. Light default on a Gaggiuino.",
  "tech.espresso.blooming.flavor": "Floral / pour-over-like",
  "tech.espresso.blooming.mechanic": "Flow-controlled fill, long soak, then extract",
  "tech.espresso.blooming.blurb":
    "SproFiler Blooming espresso. Saturate the puck, then extract. Best for Light, complex lots — flavours like a pour-over, less sour sharpness.",
  "tech.espresso.extractamundo.flavor": "Fruit / high extraction",
  "tech.espresso.extractamundo.mechanic": "Fast fill to 4.5 bar, short soak, 3 ml/s capped at 6 bar",
  "tech.espresso.extractamundo.blurb":
    "SproFiler Extractamundo Dos! IUIUIU turbo. Light roasts, ~15–20 s. Paper in the basket if you use a VST/IMS.",
  "tech.espresso.lhl.flavor": "Bright / less harsh",
  "tech.espresso.lhl.mechanic": "Fast 1:3.5, pressure up then down. Needs scales.",
  "tech.espresso.lhl.blurb":
    "SproFiler Low High Low. 17 g → 60 g. High ratio, lower TDS, fewer harsh notes on Light. Phase-2 flow 5–8 g/s, 5–7 bar.",
  "tech.espresso.londinium.flavor": "Syrup / body",
  "tech.espresso.londinium.mechanic": "Lever-style rise, then a declining spring",
  "tech.espresso.londinium.blurb":
    "SproFiler Londinium (Leva 6 / Leva 9 are the same family). Smooth, syrupy, works across roasts. Medium and heavy/sweet default.",
  "tech.espresso.adaptive-dark.flavor": "Creamy / chocolate",
  "tech.espresso.adaptive-dark.mechanic": "Lower temp, higher hold pressure, slower tail flow",
  "tech.espresso.adaptive-dark.blurb": "SproFiler Adaptive Dark Roast. Cooler (~88 °C), creamier Dark shot.",
  "tech.espresso.stock.flavor": "Classic / café",
  "tech.espresso.stock.mechanic": "Pump-on 9 bar, you stop the shot",
  "tech.espresso.stock.blurb":
    "SproFiler Stock - 9 Bar. Stock Gaggia Classic feel. Dial by time or weight like before the mod. 9 bar is a ceiling, not a target.",
  "tech.espresso.filter.flavor": "Filter cup / machine only",
  "tech.espresso.filter.mechanic": "Paper in the basket, 1:5, then dilute ~230 g",
  "tech.espresso.filter.blurb":
    "SproFiler Filter. Coarser than espresso, paper + puck screen, pull ~5:1, cut with 225–250 g water. When the Gaggia is the only brewer.",

  "tech.chemex.hoffmann.flavor": "Clean / paper",
  "tech.chemex.hoffmann.mechanic": "Bloom, 60% pour, stir and shake — 30 g : 500 g, ~4:10",
  "tech.chemex.hoffmann.blurb":
    "Hoffmann Chemex as a V60. Thick bonded paper, slower and cleaner than a cone. The one published skeleton we keep.",
  "tech.moka.hoffmann.flavor": "Body / chocolate",
  "tech.moka.hoffmann.mechanic": "Hot fill to the valve, no tamp, off at first blonde",
  "tech.moka.hoffmann.blurb":
    "Hoffmann moka. Not espresso — stop when the stream turns honey. The one published skeleton we keep.",
  "tech.cupping.sca.flavor": "Reference / even",
  "tech.cupping.sca.mechanic": "8.25 g / 150 g, 93 °C, 4 min, break and skim",
  "tech.cupping.sca.blurb": "SCA cupping protocol. The academic reference cup, not a drink recipe.",

  "step.stall.natural": " Naturals clog — pour gentler and stop if the bed dams.",
  "step.at.prep": "Prep",
  "step.at.taste": "Taste",
  "step.at.filter": "Filter",
  "step.at.dilute": "Dilute",
  "step.at.soak": "Soak",
  "step.at.rise": "Rise",
  "step.at.decline": "Decline",
  "step.at.stop": "Stop",
  "step.at.fridge": "Fridge",

  "step.switch.bull.prep.title": "Open first",
  "step.switch.bull.prep.detail":
    "Justin Bull USBC 2025 / WBrC hybrid: percolation first for acidity, then a closed steep for sweetness.",
  "step.switch.bull.pour.title": "Open pour",
  "step.switch.bull.pour.detail": "Valve open. Circle pour to {g} g at {temp}.",
  "step.switch.bull.steep.title": "Close + steep",
  "step.switch.bull.steep.detail": "Close the valve. Pour to {mid} g, then a gentle centre pour to {w} g.",
  "step.switch.bull.drain.title": "Open drain",
  "step.switch.bull.drain.detail":
    "Open. Drawdown around {t}. Fines settle on the bed — that is the extra filter.{stall}",

  "step.switch.fukahori.prep.title": "Closed",
  "step.switch.fukahori.prep.detail": "Valve down. Fukahori / MAME: closed bloom, then the rest is an open pour.",
  "step.switch.fukahori.bloom.title": "Bloom · closed",
  "step.switch.fukahori.bloom.detail": "{bloom} g at {temp} (she uses 50 g on 14 g). Swirl. {wait} s.",
  "step.switch.fukahori.pour.title": "Open + pour",
  "step.switch.fukahori.pour.detail":
    "Flip the switch open. Centre pour the rest to {w} g. Aim to finish pouring by 1:10.",
  "step.switch.fukahori.cut.title": "Cut drips",
  "step.switch.fukahori.cut.detail": "Drawdown ~{t}. Lift the dripper to cut the last drops.{stall}",

  "step.switch.hybrid.prep.title": "Closed",
  "step.switch.hybrid.prep.detail":
    "Kasuya Super Hybrid 2025 / Bøen shape: closed bloom, open mid, closed last pour, open drain.",
  "step.switch.hybrid.bloom.title": "Bloom · closed",
  "step.switch.hybrid.bloom.detail": "{bloom} g at {temp}. {wait} s. Wet everything. Wait out the foam if it is still blooming.",
  "step.switch.hybrid.mid.title": "Open pours",
  "step.switch.hybrid.mid.detail": "Open the valve. Pour to {a} g, then a second pulse to {b} g.",
  "step.switch.hybrid.last.title": "Last pour · closed",
  "step.switch.hybrid.last.detail":
    "Close the valve. Cool the kettle to 70–80 °C if you can. Fill to {w} g. Steep 45 s.",
  "step.switch.hybrid.drain.title": "Open drain",
  "step.switch.hybrid.drain.detail": "Open. Finish around {t}. The cool closed finish is for sweetness without a harsh tail.",

  "step.switch.hold.prep.title": "Closed",
  "step.switch.hold.prep.detail": "Valve down. Closed bloom and first pour, then open for the last pour.",
  "step.switch.hold.bloom.title": "Bloom · closed",
  "step.switch.hold.bloom.detail": "{bloom} g at {temp}. {wait} s.",
  "step.switch.hold.first.title": "First pour · closed",
  "step.switch.hold.first.detail": "Still sealed. Pour to {first} g (~60%). Steep until 1:20.",
  "step.switch.hold.last.title": "Open + last",
  "step.switch.hold.last.detail": "Flip the switch open. Pour the rest to {w} g.",
  "step.switch.hold.draw.title": "Drawdown",
  "step.switch.hold.draw.detail": "Bed should empty by {t}.{stall}",

  "step.switch.double.prep.title": "Closed",
  "step.switch.double.prep.detail": "Wibawa WBrC 2024: two immersions, drain between. He used 86 °C then 92 °C.",
  "step.switch.double.first.title": "First · closed",
  "step.switch.double.first.detail": "{first} g at {temp} (or ~86 °C if you have two kettles). 40 s.",
  "step.switch.double.drain1.title": "Drain",
  "step.switch.double.drain1.detail": "Open. It should empty in a few seconds.",
  "step.switch.double.second.title": "Second · closed",
  "step.switch.double.second.detail": "Close again. Pour the rest to {w} g (he uses ~92 °C).",
  "step.switch.double.drain2.title": "Drain",
  "step.switch.double.drain2.detail": "Open at ~1:05–1:50. Swirl the cup. Total around {t}.{stall}",

  "step.switch.steep.prep.title": "Closed",
  "step.switch.steep.prep.detail": "Hoffmann daily driver. Valve down the whole steep.",
  "step.switch.steep.bloom.title": "Bloom · closed",
  "step.switch.steep.bloom.detail": "{bloom} g, swirl.",
  "step.switch.steep.fill.title": "Fill · closed",
  "step.switch.steep.fill.detail": "Pour the rest quickly to {w} g at {temp}. Keep a crust.",
  "step.switch.steep.stir.title": "Stir",
  "step.switch.steep.stir.detail": "Spoon both directions. Wait ~15 s.",
  "step.switch.steep.open.title": "Open",
  "step.switch.steep.open.detail": "Flip the switch. Drain ~30–45 s. Total around {t}.",

  "step.v60.kasuya.prep.title": "Rinse",
  "step.v60.kasuya.prep.detail":
    "Kasuya 4:6 (WBrC 2016). First 40% sets acid vs sweet; last 60% sets strength.",
  "step.v60.kasuya.p1.acid": "Pour 1 · acid",
  "step.v60.kasuya.p1.sweet": "Pour 1 · sweet",
  "step.v60.kasuya.p1.detail":
    "{pour1} g at {temp}. Larger first pour = more acidity; smaller = more sweetness.",
  "step.v60.kasuya.p2.title": "Pour 2",
  "step.v60.kasuya.p2.detail": "{pour2} g, to {first40} g (40%).",
  "step.v60.kasuya.later.title": "Pours 3–5",
  "step.v60.kasuya.later.detail": "Three equal pours of ~{later} g at 1:30, 2:15, 2:45. Total {w} g.",
  "step.v60.kasuya.lift.title": "Lift",
  "step.v60.kasuya.lift.detail": "Remove the dripper around {t}.{stall}",

  "step.v60.chad.prep.title": "Cool cone",
  "step.v60.chad.prep.detail":
    "Chad Wang WBrC 2017: he skipped pre-warming. Rinse the paper, dump, let the cone sit a moment.",
  "step.v60.chad.bloom.title": "Bloom",
  "step.v60.chad.bloom.detail": "{bloom} g. 30 s.",
  "step.v60.chad.pour.title": "Centre pour",
  "step.v60.chad.pour.detail": "One continuous pour in the centre to {w} g. No spirals, no circles.",
  "step.v60.chad.draw.title": "Drawdown",
  "step.v60.chad.draw.detail": "Done around {t} (he was ~2:00). Clear, tea-like.{stall}",

  "step.v60.rao.prep.title": "Plastic cone",
  "step.v60.rao.prep.detail": "Scott Rao. Plastic V60 holds heat. Rinse, dump, coffee in, make a small well.",
  "step.v60.rao.bloom.title": "Bloom + spin",
  "step.v60.rao.bloom.detail": "{first} g at {temp}. Spin the dripper hard so the slurry is a whirlpool. 40 s.",
  "step.v60.rao.p1.title": "Pour 1",
  "step.v60.rao.p1.detail": "Steady low pour to {mid} g. One gentle spin to fill the ribs.",
  "step.v60.rao.p2.title": "Pour 2",
  "step.v60.rao.p2.detail":
    "When ~70% has drained, pour to {w} g. Another gentle spin. Drawdown {t} (he aims 4:00–4:30).",

  "step.v60.hedrick.prep.title": "No swirl",
  "step.v60.hedrick.prep.detail": "Lance Hedrick. Two blooms dump gas; swirling here only slows the filter.",
  "step.v60.hedrick.b1.title": "Bloom 1",
  "step.v60.hedrick.b1.detail": "{first} g at {temp}, ~7 g/s. Do not swirl. {wait} s.",
  "step.v60.hedrick.b2.title": "Bloom 2",
  "step.v60.hedrick.b2.detail": "To {second} g. More CO₂ leaves so the main pour will not channel.",
  "step.v60.hedrick.pour.title": "Fast centre",
  "step.v60.hedrick.pour.detail":
    "Pour to {w} g at ~10 g/s, small circles in the centre. Drawdown {t} (2:00–2:30). A tiny swirl only if it finishes too fast.",

  "step.v60.iced.prep.title": "Ice in the server",
  "step.v60.iced.prep.detail":
    "Hoffmann Japanese iced — not fridge cold brew. Rinse the paper over the sink so you do not warm the carafe. {ice} g ice in the server.",
  "step.v60.iced.bloom.title": "Bloom",
  "step.v60.iced.bloom.detail": "{bloom} g hot, 45 s. Grind a click finer than a hot V60.",
  "step.v60.iced.pour.title": "Hot pour",
  "step.v60.iced.pour.detail": "Pour the rest to {w} g at {temp}. Stretch the brew toward {t}.",
  "step.v60.iced.serve.title": "Melt + serve",
  "step.v60.iced.serve.detail":
    "Swirl the server until the ice is gone. Serve over fresh ice. Aromatics lock in as it hits the first ice.",

  "step.v60.peng.prep.title": "Two kettles",
  "step.v60.peng.prep.detail":
    "Peng WBrC 2025 (Solo, adapted to V60): hot front, cool last pour. If you have one kettle, cool it after the mid pour.",
  "step.v60.peng.bloom.title": "Bloom · hot",
  "step.v60.peng.bloom.detail": "{g} g at {temp} in gentle circles. 30 s.",
  "step.v60.peng.mid.title": "Mid · hot",
  "step.v60.peng.mid.detail": "Pour to {g} g at {temp}. This is structure and sweetness.",
  "step.v60.peng.last.title": "Last · cool",
  "step.v60.peng.last.detail":
    "Pour the rest to {w} g at ~{cool} °C (Melodrip if you have one). Calm bed, less late bitterness.",
  "step.v60.peng.serve.title": "Serve cooler",
  "step.v60.peng.serve.detail": "Drawdown ~{t}. Peng served around 50–65 °C — let it drop.{stall}",

  "step.v60.hoffmann.prep.title": "Rinse",
  "step.v60.hoffmann.prep.detail": "Rinse the paper, preheat the cone, dump the rinse water. Add coffee, shake flat.",
  "step.v60.hoffmann.bloom.title": "Bloom",
  "step.v60.hoffmann.bloom.gassy": "3×, still degassing",
  "step.v60.hoffmann.bloom.rested": "2×",
  "step.v60.hoffmann.bloom.waitGassy": "45–60",
  "step.v60.hoffmann.bloom.waitRested": "30–45",
  "step.v60.hoffmann.bloom.detail": "Pour {bloom} g ({bloomNote}), swirl until the bed is wet. Wait {wait} s.",
  "step.v60.hoffmann.main.title": "Main pour",
  "step.v60.hoffmann.main.detail": "Concentric circles to {pour60} g (~60% of {w} g) by ~1:15. {temp}.",
  "step.v60.hoffmann.finish.title": "Finish pour",
  "step.v60.hoffmann.finish.detail": "Pour the rest to {w} g. Do not drown the walls.{stall}",
  "step.v60.hoffmann.stir.title": "Stir + swirl",
  "step.v60.hoffmann.stir.detail": "Spoon N–S then E–W, then swirl to flatten. Drawdown by {t}.",

  "step.aero.pop.prep.title": "Upright + temper",
  "step.aero.pop.prep.detail":
    "Némo Pop WAC 2025. Two papers (flow cap if you have one). Pour {bypass} g of ~{cool} °C water into the carafe first — that is the temperate bypass.",
  "step.aero.pop.brew.title": "Brew",
  "step.aero.pop.brew.detail": "{coffee} g in. Pour {water} g at {temp} (84 °C in the winning cup). Wet everything.",
  "step.aero.pop.stir.title": "Stir",
  "step.aero.pop.stir.detail": "NSNS–WEWE, gentle.",
  "step.aero.pop.press.title": "Press",
  "step.aero.pop.press.detail": "Gentle ~20 s onto the tempered carafe. Total around {t}. Sweet, defined, less bitter.",

  "step.aero.merikanto.prep.title": "Invert",
  "step.aero.merikanto.prep.detail":
    "Tuomas Merikanto WAC 2021. Two rinsed papers. Coarse. Temperate water, almost no agitation.",
  "step.aero.merikanto.bloom.title": "Bloom",
  "step.aero.merikanto.bloom.detail": "{g} g at {temp} (80 °C). Gentle 3-stir.",
  "step.aero.merikanto.fill.title": "Fill",
  "step.aero.merikanto.fill.detail": "Pour to {w} g at {temp}. Another gentle 3-stir at 0:50.",
  "step.aero.merikanto.press.title": "Flip + press",
  "step.aero.merikanto.press.detail": "Cap, flip, press ~20 s. Swirl to cool. No bypass — the 80 °C water is the recipe.",

  "step.aero.tay.prep.title": "Invert",
  "step.aero.tay.prep.detail":
    "Tay Wipvasutt WAC 2023. Start with {first} g in the chamber (he uses 16 of 18 g). One rinsed paper.",
  "step.aero.tay.pour.title": "Pour",
  "step.aero.tay.pour.detail": "{w} g at {temp} (89 °C).",
  "step.aero.tay.stir.title": "Stir",
  "step.aero.tay.stir.detail": "One side of a chopstick, 5 s.",
  "step.aero.tay.charge.title": "Charge",
  "step.aero.tay.charge.detail": "Add the remaining {extra} g dry coffee. Stir 5 s at 0:55.",
  "step.aero.tay.press.title": "Flip + press",
  "step.aero.tay.press.detail": "Cap, flip, press ~30 s (~75 g concentrate).",
  "step.aero.tay.bypass.title": "Split bypass",
  "step.aero.tay.bypass.detail": "Room-temp water ~{room} g, then hot ~{hot} g. Taste and stop.",

  "step.aero.wendelien.prep.title": "Invert",
  "step.aero.wendelien.prep.detail": "Wendelien van Bunnik WAC 2019. Fast concentrate. Aesir or two papers, rinsed.",
  "step.aero.wendelien.pour.title": "Pour + stir",
  "step.aero.wendelien.pour.detail": "{w} g at {temp} in 10 s. Stir firmly 20 times.",
  "step.aero.wendelien.press.title": "Flip + press",
  "step.aero.wendelien.press.detail":
    "Cap, purge air, flip, press everything out. You want a short, thick concentrate.",
  "step.aero.wendelien.bypass.title": "Bypass + cool",
  "step.aero.wendelien.bypass.detail": "Add {bypass} g water. Cool the cup toward 60 °C. Acid and sweet together.",

  "step.aero.stanica.prep.title": "Invert",
  "step.aero.stanica.prep.detail":
    "George Stanica WAC 2024. Inverted, around the 4th mark. One rinsed paper. Melodrip if you have one.",
  "step.aero.stanica.bloom.title": "Bloom",
  "step.aero.stanica.bloom.detail": "{coffee} g in. Pour ~{half} g at {temp}. 30 s.",
  "step.aero.stanica.fill.title": "Fill + stir",
  "step.aero.stanica.fill.detail": "Pour to {w} g. NSEW stir 10 s.",
  "step.aero.stanica.cap.title": "Cap",
  "step.aero.stanica.cap.detail": "Cap on, purge air. At 1:35 flip onto the server.",
  "step.aero.stanica.press.title": "Press + bypass",
  "step.aero.stanica.press.detail":
    "Gentle 30–40 s press. Dilute with {bypass} g water to {cup} g in the cup.",

  "step.french.prep.title": "Preheat",
  "step.french.prep.detail": "Warm the pot, dump. Coffee in — Hoffmann grind is medium, not boulders.",
  "step.french.pour.title": "Pour",
  "step.french.pour.detail": "All {w} g at {temp}. Stir so there are no dry pockets.",
  "step.french.break.title": "Break + skim",
  "step.french.break.detail": "Spoon through the crust, scoop foam and floating grounds.",
  "step.french.classic.title": "Plunge to surface",
  "step.french.classic.detail": "Plunge gently to the surface and pour. More body, more silt. Do not mash the bed.",
  "step.french.settle.title": "Settle, then plunge to surface",
  "step.french.settle.detail": "Wait ~5 more minutes. Plunge only to the liquid surface, pour slowly, leave the silt.",

  "step.kalita.mccarthy.prep.title": "Rinse",
  "step.kalita.mccarthy.prep.detail":
    "James McCarthy WBrC 2013. Wave filter seated. He used a high-flow kettle for the bloom, then restricted flow.",
  "step.kalita.mccarthy.bloom.title": "Bloom",
  "step.kalita.mccarthy.bloom.detail": "{bloom} g at {temp}. 45 s.",
  "step.kalita.mccarthy.col.title": "Column",
  "step.kalita.mccarthy.col.detail":
    "Pour slowly to {w} g. Keep a water column on the bed — that column absorbs agitation so you get sweetness, not bitterness.",
  "step.kalita.mccarthy.draw.title": "Drawdown",
  "step.kalita.mccarthy.draw.detail": "Around {t} (he was ~3:30).{stall}",
  "step.kalita.wave.prep.title": "Rinse",
  "step.kalita.wave.prep.detail": "Rinse the Wave filter so it seats in the ridges. Dump rinse water, add coffee.",
  "step.kalita.wave.bloom.title": "Bloom",
  "step.kalita.wave.bloom.detail": "Pour {bloom} g in the centre, swirl. Wait 45 s.",
  "step.kalita.wave.pulses.title": "Pulses",
  "step.kalita.wave.pulses.detail": "Centre pulses of ~50 g to {w} g. Keep a flat bed — no V60 spiral.",
  "step.kalita.wave.draw.title": "Drawdown",
  "step.kalita.wave.draw.detail":
    "Target {t}. Flat bottoms stall less than a V60; still grind coarser if it chokes.{stall}",

  "step.origami.du.prep.title": "Rinse",
  "step.origami.du.prep.detail": "Jia-Ning Du WBrC 2019. No separate bloom — start pouring at 0:00.",
  "step.origami.du.p1.title": "Pour 1",
  "step.origami.du.p1.detail": "{g} g at {temp}, spiral.",
  "step.origami.du.p2.title": "Pour 2",
  "step.origami.du.p2.detail": "To {g} g.",
  "step.origami.du.p3.title": "Pour 3",
  "step.origami.du.p3.detail": "To {w} g. Drawdown around {t} (she was ~1:46). Vivid acid, floral.{stall}",
  "step.origami.medina.prep.title": "Rinse",
  "step.origami.medina.prep.detail": "Conical paper in the Origami. Rinse, dump, add coffee, level.",
  "step.origami.medina.p1.title": "Pulse 1",
  "step.origami.medina.p1.detail":
    "Pour {pulse} g. Medina WBrC 2023 used five equal pulses, 30 s apart, {temp}.",
  "step.origami.medina.later.title": "Pulses 2–5",
  "step.origami.medina.later.detail": "Every 30 s, another {pulse} g, spiral out and in, to {w} g.",
  "step.origami.medina.draw.title": "Drawdown",
  "step.origami.medina.draw.detail": "Quiet 30 s after the last pulse. Done around {t}.",

  "step.orea.hsu.prep.title": "Two kettles",
  "step.orea.hsu.prep.detail":
    "Shih Yuan Hsu WBrC 2022. Cool first pour tames fermented fruit; hot pulses build sweetness.",
  "step.orea.hsu.p1.title": "Pour 1 · cool",
  "step.orea.hsu.p1.detail": "{pulse} g at ~{cool} °C.",
  "step.orea.hsu.later.title": "Pours 2–4 · hot",
  "step.orea.hsu.later.detail": "Three more {pulse} g pulses at {temp} (95 °C), 30 s apart, to {w} g.",
  "step.orea.hsu.draw.title": "Drawdown",
  "step.orea.hsu.draw.detail": "Around {t}.{stall}",
  "step.orea.wolfl.prep.title": "Rinse",
  "step.orea.wolfl.prep.detail":
    "Flat OREA bed, paper seated. Level the coffee. Wölfl WBrC 2024 used a fast base and a Melodrip.",
  "step.orea.wolfl.bloom.title": "Bloom",
  "step.orea.wolfl.bloom.detail": "Pour {g} g. Wait ~40 s.",
  "step.orea.wolfl.second.title": "Second",
  "step.orea.wolfl.second.detail": "Top up to {g} g.",
  "step.orea.wolfl.third.title": "Third",
  "step.orea.wolfl.third.detail": "Top up to {g} g.",
  "step.orea.wolfl.finish.title": "Finish",
  "step.orea.wolfl.finish.detail":
    "Pour the rest to {w} g. Drawdown around {t}. Fast beds stall less than a V60.{stall}",

  "step.clever.gina.prep.title": "Seated",
  "step.clever.gina.prep.detail": "Fukahori WBrC 2018 (GINA → Clever). Two kettles if you can: 80 °C and 95 °C.",
  "step.clever.gina.i1.title": "Immerse · 80",
  "step.clever.gina.i1.detail": "On the counter. {g} g at ~{cool} °C. 45 s. Sweetness and fruit.",
  "step.clever.gina.drip.title": "Drip · 95",
  "step.clever.gina.drip.detail": "Set on the cup (valve open). Pour to {g} g at {temp}. Layers open.",
  "step.clever.gina.i2.title": "Immerse · 80",
  "step.clever.gina.i2.detail": "Back on the counter. Fill to {w} g at ~{finish} °C. 45 s. Juicy body.",
  "step.clever.gina.drain.title": "Drain",
  "step.clever.gina.drain.detail": "On the cup again. Cut drips around {t}.",
  "step.clever.steep.prep.title": "Seated",
  "step.clever.steep.prep.detail":
    "Filter in, rinse, sit the Clever on the counter (valve closed by its own weight).",
  "step.clever.steep.fill.title": "Fill",
  "step.clever.steep.fill.detail": "Coffee in, pour all {w} g at {temp}, stir to wet.",
  "step.clever.steep.stir.title": "Stir",
  "step.clever.steep.stir.short": "Short steep for a brighter cup. Break the crust.",
  "step.clever.steep.stir.long": "Break the crust, wait 15 s.",
  "step.clever.steep.drain.title": "Drain",
  "step.clever.steep.drain.detail": "Set the Clever on the cup to open the valve. Drain by {t}.",

  "step.espresso.flow":
    "Any PID + flow control (paddle, needle valve, dimmer, Decent, or Gaggiuino): set the group to the temperature, then drive flow and pressure by the times below.",
  "step.espresso.prepBase": "{coffee} g in a warmed basket. WDT, level, even tamp. PID {temp}. {flow}",
  "step.espresso.setup.title": "Setup",
  "step.espresso.blooming.setup": "{prep} Aim {ratio} ({yieldG} g). Total around {time} s.",
  "step.espresso.blooming.fill.title": "Fill · low flow",
  "step.espresso.blooming.fill.detail":
    "Open to ~2–4 ml/s until the puck is wet and pressure sits at 4–5 bar (usually 8–12 s). Do not jump to 9 bar.",
  "step.espresso.blooming.bloom.title": "Bloom · pump off",
  "step.espresso.blooming.bloom.detail":
    "Close the paddle / stop the pump. Hold ~30 s. A few drips are fine; a stream means grind finer.",
  "step.espresso.blooming.ramp.title": "Ramp",
  "step.espresso.blooming.ramp.detail":
    "Open slowly over ~6 s to 8–9 bar (or your machine’s 9 bar spring). First drops should be dark, not blonde.",
  "step.espresso.blooming.decline.title": "Decline",
  "step.espresso.blooming.decline.detail":
    "Ease flow so pressure falls toward 6 bar as the cup fills. Cut at {yieldG} g. Pour-over flavours, less sharp sour.",
  "step.espresso.turbo.setup": "{prep} Paper in the bottom of a VST/IMS basket if you have one. Turbo: 15–20 s, {ratio}.",
  "step.espresso.turbo.fill.title": "Fast fill",
  "step.espresso.turbo.fill.detail": "Open wide — about 8 ml/s — until the gauge hits 4.5 bar. Usually 3–5 s.",
  "step.espresso.turbo.soak.title": "Soak",
  "step.espresso.turbo.soak.detail":
    "Drop flow almost to zero. Hold until ~6 g is in the cup (a few seconds). Puck should be fully wet.",
  "step.espresso.turbo.extract.title": "Flow-capped extract",
  "step.espresso.turbo.extract.detail":
    "Set ~3 ml/s and do not let pressure go past 6 bar. If it wants 9 bar, open the paddle more or grind coarser.",
  "step.espresso.turbo.cut.title": "Cut",
  "step.espresso.turbo.cut.detail":
    "Stop at {yieldG} g. High extraction, low bitterness. If it gushes, grind finer; if it stalls at 6 bar with no flow, grind coarser.",
  "step.espresso.lhl.setup": "{prep} Scales on the drip tray. {coffee} g → {yieldG} g ({ratio}).",
  "step.espresso.lhl.low.title": "Low",
  "step.espresso.lhl.low.detail": "Gentle fill ~2–3 ml/s to wet the puck. Pressure 2–3 bar. ~4 s.",
  "step.espresso.lhl.high.title": "High",
  "step.espresso.lhl.high.detail":
    "Open to 5–7 bar and 5–8 g/s until the cup hits ~{mid} g (about 83% of the target). This is the fast, high-ratio middle.",
  "step.espresso.lhl.low2.title": "Low again",
  "step.espresso.lhl.low2.detail": "Restrict back to 2–3 bar / slow flow and finish to {yieldG} g. Total ~{time} s.",
  "step.espresso.lhl.dial.title": "Dial",
  "step.espresso.lhl.dial.detail":
    "Harsh → more middle flow or a touch coarser. Hollow → grind finer or hold the high phase a second longer.",
  "step.espresso.lever.setup": "{prep} Lever copy: fast flood, 3 bar soak, rise, decline. {ratio}, ~{time} s.",
  "step.espresso.lever.fill.title": "Fast fill",
  "step.espresso.lever.fill.detail":
    "Open wide for 2–4 s to flood the headspace. Then close down to hold 3 bar (2–4 bar is the band).",
  "step.espresso.lever.soak.title": "3 bar until drips",
  "step.espresso.lever.soak.detail":
    "Hold 3 bar until 4–8 g has dripped into the cup. Too many drips too fast → grind finer. No drips → grind coarser or wait.",
  "step.espresso.lever.rise.title": "To ~8.5 bar",
  "step.espresso.lever.rise.detail": "Open over ~6 s toward 8–9 bar. Cap flow around 1.7–2.2 ml/s so it cannot gush.",
  "step.espresso.lever.decline.title": "Spring",
  "step.espresso.lever.decline.detail":
    "As the puck opens, ease the paddle so pressure falls toward 6 bar. Cut at {yieldG} g. Syrupy body.",
  "step.espresso.dark.setup": "{prep} Dark wants cooler water and a slower tail. {ratio}, ~{time} s.",
  "step.espresso.dark.fill.title": "Fill",
  "step.espresso.dark.fill.detail": "Moderate fill ~3–4 ml/s until the puck is wet (5–8 s).",
  "step.espresso.dark.hold.title": "Hold",
  "step.espresso.dark.hold.detail":
    "Hold 7–8 bar for ~8 s. Higher hold than the Light adaptive — this is the creamy body.",
  "step.espresso.dark.tail.title": "Slow tail",
  "step.espresso.dark.tail.detail":
    "Restrict to ~1–1.5 ml/s and let pressure sag toward 5–6 bar. Cut at {yieldG} g.",
  "step.espresso.dark.dial.title": "Dial",
  "step.espresso.dark.dial.detail": "Bitter / ashy → cooler or shorter hold. Thin → finer grind or 1 s more on the hold.",
  "step.espresso.stock.setup": "{prep} No profile tricks: full pump, you cut the shot. {ratio}.",
  "step.espresso.stock.pre.title": "Preinfusion (optional)",
  "step.espresso.stock.pre.detail":
    "If the machine has a line-pressure or paddle preinfusion, 3–5 s at 2–3 bar, then open fully.",
  "step.espresso.stock.nine.title": "9 bar",
  "step.espresso.stock.nine.detail":
    "Open the paddle all the way. Hold ~9 bar (the spring / OPV ceiling). Do not chase 9 bar if the puck only makes 8.",
  "step.espresso.stock.cut.title": "Cut",
  "step.espresso.stock.cut.detail":
    "Stop at {yieldG} g or ~{time} s. Blonde early → grind finer. Drips at 30 s → grind coarser.",
  "step.espresso.filter.setup":
    "{prep} 58 mm paper in the basket, rinse. Grind finer than filter, coarser than espresso. Light tamp or none. Puck screen on top.",
  "step.espresso.filter.fill.title": "Gentle fill",
  "step.espresso.filter.fill.detail": "2–3 ml/s until the bed is wet. Pressure should stay under 3 bar.",
  "step.espresso.filter.pull.title": "Low-pressure pull",
  "step.espresso.filter.pull.detail":
    "Hold 2–4 bar, about 2–3 ml/s, to {yieldG} g (~1:5). About {time} s. If it hits 9 bar you are too fine.",
  "step.espresso.filter.cut.title": "Cut with water",
  "step.espresso.filter.cut.detail": "Add {bypass} g water at {temp} (or just-off-boil). This is a filter cup, not espresso.",
  "step.espresso.light.setup":
    "{prep} Adaptive Light: no pressurized soak. Sweetness and clarity over body. {ratio}, ~{time} s.",
  "step.espresso.light.fill.title": "Fast fill",
  "step.espresso.light.fill.detail":
    "Open to ~4 ml/s until the puck is wet (4–8 s). Pressure will climb, then you cut it.",
  "step.espresso.light.soak.title": "Decay soak",
  "step.espresso.light.soak.detail":
    "Close the paddle / stop the pump (0 bar soak). Let pressure fall on its own for ~8–10 s. This is what keeps Light from gushing.",
  "step.espresso.light.rise.title": "Rise 6 s",
  "step.espresso.light.rise.detail":
    "Open so pressure rises for exactly ~6 s, toward 8–8.5 bar. Note the flow at the end of those 6 s — that is your target flow for the rest.",
  "step.espresso.light.tail.title": "Descending tail",
  "step.espresso.light.tail.detail":
    "Hold that flow. Pressure should fall as the puck opens (8.5 → ~6 bar). Cap at 8.5 bar if it spikes. Cut at {yieldG} g.",
  "step.espresso.light.dial.title": "Dial",
  "step.espresso.light.dial.detail":
    "Sour → grind finer or a longer fill. Mute / bitter → grind coarser or a lower peak (7.5 bar).",

  "step.cold.prep.title": "Jar",
  "step.cold.prep.detail": "Coarser than espresso, finer than boulders. {coffee} g in a jar or bottle.",
  "step.cold.fill.title": "Fill",
  "step.cold.fill.detail": "Add {w} g cold or room-temp water. Stir hard so there are no dry pockets. Lid on.",
  "step.cold.fridge.title": "Fridge",
  "step.cold.fridge.detail": "Steep in the fridge {h} h. Do not leave it on the counter.",
  "step.cold.decant.title": "Decant",
  "step.cold.decant.detail": "Pour off gently, or paper-filter. Serve cold. Dilute only if it tastes heavy.",
  "step.cold.dilute.title": "Decant + dilute",
  "step.cold.dilute.detail":
    "Paper-filter. This is a concentrate — cut with water or ice to taste (CCC starts around 1:8, then dilute toward a cup).",

  "step.chemex.prep.title": "Rinse well",
  "step.chemex.prep.detail":
    "3-ply toward the spout. Rinse thoroughly — Chemex paper tastes if you skip this. Dump.",
  "step.chemex.bloom.title": "Bloom",
  "step.chemex.bloom.detail": "{bloom} g, stir at 0:10 so the bed is wet. Wait until 0:45.",
  "step.chemex.mid.title": "To 60%",
  "step.chemex.mid.detail": "Circles to {pour60} g.",
  "step.chemex.total.title": "To total",
  "step.chemex.total.detail": "Pour to {w} g.",
  "step.chemex.stir.title": "Stir + shake",
  "step.chemex.stir.detail": "Clockwise then counter-clockwise, gentle shake. Drawdown ~{t} (Hoffmann Chemex ~4:10).",

  "step.moka.prep.title": "Hot fill",
  "step.moka.prep.detail":
    "Fill the boiler with {temp} water to the safety valve. Basket level-full ({coffee} g), no tamp.",
  "step.moka.heat.title": "Medium heat",
  "step.moka.heat.detail": "Lid open so you can see the stream. Medium heat — not a race.",
  "step.moka.blonde.title": "Blonde",
  "step.moka.blonde.detail": "When the coffee turns honey/blonde and starts to gurgle, take it off.",
  "step.moka.stop.title": "Kill the brew",
  "step.moka.stop.detail": "Wrap the base or run it under water so it does not keep extracting. Stir the top chamber.",

  "step.cupping.prep.title": "SCA dose",
  "step.cupping.prep.detail": "{coffee} g per bowl, grind slightly coarser than paper filter. One bowl per lot.",
  "step.cupping.pour.title": "Pour",
  "step.cupping.pour.detail": "{w} g at {temp} (SCA 93 °C). Fill to cover. Do not stir yet.",
  "step.cupping.break.title": "Break",
  "step.cupping.break.detail": "Break the crust with a spoon, smell, skim foam and grounds.",
  "step.cupping.slurp.title": "Slurp",
  "step.cupping.slurp.detail": "When cool enough, slurp. This is the reference cup, not a drink recipe.",
} as const;

export type RecipeKey = keyof typeof en;

const es: Record<RecipeKey, string> = {
  "tech.switch.steep.flavor": "Cuerpo / chocolate",
  "tech.switch.steep.mechanic": "Cerrada toda la inmersión, abrir para drenar",
  "tech.switch.steep.blurb":
    "Hoffmann para el día a día. Más perdonador, más cuerpo. Mejor para Oscuro, tuestes pesados/dulces y Natural que tapan la cama.",
  "tech.switch.fukahori.flavor": "Fruta / claridad",
  "tech.switch.fukahori.mechanic": "Bloom cerrado, luego abierto el resto",
  "tech.switch.fukahori.blurb":
    "Emi Fukahori / tiendas MAME. Bloom cerrado y luego vertido abierto. Su ganancia WBrC 2018 fue el GINA 80/95/80 (aquí en Clever).",
  "tech.switch.hybrid.flavor": "Dulce / redondo",
  "tech.switch.hybrid.mechanic": "Bloom cerrado → vertidos abiertos → último vertido cerrado → drenaje abierto",
  "tech.switch.hybrid.blurb":
    "Tetsu Kasuya 2025 Super Hybrid. Dulzor y cuerpo sin un final duro. Por defecto en Claro si no hay una meta ácida fuerte.",
  "tech.switch.hold.flavor": "Balanceado / Medio",
  "tech.switch.hold.mechanic": "Bloom y primer vertido cerrados, último vertido abierto",
  "tech.switch.hold.blurb":
    "Híbrido de tienda: más cuerpo que Fukahori, más claridad que una inmersión completa. Sugerido para tazas lavadas Medio.",
  "tech.switch.double.flavor": "Limpio / controlado",
  "tech.switch.double.mechanic": "Pulso cerrado, drenar, pulso cerrado, drenar",
  "tech.switch.double.blurb":
    "Ryan Wibawa (WBrC 2024, 3.º en Switch). Dos inmersiones cortas. Más limpio que una inmersión larga.",
  "tech.switch.bull.flavor": "Ácido y luego dulce",
  "tech.switch.bull.mechanic": "Válvula abierta en el primer vertido, cerrar para infusionar, abrir para drenar",
  "tech.switch.bull.blurb":
    "Justin Bull, US Brewers Cup 2025 (luego WBrC híbrido 40% percolación / 60% inmersión). Abrir primero por acidez, infusionar cerrado por dulzor y cuerpo. Lo inverso de cerrado-primero.",

  "tech.aeropress.stanica.flavor": "Fruta / acidez",
  "tech.aeropress.stanica.mechanic": "Concentrado invertido a ~96 °C, diluir",
  "tech.aeropress.stanica.blurb":
    "George Stanica, WAC 2024. Invertido caliente 18 g / 100 g a 96 °C, prensa ~76–79 g, diluye. Filter Claro y brillante en AeroPress.",
  "tech.aeropress.pop.flavor": "Dulce / definido",
  "tech.aeropress.pop.mechanic": "Upright a 84 °C, bypass a 50 °C en la jarra",
  "tech.aeropress.pop.blurb":
    "Némo Pop, WAC 2025. La receta de agua templada: 18 g, 100 g a 84 °C, 70 g de bypass a 50 °C. Dulzor y definición, menos amargo.",
  "tech.aeropress.merikanto.flavor": "Balance dulce-ácido",
  "tech.aeropress.merikanto.mechanic": "Invertido, 80 °C, remueve suave, sin bypass",
  "tech.aeropress.merikanto.blurb":
    "Tuomas Merikanto, WAC 2021. 18 g / 200 g a 80 °C, grueso, casi sin agitación — agua templada para quitar astringencia de un tueste Claro.",
  "tech.aeropress.wendelien.flavor": "Ácido + dulce",
  "tech.aeropress.wendelien.mechanic": "Invertido 30 g / 100 g, prensa 40 s, diluir",
  "tech.aeropress.wendelien.blurb":
    "Wendelien van Bunnik, WAC 2019. Concentrado corto y violento, luego bypass y enfría la taza a ~60 °C. Acidez y dulzor juntos.",
  "tech.aeropress.tay.flavor": "Aroma / tipo Kenia",
  "tech.aeropress.tay.mechanic": "Suma 2 g más de café a 0:45, luego bypass ambiente + caliente",
  "tech.aeropress.tay.blurb":
    "Tay Wipvasutt, WAC 2023. 16 g al inicio, 2 g más a mitad, prensa ~75 g, luego agua ambiente y después caliente. Aroma sin una segunda tetera templada.",

  "tech.v60.hoffmann.flavor": "Balanceado / diario",
  "tech.v60.hoffmann.mechanic": "Bloom, vertido al 60%, remueve N–S / E–O",
  "tech.v60.hoffmann.blurb":
    "Esqueleto de comunidad. Cuerpo y uniformidad. La carta por defecto si no hay una meta de sabor más fuerte.",
  "tech.v60.kasuya-acid.flavor": "Brillante / jugoso",
  "tech.v60.kasuya-acid.mechanic": "Primer vertido más grande del primer 40%",
  "tech.v60.kasuya-acid.blurb":
    "Tetsu Kasuya, WBrC 2016. El primer 40% define ácido vs dulce: más agua en el vertido 1 = más acidez. Luego tres vertidos iguales para el cuerpo.",
  "tech.v60.kasuya-sweet.flavor": "Miel / dulce",
  "tech.v60.kasuya-sweet.mechanic": "Primer vertido más chico del primer 40%",
  "tech.v60.kasuya-sweet.blurb":
    "El mismo método 4:6. Menos agua en el vertido 1, más en el 2 — la taza WBrC 2016 de Kasuya era este lado dulce.",
  "tech.v60.peng.flavor": "Floral / cierre limpio",
  "tech.v60.peng.mechanic": "Bloom y vertido medio a 96 °C, último vertido a 80 °C",
  "tech.v60.peng.blurb":
    "George Peng, WBrC 2025 (Solo, adaptado aquí a V60). Frente caliente para estructura, último vertido frío para guardar florales y cortar amargo tardío.",
  "tech.v60.chad.flavor": "Limpio / a té",
  "tech.v60.chad.mechanic": "Bloom y luego un solo vertido continuo al centro. Sin espirales.",
  "tech.v60.chad.blurb":
    "Chad Wang, WBrC 2017. 15 g / 250 g a 92 °C, ~2:00. No precalentó el cono y vertió solo al centro.",
  "tech.v60.rao.flavor": "Parejo / alta extracción",
  "tech.v60.rao.mechanic": "Spin fuerte en el bloom, dos vertidos, spins suaves",
  "tech.v60.rao.blurb":
    "Scott Rao. V60 de plástico, 20 g / 330 g a ~97 °C, 4:00–4:30. El spin nivela la cama para empujar extracción sin amargo.",
  "tech.v60.hedrick.flavor": "Limpio / lotes con gas",
  "tech.v60.hedrick.mechanic": "45 g, 90 g, luego un vertido rápido al centro. Sin swirl en los bloom.",
  "tech.v60.hedrick.blurb":
    "Lance Hedrick. Dos bloom sacan el CO₂ para que el vertido principal no canalice. Sugerido mientras un lote Claro Rest sigue con gas.",
  "tech.v60.iced.flavor": "Brillante / flash-chill",
  "tech.v60.iced.mechanic": "Brew caliente sobre hielo en el server · 60% caliente / 40% hielo",
  "tech.v60.iced.blurb":
    "Filter helado de Hoffmann. No es cold brew — los aromáticos se traban al tocar el hielo. Muele un click más fino. Elige esto si quieres una taza fría.",

  "tech.kalita.wave.flavor": "Parejo / diario",
  "tech.kalita.wave.mechanic": "Pulsos al centro, cama plana",
  "tech.kalita.wave.blurb": "Esqueleto de café / WBrC antiguo de fondo plano. Perdonador. Sugerido para Medio / Oscuro.",
  "tech.kalita.mccarthy.flavor": "Dulce / poco amargo",
  "tech.kalita.mccarthy.mechanic": "Bloom y luego una columna de agua — sin espirales agresivos",
  "tech.kalita.mccarthy.blurb":
    "James McCarthy, WBrC 2013. Kalita Wave, 24 g / 380 g, justo bajo ebullición, ~3:30. Flujo restringido para que la columna absorba la agitación y saque dulzor, no amargo.",

  "tech.origami.medina.flavor": "Parejo / Claro",
  "tech.origami.medina.mechanic": "Cinco pulsos tipo 50 g, cada 30 s",
  "tech.origami.medina.blurb": "Carlos Medina, WBrC 2023. 15,5–16 g / 250 g a 91 °C. La carta actual de Origami.",
  "tech.origami.du.flavor": "Ácido vivo / floral",
  "tech.origami.du.mechanic": "60 → 140 → 240, sin bloom aparte, ~1:46",
  "tech.origami.du.blurb":
    "Jia-Ning Du, WBrC 2019. 16 g / 240 g a 94 °C. Extracción rápida y de mucha energía — el primer mundial de Origami.",

  "tech.orea.wolfl.flavor": "Limpio / Claro",
  "tech.orea.wolfl.mechanic": "Cuatro vertidos, cama plana y rápida, ~2:20",
  "tech.orea.wolfl.blurb": "Martin Wölfl, WBrC 2024. 17 g / 270 g a 93 °C. La carta actual de OREA.",
  "tech.orea.hsu.flavor": "Fruta salvaje / fermento tame",
  "tech.orea.hsu.mechanic": "Primer vertido a 70 °C, luego pulsos a 95 °C",
  "tech.orea.hsu.blurb":
    "Shih Yuan Hsu, WBrC 2022. 14 g / 200 g. La apertura fría domestica la fruta fermentada; los pulsos calientes arman dulzor. Lo inverso de Peng.",

  "tech.frenchpress.hoffmann.flavor": "Limpio / Claro",
  "tech.frenchpress.hoffmann.mechanic": "Rompe a 4:00, asienta hasta ~9:00, émbolo solo a la superficie",
  "tech.frenchpress.hoffmann.blurb":
    "Ultimate French Press. El asentado largo baja el limo. Sugerido para Claro.",
  "tech.frenchpress.classic.flavor": "Cuerpo / Oscuro",
  "tech.frenchpress.classic.mechanic": "Rompe, émbolo, sirve — sin asentado largo",
  "tech.frenchpress.classic.blurb": "Prensa de cuatro minutos. Más cuerpo, más limo. Sugerido para Oscuro o pesado/dulce.",

  "tech.coldbrew.rtd.flavor": "Suave / diario",
  "tech.coldbrew.rtd.mechanic": "~1:13, 12–16 h en la nevera",
  "tech.coldbrew.rtd.blurb": "Listo para tomar al estilo Hoffmann. Sugerido para Claro.",
  "tech.coldbrew.concentrate.flavor": "Pesado / viaje",
  "tech.coldbrew.concentrate.mechanic": "Inmersión 1:8 en nevera, luego corta con agua o hielo",
  "tech.coldbrew.concentrate.blurb":
    "Concentrado Counter Culture. Sugerido para Oscuro o cuando quieres una base más fuerte.",

  "tech.clever.steep.flavor": "Cuerpo / parejo",
  "tech.clever.steep.mechanic": "En la mesada ~2:00, luego sobre la taza",
  "tech.clever.steep.blurb": "Inmersión completa y luego drena. Sugerido para Oscuro, pesado o Natural.",
  "tech.clever.short.flavor": "Más brillante / Claro",
  "tech.clever.short.mechanic": "En la mesada ~1:15, luego drena",
  "tech.clever.short.blurb": "Menos contacto, más claridad. Sugerido para Claro + acidez.",
  "tech.clever.gina.flavor": "Capas dulce → abierto → jugoso",
  "tech.clever.gina.mechanic": "Cerrado 80 °C, abierto 95 °C, cerrado 80 °C",
  "tech.clever.gina.blurb":
    "Emi Fukahori, WBrC 2018 en GINA. Se mapea a un Clever: inmersión fría (dulzor), goteo caliente (capas), inmersión fría (cuerpo jugoso). El cambio de temperatura que ganó el mundial.",

  "tech.espresso.adaptive-light.flavor": "Dulce / limpio",
  "tech.espresso.adaptive-light.mechanic": "Atento al flujo, presión descendente después de un hold",
  "tech.espresso.adaptive-light.blurb":
    "SproFiler Adaptive for Light Roast. Presión descendente por dulzor y claridad, a costa de cuerpo. Por defecto Claro en Gaggiuino.",
  "tech.espresso.blooming.flavor": "Floral / tipo pour-over",
  "tech.espresso.blooming.mechanic": "Llenado con control de flujo, soak largo, luego extrae",
  "tech.espresso.blooming.blurb":
    "SproFiler Blooming espresso. Satura el puck y luego extrae. Mejor para lotes Claros y complejos — sabores de pour-over, menos filo ácido.",
  "tech.espresso.extractamundo.flavor": "Fruta / alta extracción",
  "tech.espresso.extractamundo.mechanic": "Llenado rápido a 4,5 bar, soak corto, 3 ml/s tope 6 bar",
  "tech.espresso.extractamundo.blurb":
    "SproFiler Extractamundo Dos! IUIUIU turbo. Tuestes Claros, ~15–20 s. Papel en el canasto si usas VST/IMS.",
  "tech.espresso.lhl.flavor": "Brillante / menos duro",
  "tech.espresso.lhl.mechanic": "Rápido 1:3,5, presión sube y baja. Necesita báscula.",
  "tech.espresso.lhl.blurb":
    "SproFiler Low High Low. 17 g → 60 g. Ratio alto, TDS más bajo, menos notas duras en Claro. Flujo fase 2: 5–8 g/s, 5–7 bar.",
  "tech.espresso.londinium.flavor": "Jarabe / cuerpo",
  "tech.espresso.londinium.mechanic": "Subida tipo lever, luego un spring descendente",
  "tech.espresso.londinium.blurb":
    "SproFiler Londinium (Leva 6 / Leva 9 son la misma familia). Suave, jarabe, funciona en varios tuestes. Por defecto Medio y pesado/dulce.",
  "tech.espresso.adaptive-dark.flavor": "Cremoso / chocolate",
  "tech.espresso.adaptive-dark.mechanic": "Temp. más baja, hold más alto, cola más lenta",
  "tech.espresso.adaptive-dark.blurb": "SproFiler Adaptive Dark Roast. Más frío (~88 °C), shot Oscuro más cremoso.",
  "tech.espresso.stock.flavor": "Clásico / café",
  "tech.espresso.stock.mechanic": "Bomba a 9 bar, tú cortas el shot",
  "tech.espresso.stock.blurb":
    "SproFiler Stock - 9 Bar. Sensación de Gaggia Classic de fábrica. Ajusta por tiempo o peso como antes del mod. 9 bar es un techo, no un objetivo.",
  "tech.espresso.filter.flavor": "Taza filter / solo máquina",
  "tech.espresso.filter.mechanic": "Papel en el canasto, 1:5, luego diluye ~230 g",
  "tech.espresso.filter.blurb":
    "SproFiler Filter. Más grueso que espresso, papel + puck screen, tira ~5:1, corta con 225–250 g de agua. Cuando la Gaggia es el único método.",

  "tech.chemex.hoffmann.flavor": "Limpio / papel",
  "tech.chemex.hoffmann.mechanic": "Bloom, vertido al 60%, remueve y agita — 30 g : 500 g, ~4:10",
  "tech.chemex.hoffmann.blurb":
    "Hoffmann Chemex como un V60. Papel bonded grueso, más lento y limpio que un cono. El único esqueleto publicado que guardamos.",
  "tech.moka.hoffmann.flavor": "Cuerpo / chocolate",
  "tech.moka.hoffmann.mechanic": "Llena caliente hasta la válvula, sin tamp, apaga al primer rubio",
  "tech.moka.hoffmann.blurb":
    "Hoffmann moka. No es espresso — para cuando el chorro se pone color miel. El único esqueleto publicado que guardamos.",
  "tech.cupping.sca.flavor": "Referencia / parejo",
  "tech.cupping.sca.mechanic": "8,25 g / 150 g, 93 °C, 4 min, rompe y espuma",
  "tech.cupping.sca.blurb": "Protocolo SCA de cupping. La taza de referencia académica, no una receta para beber.",

  "step.stall.natural": " El Natural tapa la cama — vierte más suave y para si se atasca.",
  "step.at.prep": "Prep",
  "step.at.taste": "Cata",
  "step.at.filter": "Filtrar",
  "step.at.dilute": "Diluir",
  "step.at.soak": "Remojo",
  "step.at.rise": "Subida",
  "step.at.decline": "Bajada",
  "step.at.stop": "Parar",
  "step.at.fridge": "Nevera",

  "step.switch.bull.prep.title": "Abrir primero",
  "step.switch.bull.prep.detail":
    "Justin Bull USBC 2025 / WBrC híbrido: percolación primero por acidez, luego inmersión cerrada por dulzor.",
  "step.switch.bull.pour.title": "Vertido abierto",
  "step.switch.bull.pour.detail": "Válvula abierta. Círculos hasta {g} g a {temp}.",
  "step.switch.bull.steep.title": "Cerrar + infusionar",
  "step.switch.bull.steep.detail": "Cierra la válvula. Vierte hasta {mid} g, luego un centro suave hasta {w} g.",
  "step.switch.bull.drain.title": "Abrir y drenar",
  "step.switch.bull.drain.detail":
    "Abre. Drenaje alrededor de {t}. Los finos se asientan en la cama — ese es el filtro extra.{stall}",

  "step.switch.fukahori.prep.title": "Cerrada",
  "step.switch.fukahori.prep.detail": "Válvula abajo. Fukahori / MAME: bloom cerrado, el resto es vertido abierto.",
  "step.switch.fukahori.bloom.title": "Bloom · cerrado",
  "step.switch.fukahori.bloom.detail": "{bloom} g a {temp} (ella usa 50 g sobre 14 g). Swirl. {wait} s.",
  "step.switch.fukahori.pour.title": "Abrir + verter",
  "step.switch.fukahori.pour.detail":
    "Abre el Switch. Vierte el resto al centro hasta {w} g. Trata de terminar de verter a 1:10.",
  "step.switch.fukahori.cut.title": "Cortar gotas",
  "step.switch.fukahori.cut.detail": "Drenaje ~{t}. Levanta el dripper para cortar las últimas gotas.{stall}",

  "step.switch.hybrid.prep.title": "Cerrada",
  "step.switch.hybrid.prep.detail":
    "Kasuya Super Hybrid 2025 / forma Bøen: bloom cerrado, medio abierto, último vertido cerrado, drenaje abierto.",
  "step.switch.hybrid.bloom.title": "Bloom · cerrado",
  "step.switch.hybrid.bloom.detail": "{bloom} g a {temp}. {wait} s. Moja todo. Espera la espuma si todavía está blooming.",
  "step.switch.hybrid.mid.title": "Vertidos abiertos",
  "step.switch.hybrid.mid.detail": "Abre la válvula. Vierte hasta {a} g, luego un segundo pulso hasta {b} g.",
  "step.switch.hybrid.last.title": "Último vertido · cerrado",
  "step.switch.hybrid.last.detail":
    "Cierra la válvula. Enfría la tetera a 70–80 °C si puedes. Llena hasta {w} g. Infusiona 45 s.",
  "step.switch.hybrid.drain.title": "Abrir y drenar",
  "step.switch.hybrid.drain.detail":
    "Abre. Termina alrededor de {t}. El cierre frío y cerrado es para dulzor sin cola dura.",

  "step.switch.hold.prep.title": "Cerrada",
  "step.switch.hold.prep.detail": "Válvula abajo. Bloom y primer vertido cerrados, luego abre para el último.",
  "step.switch.hold.bloom.title": "Bloom · cerrado",
  "step.switch.hold.bloom.detail": "{bloom} g a {temp}. {wait} s.",
  "step.switch.hold.first.title": "Primer vertido · cerrado",
  "step.switch.hold.first.detail": "Sigue sellado. Vierte hasta {first} g (~60%). Infusiona hasta 1:20.",
  "step.switch.hold.last.title": "Abrir + último",
  "step.switch.hold.last.detail": "Abre el Switch. Vierte el resto hasta {w} g.",
  "step.switch.hold.draw.title": "Drenaje",
  "step.switch.hold.draw.detail": "La cama debería vaciarse a {t}.{stall}",

  "step.switch.double.prep.title": "Cerrada",
  "step.switch.double.prep.detail": "Wibawa WBrC 2024: dos inmersiones, drena en el medio. Usó 86 °C y luego 92 °C.",
  "step.switch.double.first.title": "Primera · cerrada",
  "step.switch.double.first.detail": "{first} g a {temp} (o ~86 °C si tienes dos teteras). 40 s.",
  "step.switch.double.drain1.title": "Drenar",
  "step.switch.double.drain1.detail": "Abre. Debería vaciarse en unos segundos.",
  "step.switch.double.second.title": "Segunda · cerrada",
  "step.switch.double.second.detail": "Cierra otra vez. Vierte el resto hasta {w} g (él usa ~92 °C).",
  "step.switch.double.drain2.title": "Drenar",
  "step.switch.double.drain2.detail": "Abre a ~1:05–1:50. Gira la taza. Total alrededor de {t}.{stall}",

  "step.switch.steep.prep.title": "Cerrada",
  "step.switch.steep.prep.detail": "Hoffmann para el día a día. Válvula abajo en toda la inmersión.",
  "step.switch.steep.bloom.title": "Bloom · cerrado",
  "step.switch.steep.bloom.detail": "{bloom} g, swirl.",
  "step.switch.steep.fill.title": "Llenar · cerrado",
  "step.switch.steep.fill.detail": "Vierte el resto rápido hasta {w} g a {temp}. Deja una costra.",
  "step.switch.steep.stir.title": "Remover",
  "step.switch.steep.stir.detail": "Cuchara en ambas direcciones. Espera ~15 s.",
  "step.switch.steep.open.title": "Abrir",
  "step.switch.steep.open.detail": "Abre el Switch. Drena ~30–45 s. Total alrededor de {t}.",

  "step.v60.kasuya.prep.title": "Enjuagar",
  "step.v60.kasuya.prep.detail":
    "Kasuya 4:6 (WBrC 2016). El primer 40% define ácido vs dulce; el último 60% define el cuerpo.",
  "step.v60.kasuya.p1.acid": "Vertido 1 · ácido",
  "step.v60.kasuya.p1.sweet": "Vertido 1 · dulce",
  "step.v60.kasuya.p1.detail":
    "{pour1} g a {temp}. Un primer vertido más grande = más acidez; más chico = más dulzor.",
  "step.v60.kasuya.p2.title": "Vertido 2",
  "step.v60.kasuya.p2.detail": "{pour2} g, hasta {first40} g (40%).",
  "step.v60.kasuya.later.title": "Vertidos 3–5",
  "step.v60.kasuya.later.detail": "Tres vertidos iguales de ~{later} g a 1:30, 2:15, 2:45. Total {w} g.",
  "step.v60.kasuya.lift.title": "Levantar",
  "step.v60.kasuya.lift.detail": "Saca el dripper alrededor de {t}.{stall}",

  "step.v60.chad.prep.title": "Cono frío",
  "step.v60.chad.prep.detail":
    "Chad Wang WBrC 2017: no precalentó. Enjuaga el papel, tira el agua, deja el cono un momento.",
  "step.v60.chad.bloom.title": "Bloom",
  "step.v60.chad.bloom.detail": "{bloom} g. 30 s.",
  "step.v60.chad.pour.title": "Vertido al centro",
  "step.v60.chad.pour.detail": "Un solo vertido continuo al centro hasta {w} g. Sin espirales ni círculos.",
  "step.v60.chad.draw.title": "Drenaje",
  "step.v60.chad.draw.detail": "Listo alrededor de {t} (él estaba ~2:00). Limpio, a té.{stall}",

  "step.v60.rao.prep.title": "Cono de plástico",
  "step.v60.rao.prep.detail": "Scott Rao. El V60 de plástico retiene calor. Enjuaga, tira, café adentro, un pozo chico.",
  "step.v60.rao.bloom.title": "Bloom + spin",
  "step.v60.rao.bloom.detail": "{first} g a {temp}. Gira el dripper fuerte hasta que la slurry sea un remolino. 40 s.",
  "step.v60.rao.p1.title": "Vertido 1",
  "step.v60.rao.p1.detail": "Vertido bajo y firme hasta {mid} g. Un spin suave para llenar las nervaduras.",
  "step.v60.rao.p2.title": "Vertido 2",
  "step.v60.rao.p2.detail":
    "Cuando haya drenado ~70%, vierte hasta {w} g. Otro spin suave. Drenaje {t} (él apunta a 4:00–4:30).",

  "step.v60.hedrick.prep.title": "Sin swirl",
  "step.v60.hedrick.prep.detail": "Lance Hedrick. Dos bloom sacan gas; aquí el swirl solo frena el filtro.",
  "step.v60.hedrick.b1.title": "Bloom 1",
  "step.v60.hedrick.b1.detail": "{first} g a {temp}, ~7 g/s. No hagas swirl. {wait} s.",
  "step.v60.hedrick.b2.title": "Bloom 2",
  "step.v60.hedrick.b2.detail": "Hasta {second} g. Sale más CO₂ para que el vertido principal no canalice.",
  "step.v60.hedrick.pour.title": "Centro rápido",
  "step.v60.hedrick.pour.detail":
    "Vierte hasta {w} g a ~10 g/s, círculos chicos al centro. Drenaje {t} (2:00–2:30). Un swirl mínimo solo si termina muy rápido.",

  "step.v60.iced.prep.title": "Hielo en el server",
  "step.v60.iced.prep.detail":
    "Hoffmann Japanese iced — no es cold brew de nevera. Enjuaga el papel en el fregadero para no calentar la jarra. {ice} g de hielo en el server.",
  "step.v60.iced.bloom.title": "Bloom",
  "step.v60.iced.bloom.detail": "{bloom} g caliente, 45 s. Muele un click más fino que un V60 caliente.",
  "step.v60.iced.pour.title": "Vertido caliente",
  "step.v60.iced.pour.detail": "Vierte el resto hasta {w} g a {temp}. Estira el brew hacia {t}.",
  "step.v60.iced.serve.title": "Derretir + servir",
  "step.v60.iced.serve.detail":
    "Gira el server hasta que se vaya el hielo. Sirve sobre hielo nuevo. Los aromáticos se traban al tocar el primer hielo.",

  "step.v60.peng.prep.title": "Dos teteras",
  "step.v60.peng.prep.detail":
    "Peng WBrC 2025 (Solo, adaptado a V60): frente caliente, último vertido frío. Si tienes una sola tetera, enfríala después del vertido medio.",
  "step.v60.peng.bloom.title": "Bloom · caliente",
  "step.v60.peng.bloom.detail": "{g} g a {temp} en círculos suaves. 30 s.",
  "step.v60.peng.mid.title": "Medio · caliente",
  "step.v60.peng.mid.detail": "Vierte hasta {g} g a {temp}. Aquí está la estructura y el dulzor.",
  "step.v60.peng.last.title": "Último · frío",
  "step.v60.peng.last.detail":
    "Vierte el resto hasta {w} g a ~{cool} °C (Melodrip si tienes). Cama calmada, menos amargo tardío.",
  "step.v60.peng.serve.title": "Servir más frío",
  "step.v60.peng.serve.detail": "Drenaje ~{t}. Peng sirvió alrededor de 50–65 °C — déjala bajar.{stall}",

  "step.v60.hoffmann.prep.title": "Enjuagar",
  "step.v60.hoffmann.prep.detail": "Enjuaga el papel, precalienta el cono, tira el agua. Café adentro, sacude plano.",
  "step.v60.hoffmann.bloom.title": "Bloom",
  "step.v60.hoffmann.bloom.gassy": "3×, todavía desgasificando",
  "step.v60.hoffmann.bloom.rested": "2×",
  "step.v60.hoffmann.bloom.waitGassy": "45–60",
  "step.v60.hoffmann.bloom.waitRested": "30–45",
  "step.v60.hoffmann.bloom.detail": "Vierte {bloom} g ({bloomNote}), swirl hasta mojar la cama. Espera {wait} s.",
  "step.v60.hoffmann.main.title": "Vertido principal",
  "step.v60.hoffmann.main.detail": "Círculos concéntricos hasta {pour60} g (~60% de {w} g) hacia ~1:15. {temp}.",
  "step.v60.hoffmann.finish.title": "Vertido final",
  "step.v60.hoffmann.finish.detail": "Vierte el resto hasta {w} g. No ahogues las paredes.{stall}",
  "step.v60.hoffmann.stir.title": "Remover + swirl",
  "step.v60.hoffmann.stir.detail": "Cuchara N–S y luego E–O, después swirl para aplanar. Drenaje a {t}.",

  "step.aero.pop.prep.title": "Upright + templar",
  "step.aero.pop.prep.detail":
    "Némo Pop WAC 2025. Dos papeles (flow cap si tienes). Vierte primero {bypass} g de agua ~{cool} °C en la jarra — ese es el bypass templado.",
  "step.aero.pop.brew.title": "Brew",
  "step.aero.pop.brew.detail": "{coffee} g adentro. Vierte {water} g a {temp} (84 °C en la taza ganadora). Moja todo.",
  "step.aero.pop.stir.title": "Remover",
  "step.aero.pop.stir.detail": "NSNS–EOEO, suave.",
  "step.aero.pop.press.title": "Prensar",
  "step.aero.pop.press.detail": "Suave ~20 s sobre la jarra templada. Total alrededor de {t}. Dulce, definido, menos amargo.",

  "step.aero.merikanto.prep.title": "Invertir",
  "step.aero.merikanto.prep.detail":
    "Tuomas Merikanto WAC 2021. Dos papeles enjuagados. Grueso. Agua templada, casi sin agitación.",
  "step.aero.merikanto.bloom.title": "Bloom",
  "step.aero.merikanto.bloom.detail": "{g} g a {temp} (80 °C). 3 remueve suaves.",
  "step.aero.merikanto.fill.title": "Llenar",
  "step.aero.merikanto.fill.detail": "Vierte hasta {w} g a {temp}. Otros 3 remueve suaves a 0:50.",
  "step.aero.merikanto.press.title": "Voltear + prensar",
  "step.aero.merikanto.press.detail": "Tapa, voltea, prensa ~20 s. Gira para enfriar. Sin bypass — el agua a 80 °C es la receta.",

  "step.aero.tay.prep.title": "Invertir",
  "step.aero.tay.prep.detail":
    "Tay Wipvasutt WAC 2023. Empieza con {first} g en la cámara (él usa 16 de 18 g). Un papel enjuagado.",
  "step.aero.tay.pour.title": "Verter",
  "step.aero.tay.pour.detail": "{w} g a {temp} (89 °C).",
  "step.aero.tay.stir.title": "Remover",
  "step.aero.tay.stir.detail": "Un lado de un palillo, 5 s.",
  "step.aero.tay.charge.title": "Cargar",
  "step.aero.tay.charge.detail": "Suma los {extra} g de café seco que faltan. Remueve 5 s a 0:55.",
  "step.aero.tay.press.title": "Voltear + prensar",
  "step.aero.tay.press.detail": "Tapa, voltea, prensa ~30 s (~75 g de concentrado).",
  "step.aero.tay.bypass.title": "Bypass partido",
  "step.aero.tay.bypass.detail": "Agua ambiente ~{room} g, luego caliente ~{hot} g. Prueba y para.",

  "step.aero.wendelien.prep.title": "Invertir",
  "step.aero.wendelien.prep.detail": "Wendelien van Bunnik WAC 2019. Concentrado rápido. Aesir o dos papeles, enjuagados.",
  "step.aero.wendelien.pour.title": "Verter + remover",
  "step.aero.wendelien.pour.detail": "{w} g a {temp} en 10 s. Remueve firme 20 veces.",
  "step.aero.wendelien.press.title": "Voltear + prensar",
  "step.aero.wendelien.press.detail":
    "Tapa, saca el aire, voltea, prensa todo. Quieres un concentrado corto y espeso.",
  "step.aero.wendelien.bypass.title": "Bypass + enfriar",
  "step.aero.wendelien.bypass.detail": "Suma {bypass} g de agua. Enfría la taza hacia 60 °C. Ácido y dulce juntos.",

  "step.aero.stanica.prep.title": "Invertir",
  "step.aero.stanica.prep.detail":
    "George Stanica WAC 2024. Invertido, alrededor de la 4.ª marca. Un papel enjuagado. Melodrip si tienes.",
  "step.aero.stanica.bloom.title": "Bloom",
  "step.aero.stanica.bloom.detail": "{coffee} g adentro. Vierte ~{half} g a {temp}. 30 s.",
  "step.aero.stanica.fill.title": "Llenar + remover",
  "step.aero.stanica.fill.detail": "Vierte hasta {w} g. Remueve NSEW 10 s.",
  "step.aero.stanica.cap.title": "Tapar",
  "step.aero.stanica.cap.detail": "Tapa puesta, saca el aire. A 1:35 voltea sobre el server.",
  "step.aero.stanica.press.title": "Prensar + bypass",
  "step.aero.stanica.press.detail":
    "Prensa suave 30–40 s. Diluye con {bypass} g de agua hasta {cup} g en la taza.",

  "step.french.prep.title": "Precalentar",
  "step.french.prep.detail": "Calienta la prensa, tira el agua. Café adentro — la molienda Hoffmann es media, no piedras.",
  "step.french.pour.title": "Verter",
  "step.french.pour.detail": "Todos los {w} g a {temp}. Remueve para que no queden bolsas secas.",
  "step.french.break.title": "Romper + espumar",
  "step.french.break.detail": "Cuchara por la costra, saca espuma y granos que flotan.",
  "step.french.classic.title": "Émbolo a la superficie",
  "step.french.classic.detail": "Baja el émbolo suave hasta la superficie y sirve. Más cuerpo, más limo. No aplastes la cama.",
  "step.french.settle.title": "Asentar, luego émbolo a la superficie",
  "step.french.settle.detail": "Espera ~5 minutos más. Émbolo solo hasta la superficie del líquido, sirve lento, deja el limo.",

  "step.kalita.mccarthy.prep.title": "Enjuagar",
  "step.kalita.mccarthy.prep.detail":
    "James McCarthy WBrC 2013. Filtro Wave asentado. Usó tetera de alto flujo para el bloom y luego restringió el flujo.",
  "step.kalita.mccarthy.bloom.title": "Bloom",
  "step.kalita.mccarthy.bloom.detail": "{bloom} g a {temp}. 45 s.",
  "step.kalita.mccarthy.col.title": "Columna",
  "step.kalita.mccarthy.col.detail":
    "Vierte lento hasta {w} g. Mantén una columna de agua sobre la cama — esa columna absorbe la agitación para sacar dulzor, no amargo.",
  "step.kalita.mccarthy.draw.title": "Drenaje",
  "step.kalita.mccarthy.draw.detail": "Alrededor de {t} (él estaba ~3:30).{stall}",
  "step.kalita.wave.prep.title": "Enjuagar",
  "step.kalita.wave.prep.detail": "Enjuaga el filtro Wave para que se asiente en las estrías. Tira el agua, pon el café.",
  "step.kalita.wave.bloom.title": "Bloom",
  "step.kalita.wave.bloom.detail": "Vierte {bloom} g al centro, swirl. Espera 45 s.",
  "step.kalita.wave.pulses.title": "Pulsos",
  "step.kalita.wave.pulses.detail": "Pulsos al centro de ~50 g hasta {w} g. Cama plana — sin espiral de V60.",
  "step.kalita.wave.draw.title": "Drenaje",
  "step.kalita.wave.draw.detail":
    "Objetivo {t}. El fondo plano se atasca menos que un V60; igual muele más grueso si se ahoga.{stall}",

  "step.origami.du.prep.title": "Enjuagar",
  "step.origami.du.prep.detail": "Jia-Ning Du WBrC 2019. Sin bloom aparte — empieza a verter a 0:00.",
  "step.origami.du.p1.title": "Vertido 1",
  "step.origami.du.p1.detail": "{g} g a {temp}, espiral.",
  "step.origami.du.p2.title": "Vertido 2",
  "step.origami.du.p2.detail": "Hasta {g} g.",
  "step.origami.du.p3.title": "Vertido 3",
  "step.origami.du.p3.detail": "Hasta {w} g. Drenaje alrededor de {t} (ella estaba ~1:46). Ácido vivo, floral.{stall}",
  "step.origami.medina.prep.title": "Enjuagar",
  "step.origami.medina.prep.detail": "Papel cónico en el Origami. Enjuaga, tira, café, nivela.",
  "step.origami.medina.p1.title": "Pulso 1",
  "step.origami.medina.p1.detail":
    "Vierte {pulse} g. Medina WBrC 2023 usó cinco pulsos iguales, cada 30 s, {temp}.",
  "step.origami.medina.later.title": "Pulsos 2–5",
  "step.origami.medina.later.detail": "Cada 30 s, otros {pulse} g, espiral hacia afuera y adentro, hasta {w} g.",
  "step.origami.medina.draw.title": "Drenaje",
  "step.origami.medina.draw.detail": "30 s quietos después del último pulso. Listo alrededor de {t}.",

  "step.orea.hsu.prep.title": "Dos teteras",
  "step.orea.hsu.prep.detail":
    "Shih Yuan Hsu WBrC 2022. El primer vertido frío domestica la fruta fermentada; los pulsos calientes arman dulzor.",
  "step.orea.hsu.p1.title": "Vertido 1 · frío",
  "step.orea.hsu.p1.detail": "{pulse} g a ~{cool} °C.",
  "step.orea.hsu.later.title": "Vertidos 2–4 · caliente",
  "step.orea.hsu.later.detail": "Tres pulsos más de {pulse} g a {temp} (95 °C), cada 30 s, hasta {w} g.",
  "step.orea.hsu.draw.title": "Drenaje",
  "step.orea.hsu.draw.detail": "Alrededor de {t}.{stall}",
  "step.orea.wolfl.prep.title": "Enjuagar",
  "step.orea.wolfl.prep.detail":
    "Cama plana OREA, papel asentado. Nivela el café. Wölfl WBrC 2024 usó una base rápida y un Melodrip.",
  "step.orea.wolfl.bloom.title": "Bloom",
  "step.orea.wolfl.bloom.detail": "Vierte {g} g. Espera ~40 s.",
  "step.orea.wolfl.second.title": "Segundo",
  "step.orea.wolfl.second.detail": "Completa hasta {g} g.",
  "step.orea.wolfl.third.title": "Tercero",
  "step.orea.wolfl.third.detail": "Completa hasta {g} g.",
  "step.orea.wolfl.finish.title": "Cierre",
  "step.orea.wolfl.finish.detail":
    "Vierte el resto hasta {w} g. Drenaje alrededor de {t}. Las camas rápidas se atascan menos que un V60.{stall}",

  "step.clever.gina.prep.title": "Asentado",
  "step.clever.gina.prep.detail": "Fukahori WBrC 2018 (GINA → Clever). Dos teteras si puedes: 80 °C y 95 °C.",
  "step.clever.gina.i1.title": "Inmersión · 80",
  "step.clever.gina.i1.detail": "En la mesada. {g} g a ~{cool} °C. 45 s. Dulzor y fruta.",
  "step.clever.gina.drip.title": "Goteo · 95",
  "step.clever.gina.drip.detail": "Ponlo sobre la taza (válvula abierta). Vierte hasta {g} g a {temp}. Se abren las capas.",
  "step.clever.gina.i2.title": "Inmersión · 80",
  "step.clever.gina.i2.detail": "De vuelta en la mesada. Llena hasta {w} g a ~{finish} °C. 45 s. Cuerpo jugoso.",
  "step.clever.gina.drain.title": "Drenar",
  "step.clever.gina.drain.detail": "Otra vez sobre la taza. Corta las gotas alrededor de {t}.",
  "step.clever.steep.prep.title": "Asentado",
  "step.clever.steep.prep.detail":
    "Filtro puesto, enjuaga, deja el Clever en la mesada (la válvula se cierra con su propio peso).",
  "step.clever.steep.fill.title": "Llenar",
  "step.clever.steep.fill.detail": "Café adentro, vierte todos los {w} g a {temp}, remueve para mojar.",
  "step.clever.steep.stir.title": "Remover",
  "step.clever.steep.stir.short": "Inmersión corta para una taza más brillante. Rompe la costra.",
  "step.clever.steep.stir.long": "Rompe la costra, espera 15 s.",
  "step.clever.steep.drain.title": "Drenar",
  "step.clever.steep.drain.detail": "Pon el Clever sobre la taza para abrir la válvula. Drena a {t}.",

  "step.espresso.flow":
    "Cualquier PID + control de flujo (paddle, needle valve, dimmer, Decent o Gaggiuino): pon el grupo a la temperatura y maneja flujo y presión con los tiempos de abajo.",
  "step.espresso.prepBase": "{coffee} g en un canasto caliente. WDT, nivela, tamp parejo. PID {temp}. {flow}",
  "step.espresso.setup.title": "Preparación",
  "step.espresso.blooming.setup": "{prep} Apunta a {ratio} ({yieldG} g). Total alrededor de {time} s.",
  "step.espresso.blooming.fill.title": "Llenar · flujo bajo",
  "step.espresso.blooming.fill.detail":
    "Abre a ~2–4 ml/s hasta mojar el puck y que la presión se siente en 4–5 bar (suelen ser 8–12 s). No saltes a 9 bar.",
  "step.espresso.blooming.bloom.title": "Bloom · bomba off",
  "step.espresso.blooming.bloom.detail":
    "Cierra el paddle / para la bomba. Mantén ~30 s. Unas gotas están bien; un chorro pide molienda más fina.",
  "step.espresso.blooming.ramp.title": "Subida",
  "step.espresso.blooming.ramp.detail":
    "Abre lento en ~6 s hasta 8–9 bar (o el spring de 9 bar de tu máquina). Las primeras gotas deben ser oscuras, no rubias.",
  "step.espresso.blooming.decline.title": "Bajada",
  "step.espresso.blooming.decline.detail":
    "Afloja el flujo para que la presión caiga hacia 6 bar mientras se llena la taza. Corta a {yieldG} g. Sabores de pour-over, menos ácido filo.",
  "step.espresso.turbo.setup": "{prep} Papel en el fondo de un canasto VST/IMS si tienes. Turbo: 15–20 s, {ratio}.",
  "step.espresso.turbo.fill.title": "Llenado rápido",
  "step.espresso.turbo.fill.detail": "Abre amplio — unos 8 ml/s — hasta que el manómetro toque 4,5 bar. Suelen ser 3–5 s.",
  "step.espresso.turbo.soak.title": "Remojo",
  "step.espresso.turbo.soak.detail":
    "Baja el flujo casi a cero. Mantén hasta ~6 g en la taza (unos segundos). El puck debe estar mojado del todo.",
  "step.espresso.turbo.extract.title": "Extracción con tope de flujo",
  "step.espresso.turbo.extract.detail":
    "Pon ~3 ml/s y no dejes que la presión pase de 6 bar. Si quiere 9 bar, abre más el paddle o muele más grueso.",
  "step.espresso.turbo.cut.title": "Cortar",
  "step.espresso.turbo.cut.detail":
    "Para a {yieldG} g. Alta extracción, poco amargo. Si chorrea, muele más fino; si se atasca a 6 bar sin flujo, más grueso.",
  "step.espresso.lhl.setup": "{prep} Báscula en la bandeja. {coffee} g → {yieldG} g ({ratio}).",
  "step.espresso.lhl.low.title": "Bajo",
  "step.espresso.lhl.low.detail": "Llenado suave ~2–3 ml/s para mojar el puck. Presión 2–3 bar. ~4 s.",
  "step.espresso.lhl.high.title": "Alto",
  "step.espresso.lhl.high.detail":
    "Abre a 5–7 bar y 5–8 g/s hasta ~{mid} g en la taza (cerca del 83% del objetivo). Este es el medio rápido de ratio alto.",
  "step.espresso.lhl.low2.title": "Bajo otra vez",
  "step.espresso.lhl.low2.detail": "Restringe otra vez a 2–3 bar / flujo lento y cierra a {yieldG} g. Total ~{time} s.",
  "step.espresso.lhl.dial.title": "Ajuste",
  "step.espresso.lhl.dial.detail":
    "Duro → más flujo en el medio o un toque más grueso. Hueco → muele más fino o alarga un segundo la fase alta.",
  "step.espresso.lever.setup": "{prep} Copia lever: inundación rápida, soak a 3 bar, subida, bajada. {ratio}, ~{time} s.",
  "step.espresso.lever.fill.title": "Llenado rápido",
  "step.espresso.lever.fill.detail":
    "Abre amplio 2–4 s para inundar el headspace. Luego cierra para sostener 3 bar (la banda es 2–4 bar).",
  "step.espresso.lever.soak.title": "3 bar hasta gotas",
  "step.espresso.lever.soak.detail":
    "Mantén 3 bar hasta que hayan caído 4–8 g en la taza. Demasiadas gotas muy rápido → más fino. Sin gotas → más grueso o espera.",
  "step.espresso.lever.rise.title": "Hasta ~8,5 bar",
  "step.espresso.lever.rise.detail": "Abre en ~6 s hacia 8–9 bar. Tope de flujo ~1,7–2,2 ml/s para que no chorree.",
  "step.espresso.lever.decline.title": "Spring",
  "step.espresso.lever.decline.detail":
    "Cuando el puck se abre, afloja el paddle para que la presión caiga hacia 6 bar. Corta a {yieldG} g. Cuerpo a jarabe.",
  "step.espresso.dark.setup": "{prep} Oscuro quiere agua más fría y una cola más lenta. {ratio}, ~{time} s.",
  "step.espresso.dark.fill.title": "Llenar",
  "step.espresso.dark.fill.detail": "Llenado medio ~3–4 ml/s hasta mojar el puck (5–8 s).",
  "step.espresso.dark.hold.title": "Hold",
  "step.espresso.dark.hold.detail":
    "Mantén 7–8 bar ~8 s. Hold más alto que el Adaptive Claro — aquí está el cuerpo cremoso.",
  "step.espresso.dark.tail.title": "Cola lenta",
  "step.espresso.dark.tail.detail":
    "Restringe a ~1–1,5 ml/s y deja que la presión baje hacia 5–6 bar. Corta a {yieldG} g.",
  "step.espresso.dark.dial.title": "Ajuste",
  "step.espresso.dark.dial.detail": "Amargo / ceniza → más frío o hold más corto. Delgado → más fino o 1 s más de hold.",
  "step.espresso.stock.setup": "{prep} Sin trucos de perfil: bomba a fondo, tú cortas el shot. {ratio}.",
  "step.espresso.stock.pre.title": "Preinfusión (opcional)",
  "step.espresso.stock.pre.detail":
    "Si la máquina tiene preinfusión de línea o paddle, 3–5 s a 2–3 bar y luego abre del todo.",
  "step.espresso.stock.nine.title": "9 bar",
  "step.espresso.stock.nine.detail":
    "Abre el paddle a fondo. Mantén ~9 bar (el techo del spring / OPV). No persigas 9 bar si el puck solo hace 8.",
  "step.espresso.stock.cut.title": "Cortar",
  "step.espresso.stock.cut.detail":
    "Para a {yieldG} g o ~{time} s. Rubio temprano → más fino. Gotas a 30 s → más grueso.",
  "step.espresso.filter.setup":
    "{prep} Papel 58 mm en el canasto, enjuaga. Más fino que filter, más grueso que espresso. Tamp suave o ninguno. Puck screen arriba.",
  "step.espresso.filter.fill.title": "Llenado suave",
  "step.espresso.filter.fill.detail": "2–3 ml/s hasta mojar la cama. La presión debe quedarse bajo 3 bar.",
  "step.espresso.filter.pull.title": "Tiro a baja presión",
  "step.espresso.filter.pull.detail":
    "Mantén 2–4 bar, unos 2–3 ml/s, hasta {yieldG} g (~1:5). Unos {time} s. Si llega a 9 bar vas muy fino.",
  "step.espresso.filter.cut.title": "Cortar con agua",
  "step.espresso.filter.cut.detail":
    "Suma {bypass} g de agua a {temp} (o justo bajo ebullición). Esta es una taza filter, no espresso.",
  "step.espresso.light.setup":
    "{prep} Adaptive Light: sin soak presurizado. Dulzor y claridad sobre cuerpo. {ratio}, ~{time} s.",
  "step.espresso.light.fill.title": "Llenado rápido",
  "step.espresso.light.fill.detail":
    "Abre a ~4 ml/s hasta mojar el puck (4–8 s). La presión sube y luego la cortas.",
  "step.espresso.light.soak.title": "Soak en caída",
  "step.espresso.light.soak.detail":
    "Cierra el paddle / para la bomba (soak a 0 bar). Deja que la presión caiga sola ~8–10 s. Eso evita que el Claro chorree.",
  "step.espresso.light.rise.title": "Subida 6 s",
  "step.espresso.light.rise.detail":
    "Abre para que la presión suba exactamente ~6 s, hacia 8–8,5 bar. Anota el flujo al final de esos 6 s — ese es el flujo objetivo del resto.",
  "step.espresso.light.tail.title": "Cola descendente",
  "step.espresso.light.tail.detail":
    "Mantén ese flujo. La presión debe caer al abrirse el puck (8,5 → ~6 bar). Tope 8,5 bar si pica. Corta a {yieldG} g.",
  "step.espresso.light.dial.title": "Ajuste",
  "step.espresso.light.dial.detail":
    "Ácido → más fino o un llenado más largo. Mudo / amargo → más grueso o un pico más bajo (7,5 bar).",

  "step.cold.prep.title": "Frasco",
  "step.cold.prep.detail": "Más grueso que espresso, más fino que piedras. {coffee} g en un frasco o botella.",
  "step.cold.fill.title": "Llenar",
  "step.cold.fill.detail": "Suma {w} g de agua fría o ambiente. Remueve fuerte para que no queden bolsas secas. Tapa.",
  "step.cold.fridge.title": "Nevera",
  "step.cold.fridge.detail": "Infusiona en la nevera {h} h. No lo dejes en la mesada.",
  "step.cold.decant.title": "Decantar",
  "step.cold.decant.detail": "Vierte con cuidado, o filtra con papel. Sirve frío. Diluye solo si se siente pesado.",
  "step.cold.dilute.title": "Decantar + diluir",
  "step.cold.dilute.detail":
    "Filtra con papel. Esto es un concentrado — corta con agua o hielo al gusto (CCC arranca ~1:8 y luego diluye hacia una taza).",

  "step.chemex.prep.title": "Enjuagar bien",
  "step.chemex.prep.detail":
    "3 capas hacia el pico. Enjuaga a fondo — el papel Chemex se siente si te lo saltas. Tira el agua.",
  "step.chemex.bloom.title": "Bloom",
  "step.chemex.bloom.detail": "{bloom} g, remueve a 0:10 para mojar la cama. Espera hasta 0:45.",
  "step.chemex.mid.title": "Hasta 60%",
  "step.chemex.mid.detail": "Círculos hasta {pour60} g.",
  "step.chemex.total.title": "Hasta el total",
  "step.chemex.total.detail": "Vierte hasta {w} g.",
  "step.chemex.stir.title": "Remover + agitar",
  "step.chemex.stir.detail": "Horario y luego antihorario, agite suave. Drenaje ~{t} (Hoffmann Chemex ~4:10).",

  "step.moka.prep.title": "Llenado caliente",
  "step.moka.prep.detail":
    "Llena la caldera con agua {temp} hasta la válvula de seguridad. Canasto a nivel ({coffee} g), sin tamp.",
  "step.moka.heat.title": "Fuego medio",
  "step.moka.heat.detail": "Tapa abierta para ver el chorro. Fuego medio — no es una carrera.",
  "step.moka.blonde.title": "Rubio",
  "step.moka.blonde.detail": "Cuando el café se pone color miel/rubio y empieza a gorgotear, sácala.",
  "step.moka.stop.title": "Cortar el brew",
  "step.moka.stop.detail": "Envuelve la base o pásala por agua para que no siga extrayendo. Remueve la cámara de arriba.",

  "step.cupping.prep.title": "Dosis SCA",
  "step.cupping.prep.detail": "{coffee} g por bowl, molienda un poco más gruesa que filter de papel. Un bowl por lote.",
  "step.cupping.pour.title": "Verter",
  "step.cupping.pour.detail": "{w} g a {temp} (SCA 93 °C). Llena hasta cubrir. Todavía no remuevas.",
  "step.cupping.break.title": "Romper",
  "step.cupping.break.detail": "Rompe la costra con una cuchara, huele, saca espuma y granos.",
  "step.cupping.slurp.title": "Sorber",
  "step.cupping.slurp.detail": "Cuando esté fresco, sorbe. Esta es la taza de referencia, no una receta para beber.",
};

export function recipeText(
  locale: Locale,
  key: RecipeKey,
  vars?: Record<string, string | number>,
): string {
  return interpolate((locale === "es" ? es : en)[key] ?? en[key], vars);
}

export function techField(
  locale: Locale,
  method: string,
  id: string,
  field: "flavor" | "mechanic" | "blurb",
): string | undefined {
  const key = `tech.${method}.${id}.${field}` as RecipeKey;
  const hit = recipeText(locale, key);
  return hit === key ? undefined : hit;
}
