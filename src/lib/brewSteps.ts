import { recipeText, type RecipeKey } from "../i18n/recipeCopy";
import type { Locale } from "../i18n/translate";
import type { BrewMethod, BrewStep, Grind, SwitchMode } from "./brew";
import type { RoastStyleId } from "./knowledge";

export interface BrewStepCtx {
  locale: Locale;
  method: BrewMethod;
  coffeeG: number;
  waterG: number;
  bypassG?: number;
  kettleC: number;
  timeS: number;
  grind: Grind;
  gassy: boolean;
  natural: boolean;
  roastStyle: RoastStyleId;
  switchMode?: SwitchMode;
  technique?: string;
  startC?: number;
  finishC?: number;
}

type Vars = Record<string, string | number>;

function tx(ctx: BrewStepCtx, key: RecipeKey, vars?: Vars): string {
  return recipeText(ctx.locale, key, vars);
}

function at(ctx: BrewStepCtx, key: RecipeKey): string {
  return tx(ctx, key);
}

function stallOf(ctx: BrewStepCtx): string {
  return ctx.natural ? tx(ctx, "step.stall.natural") : "";
}

function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 10) / 10;
  return Number.isInteger(rounded) ? `1:${rounded}` : `1:${rounded.toFixed(1)}`;
}

function formatBrewTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function switchSteps(ctx: BrewStepCtx, bloom: number, temp: string, t: string, stall: string): BrewStep[] {
  const w = ctx.waterG;
  const mode = ctx.technique ?? ctx.switchMode ?? "steep";
  if (mode === "bull") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.switch.bull.prep.title"), detail: tx(ctx, "step.switch.bull.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.switch.bull.pour.title"), detail: tx(ctx, "step.switch.bull.pour.detail", { g: Math.round(w * 0.4), temp }) },
      { at: "0:55", title: tx(ctx, "step.switch.bull.steep.title"), detail: tx(ctx, "step.switch.bull.steep.detail", { mid: Math.round(w * 0.8), w }) },
      { at: "2:00", title: tx(ctx, "step.switch.bull.drain.title"), detail: tx(ctx, "step.switch.bull.drain.detail", { t, stall }) },
    ];
  }
  if (mode === "fukahori") {
    const bloomG = Math.max(bloom, Math.round(ctx.coffeeG * 3.5));
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.switch.fukahori.prep.title"), detail: tx(ctx, "step.switch.fukahori.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.switch.fukahori.bloom.title"), detail: tx(ctx, "step.switch.fukahori.bloom.detail", { bloom: bloomG, temp }) },
      { at: "0:30", title: tx(ctx, "step.switch.fukahori.pour.title"), detail: tx(ctx, "step.switch.fukahori.pour.detail", { w }) },
      { at: t, title: tx(ctx, "step.switch.fukahori.cut.title"), detail: tx(ctx, "step.switch.fukahori.cut.detail", { t, stall }) },
    ];
  }
  if (mode === "hybrid") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.switch.hybrid.prep.title"), detail: tx(ctx, "step.switch.hybrid.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.switch.hybrid.bloom.title"), detail: tx(ctx, "step.switch.hybrid.bloom.detail", { bloom: Math.round(ctx.coffeeG * 2.5), temp }) },
      { at: "0:40", title: tx(ctx, "step.switch.hybrid.mid.title"), detail: tx(ctx, "step.switch.hybrid.mid.detail", { a: Math.round(w * 0.4), b: Math.round(w * (2 / 3)) }) },
      { at: "2:10", title: tx(ctx, "step.switch.hybrid.last.title"), detail: tx(ctx, "step.switch.hybrid.last.detail", { w }) },
      { at: "2:55", title: tx(ctx, "step.switch.hybrid.drain.title"), detail: tx(ctx, "step.switch.hybrid.drain.detail", { t }) },
    ];
  }
  if (mode === "hold") {
    const first = Math.round(w * 0.6);
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.switch.hold.prep.title"), detail: tx(ctx, "step.switch.hold.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.switch.hold.bloom.title"), detail: tx(ctx, "step.switch.hold.bloom.detail", { bloom: Math.round(ctx.coffeeG * 2.5), temp }) },
      { at: "0:40", title: tx(ctx, "step.switch.hold.first.title"), detail: tx(ctx, "step.switch.hold.first.detail", { first }) },
      { at: "1:20", title: tx(ctx, "step.switch.hold.last.title"), detail: tx(ctx, "step.switch.hold.last.detail", { w }) },
      { at: t, title: tx(ctx, "step.switch.hold.draw.title"), detail: tx(ctx, "step.switch.hold.draw.detail", { t, stall }) },
    ];
  }
  if (mode === "double") {
    const first = Math.round(w * (100 / 220));
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.switch.double.prep.title"), detail: tx(ctx, "step.switch.double.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.switch.double.first.title"), detail: tx(ctx, "step.switch.double.first.detail", { first, temp }) },
      { at: "0:40", title: tx(ctx, "step.switch.double.drain1.title"), detail: tx(ctx, "step.switch.double.drain1.detail") },
      { at: "0:45", title: tx(ctx, "step.switch.double.second.title"), detail: tx(ctx, "step.switch.double.second.detail", { w }) },
      { at: "1:50", title: tx(ctx, "step.switch.double.drain2.title"), detail: tx(ctx, "step.switch.double.drain2.detail", { t, stall }) },
    ];
  }
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.switch.steep.prep.title"), detail: tx(ctx, "step.switch.steep.prep.detail") },
    { at: "0:00", title: tx(ctx, "step.switch.steep.bloom.title"), detail: tx(ctx, "step.switch.steep.bloom.detail", { bloom: Math.round(ctx.coffeeG * 2.5) }) },
    { at: "0:30", title: tx(ctx, "step.switch.steep.fill.title"), detail: tx(ctx, "step.switch.steep.fill.detail", { w, temp }) },
    { at: "2:00", title: tx(ctx, "step.switch.steep.stir.title"), detail: tx(ctx, "step.switch.steep.stir.detail") },
    { at: "2:15", title: tx(ctx, "step.switch.steep.open.title"), detail: tx(ctx, "step.switch.steep.open.detail", { t }) },
  ];
}

function v60Steps(ctx: BrewStepCtx, bloom: number, pour60: number, temp: string, t: string, stall: string): BrewStep[] {
  const w = ctx.waterG;
  const mode = ctx.technique ?? "hoffmann";
  if (mode === "kasuya-acid" || mode === "kasuya-sweet") {
    const first40 = Math.round(w * 0.4);
    const pour1 = Math.round(first40 * (mode === "kasuya-acid" ? 0.58 : 0.42));
    const pour2 = first40 - pour1;
    const later = Math.round((w - first40) / 3);
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.v60.kasuya.prep.title"), detail: tx(ctx, "step.v60.kasuya.prep.detail") },
      {
        at: "0:00",
        title: tx(ctx, mode === "kasuya-acid" ? "step.v60.kasuya.p1.acid" : "step.v60.kasuya.p1.sweet"),
        detail: tx(ctx, "step.v60.kasuya.p1.detail", { pour1, temp }),
      },
      { at: "0:45", title: tx(ctx, "step.v60.kasuya.p2.title"), detail: tx(ctx, "step.v60.kasuya.p2.detail", { pour2, first40 }) },
      { at: "1:30", title: tx(ctx, "step.v60.kasuya.later.title"), detail: tx(ctx, "step.v60.kasuya.later.detail", { later, w }) },
      { at: "3:30", title: tx(ctx, "step.v60.kasuya.lift.title"), detail: tx(ctx, "step.v60.kasuya.lift.detail", { t, stall }) },
    ];
  }
  if (mode === "chad") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.v60.chad.prep.title"), detail: tx(ctx, "step.v60.chad.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.v60.chad.bloom.title"), detail: tx(ctx, "step.v60.chad.bloom.detail", { bloom }) },
      { at: "0:30", title: tx(ctx, "step.v60.chad.pour.title"), detail: tx(ctx, "step.v60.chad.pour.detail", { w }) },
      { at: t, title: tx(ctx, "step.v60.chad.draw.title"), detail: tx(ctx, "step.v60.chad.draw.detail", { t, stall }) },
    ];
  }
  if (mode === "rao") {
    const first = Math.round(ctx.coffeeG * 3);
    const mid = Math.round(w * (200 / 330));
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.v60.rao.prep.title"), detail: tx(ctx, "step.v60.rao.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.v60.rao.bloom.title"), detail: tx(ctx, "step.v60.rao.bloom.detail", { first, temp }) },
      { at: "0:40", title: tx(ctx, "step.v60.rao.p1.title"), detail: tx(ctx, "step.v60.rao.p1.detail", { mid }) },
      { at: "1:30", title: tx(ctx, "step.v60.rao.p2.title"), detail: tx(ctx, "step.v60.rao.p2.detail", { w, t }) },
    ];
  }
  if (mode === "hedrick") {
    const first = Math.round(ctx.coffeeG * 3);
    const second = first * 2;
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.v60.hedrick.prep.title"), detail: tx(ctx, "step.v60.hedrick.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.v60.hedrick.b1.title"), detail: tx(ctx, "step.v60.hedrick.b1.detail", { first, temp }) },
      { at: "0:30", title: tx(ctx, "step.v60.hedrick.b2.title"), detail: tx(ctx, "step.v60.hedrick.b2.detail", { second }) },
      { at: "1:00", title: tx(ctx, "step.v60.hedrick.pour.title"), detail: tx(ctx, "step.v60.hedrick.pour.detail", { w, t }) },
    ];
  }
  if (mode === "iced") {
    const ice = ctx.bypassG ?? Math.round(w * 0.67);
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.v60.iced.prep.title"), detail: tx(ctx, "step.v60.iced.prep.detail", { ice }) },
      { at: "0:00", title: tx(ctx, "step.v60.iced.bloom.title"), detail: tx(ctx, "step.v60.iced.bloom.detail", { bloom }) },
      { at: "0:45", title: tx(ctx, "step.v60.iced.pour.title"), detail: tx(ctx, "step.v60.iced.pour.detail", { w, temp, t }) },
      { at: t, title: tx(ctx, "step.v60.iced.serve.title"), detail: tx(ctx, "step.v60.iced.serve.detail") },
    ];
  }
  if (mode === "peng") {
    const cool = ctx.finishC ?? 80;
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.v60.peng.prep.title"), detail: tx(ctx, "step.v60.peng.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.v60.peng.bloom.title"), detail: tx(ctx, "step.v60.peng.bloom.detail", { g: Math.round(w * (30 / 210)), temp }) },
      { at: "0:30", title: tx(ctx, "step.v60.peng.mid.title"), detail: tx(ctx, "step.v60.peng.mid.detail", { g: Math.round(w * (120 / 210)), temp }) },
      { at: "1:10", title: tx(ctx, "step.v60.peng.last.title"), detail: tx(ctx, "step.v60.peng.last.detail", { w, cool }) },
      { at: t, title: tx(ctx, "step.v60.peng.serve.title"), detail: tx(ctx, "step.v60.peng.serve.detail", { t, stall }) },
    ];
  }
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.v60.hoffmann.prep.title"), detail: tx(ctx, "step.v60.hoffmann.prep.detail") },
    {
      at: "0:00",
      title: tx(ctx, "step.v60.hoffmann.bloom.title"),
      detail: tx(ctx, "step.v60.hoffmann.bloom.detail", {
        bloom,
        bloomNote: tx(ctx, ctx.gassy ? "step.v60.hoffmann.bloom.gassy" : "step.v60.hoffmann.bloom.rested"),
        wait: tx(ctx, ctx.gassy ? "step.v60.hoffmann.bloom.waitGassy" : "step.v60.hoffmann.bloom.waitRested"),
      }),
    },
    { at: "0:45", title: tx(ctx, "step.v60.hoffmann.main.title"), detail: tx(ctx, "step.v60.hoffmann.main.detail", { pour60, w, temp }) },
    { at: "1:15", title: tx(ctx, "step.v60.hoffmann.finish.title"), detail: tx(ctx, "step.v60.hoffmann.finish.detail", { w, stall }) },
    { at: "1:30", title: tx(ctx, "step.v60.hoffmann.stir.title"), detail: tx(ctx, "step.v60.hoffmann.stir.detail", { t }) },
  ];
}

function aeroSteps(ctx: BrewStepCtx, temp: string, t: string): BrewStep[] {
  const mode = ctx.technique ?? (ctx.bypassG ? "stanica" : "pop");
  const bypass = ctx.bypassG ?? 0;
  if (mode === "pop") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.aero.pop.prep.title"), detail: tx(ctx, "step.aero.pop.prep.detail", { bypass, cool: ctx.finishC ?? 50 }) },
      { at: "0:00", title: tx(ctx, "step.aero.pop.brew.title"), detail: tx(ctx, "step.aero.pop.brew.detail", { coffee: ctx.coffeeG, water: ctx.waterG, temp }) },
      { at: "0:25", title: tx(ctx, "step.aero.pop.stir.title"), detail: tx(ctx, "step.aero.pop.stir.detail") },
      { at: "0:50", title: tx(ctx, "step.aero.pop.press.title"), detail: tx(ctx, "step.aero.pop.press.detail", { t }) },
    ];
  }
  if (mode === "merikanto") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.aero.merikanto.prep.title"), detail: tx(ctx, "step.aero.merikanto.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.aero.merikanto.bloom.title"), detail: tx(ctx, "step.aero.merikanto.bloom.detail", { g: Math.round(ctx.waterG * 0.25), temp }) },
      { at: "0:15", title: tx(ctx, "step.aero.merikanto.fill.title"), detail: tx(ctx, "step.aero.merikanto.fill.detail", { w: ctx.waterG, temp }) },
      { at: "1:40", title: tx(ctx, "step.aero.merikanto.press.title"), detail: tx(ctx, "step.aero.merikanto.press.detail") },
    ];
  }
  if (mode === "tay") {
    const extra = Math.max(1, Math.round(ctx.coffeeG * (2 / 18)));
    const firstDose = ctx.coffeeG - extra;
    const room = Math.round((bypass || 55) * 0.5);
    const hot = (bypass || 55) - room;
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.aero.tay.prep.title"), detail: tx(ctx, "step.aero.tay.prep.detail", { first: firstDose }) },
      { at: "0:00", title: tx(ctx, "step.aero.tay.pour.title"), detail: tx(ctx, "step.aero.tay.pour.detail", { w: ctx.waterG, temp }) },
      { at: "0:30", title: tx(ctx, "step.aero.tay.stir.title"), detail: tx(ctx, "step.aero.tay.stir.detail") },
      { at: "0:45", title: tx(ctx, "step.aero.tay.charge.title"), detail: tx(ctx, "step.aero.tay.charge.detail", { extra }) },
      { at: "1:35", title: tx(ctx, "step.aero.tay.press.title"), detail: tx(ctx, "step.aero.tay.press.detail") },
      { at: "2:05", title: tx(ctx, "step.aero.tay.bypass.title"), detail: tx(ctx, "step.aero.tay.bypass.detail", { room, hot }) },
    ];
  }
  if (mode === "wendelien") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.aero.wendelien.prep.title"), detail: tx(ctx, "step.aero.wendelien.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.aero.wendelien.pour.title"), detail: tx(ctx, "step.aero.wendelien.pour.detail", { w: ctx.waterG, temp }) },
      { at: "0:40", title: tx(ctx, "step.aero.wendelien.press.title"), detail: tx(ctx, "step.aero.wendelien.press.detail") },
      { at: "1:00", title: tx(ctx, "step.aero.wendelien.bypass.title"), detail: tx(ctx, "step.aero.wendelien.bypass.detail", { bypass }) },
    ];
  }
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.aero.stanica.prep.title"), detail: tx(ctx, "step.aero.stanica.prep.detail") },
    { at: "0:00", title: tx(ctx, "step.aero.stanica.bloom.title"), detail: tx(ctx, "step.aero.stanica.bloom.detail", { coffee: ctx.coffeeG, half: Math.round(ctx.waterG / 2), temp }) },
    { at: "0:30", title: tx(ctx, "step.aero.stanica.fill.title"), detail: tx(ctx, "step.aero.stanica.fill.detail", { w: ctx.waterG }) },
    { at: "1:20", title: tx(ctx, "step.aero.stanica.cap.title"), detail: tx(ctx, "step.aero.stanica.cap.detail") },
    { at: "1:35", title: tx(ctx, "step.aero.stanica.press.title"), detail: tx(ctx, "step.aero.stanica.press.detail", { bypass, cup: ctx.coffeeG + ctx.waterG + bypass }) },
  ];
}

function frenchSteps(ctx: BrewStepCtx, temp: string): BrewStep[] {
  const classic = ctx.technique === "classic" || ctx.roastStyle === "dark";
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.french.prep.title"), detail: tx(ctx, "step.french.prep.detail") },
    { at: "0:00", title: tx(ctx, "step.french.pour.title"), detail: tx(ctx, "step.french.pour.detail", { w: ctx.waterG, temp }) },
    { at: "4:00", title: tx(ctx, "step.french.break.title"), detail: tx(ctx, "step.french.break.detail") },
    classic
      ? { at: "4:00", title: tx(ctx, "step.french.classic.title"), detail: tx(ctx, "step.french.classic.detail") }
      : { at: "9:00–10:00", title: tx(ctx, "step.french.settle.title"), detail: tx(ctx, "step.french.settle.detail") },
  ];
}

function kalitaSteps(ctx: BrewStepCtx, bloom: number, temp: string, t: string, stall: string): BrewStep[] {
  if (ctx.technique === "mccarthy") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.kalita.mccarthy.prep.title"), detail: tx(ctx, "step.kalita.mccarthy.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.kalita.mccarthy.bloom.title"), detail: tx(ctx, "step.kalita.mccarthy.bloom.detail", { bloom, temp }) },
      { at: "0:45", title: tx(ctx, "step.kalita.mccarthy.col.title"), detail: tx(ctx, "step.kalita.mccarthy.col.detail", { w: ctx.waterG }) },
      { at: t, title: tx(ctx, "step.kalita.mccarthy.draw.title"), detail: tx(ctx, "step.kalita.mccarthy.draw.detail", { t, stall }) },
    ];
  }
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.kalita.wave.prep.title"), detail: tx(ctx, "step.kalita.wave.prep.detail") },
    { at: "0:00", title: tx(ctx, "step.kalita.wave.bloom.title"), detail: tx(ctx, "step.kalita.wave.bloom.detail", { bloom }) },
    { at: "0:45", title: tx(ctx, "step.kalita.wave.pulses.title"), detail: tx(ctx, "step.kalita.wave.pulses.detail", { w: ctx.waterG }) },
    { at: t, title: tx(ctx, "step.kalita.wave.draw.title"), detail: tx(ctx, "step.kalita.wave.draw.detail", { t, stall }) },
  ];
}

function origamiSteps(ctx: BrewStepCtx, temp: string, t: string, stall: string): BrewStep[] {
  const w = ctx.waterG;
  if (ctx.technique === "du") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.origami.du.prep.title"), detail: tx(ctx, "step.origami.du.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.origami.du.p1.title"), detail: tx(ctx, "step.origami.du.p1.detail", { g: Math.round(w * (60 / 240)), temp }) },
      { at: "0:18", title: tx(ctx, "step.origami.du.p2.title"), detail: tx(ctx, "step.origami.du.p2.detail", { g: Math.round(w * (140 / 240)) }) },
      { at: "0:56", title: tx(ctx, "step.origami.du.p3.title"), detail: tx(ctx, "step.origami.du.p3.detail", { w, t, stall }) },
    ];
  }
  const pulse = Math.round(w / 5);
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.origami.medina.prep.title"), detail: tx(ctx, "step.origami.medina.prep.detail") },
    { at: "0:00", title: tx(ctx, "step.origami.medina.p1.title"), detail: tx(ctx, "step.origami.medina.p1.detail", { pulse, temp }) },
    { at: "0:30", title: tx(ctx, "step.origami.medina.later.title"), detail: tx(ctx, "step.origami.medina.later.detail", { pulse, w }) },
    { at: t, title: tx(ctx, "step.origami.medina.draw.title"), detail: tx(ctx, "step.origami.medina.draw.detail", { t }) },
  ];
}

function oreaSteps(ctx: BrewStepCtx, temp: string, t: string, stall: string): BrewStep[] {
  const w = ctx.waterG;
  if (ctx.technique === "hsu") {
    const pulse = Math.round(w / 4);
    const cool = ctx.startC ?? 70;
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.orea.hsu.prep.title"), detail: tx(ctx, "step.orea.hsu.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.orea.hsu.p1.title"), detail: tx(ctx, "step.orea.hsu.p1.detail", { pulse, cool }) },
      { at: "0:30", title: tx(ctx, "step.orea.hsu.later.title"), detail: tx(ctx, "step.orea.hsu.later.detail", { pulse, temp, w }) },
      { at: t, title: tx(ctx, "step.orea.hsu.draw.title"), detail: tx(ctx, "step.orea.hsu.draw.detail", { t, stall }) },
    ];
  }
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.orea.wolfl.prep.title"), detail: tx(ctx, "step.orea.wolfl.prep.detail") },
    { at: "0:00", title: tx(ctx, "step.orea.wolfl.bloom.title"), detail: tx(ctx, "step.orea.wolfl.bloom.detail", { g: Math.round(w * (60 / 270)) }) },
    { at: "0:40", title: tx(ctx, "step.orea.wolfl.second.title"), detail: tx(ctx, "step.orea.wolfl.second.detail", { g: Math.round(w * (120 / 270)) }) },
    { at: "1:20", title: tx(ctx, "step.orea.wolfl.third.title"), detail: tx(ctx, "step.orea.wolfl.third.detail", { g: Math.round(w * (170 / 270)) }) },
    { at: "2:00", title: tx(ctx, "step.orea.wolfl.finish.title"), detail: tx(ctx, "step.orea.wolfl.finish.detail", { w, t, stall }) },
  ];
}

function cleverSteps(ctx: BrewStepCtx, temp: string, t: string): BrewStep[] {
  if (ctx.technique === "gina") {
    const cool = ctx.startC ?? 80;
    const w = ctx.waterG;
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.clever.gina.prep.title"), detail: tx(ctx, "step.clever.gina.prep.detail") },
      { at: "0:00", title: tx(ctx, "step.clever.gina.i1.title"), detail: tx(ctx, "step.clever.gina.i1.detail", { g: Math.round(w * (50 / 220)), cool }) },
      { at: "0:45", title: tx(ctx, "step.clever.gina.drip.title"), detail: tx(ctx, "step.clever.gina.drip.detail", { g: Math.round(w * (150 / 220)), temp }) },
      { at: "1:45", title: tx(ctx, "step.clever.gina.i2.title"), detail: tx(ctx, "step.clever.gina.i2.detail", { w, finish: ctx.finishC ?? 80 }) },
      { at: "2:30", title: tx(ctx, "step.clever.gina.drain.title"), detail: tx(ctx, "step.clever.gina.drain.detail", { t }) },
    ];
  }
  const short = ctx.technique === "short";
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.clever.steep.prep.title"), detail: tx(ctx, "step.clever.steep.prep.detail") },
    { at: "0:00", title: tx(ctx, "step.clever.steep.fill.title"), detail: tx(ctx, "step.clever.steep.fill.detail", { w: ctx.waterG, temp }) },
    { at: short ? "1:00" : "2:00", title: tx(ctx, "step.clever.steep.stir.title"), detail: tx(ctx, short ? "step.clever.steep.stir.short" : "step.clever.steep.stir.long") },
    { at: short ? "1:15" : "2:15", title: tx(ctx, "step.clever.steep.drain.title"), detail: tx(ctx, "step.clever.steep.drain.detail", { t }) },
  ];
}

function espressoSteps(ctx: BrewStepCtx, temp: string): BrewStep[] {
  const mode = ctx.technique ?? "adaptive-light";
  const yieldG = ctx.waterG;
  const ratio = formatRatio(ctx.waterG / ctx.coffeeG);
  const time = Math.round(ctx.timeS);
  const flow = tx(ctx, "step.espresso.flow");
  const prep = tx(ctx, "step.espresso.prepBase", { coffee: ctx.coffeeG, temp, flow });

  if (mode === "blooming") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.espresso.setup.title"), detail: tx(ctx, "step.espresso.blooming.setup", { prep, ratio, yieldG, time }) },
      { at: "0:00", title: tx(ctx, "step.espresso.blooming.fill.title"), detail: tx(ctx, "step.espresso.blooming.fill.detail") },
      { at: "0:12", title: tx(ctx, "step.espresso.blooming.bloom.title"), detail: tx(ctx, "step.espresso.blooming.bloom.detail") },
      { at: "0:42", title: tx(ctx, "step.espresso.blooming.ramp.title"), detail: tx(ctx, "step.espresso.blooming.ramp.detail") },
      { at: "0:50", title: tx(ctx, "step.espresso.blooming.decline.title"), detail: tx(ctx, "step.espresso.blooming.decline.detail", { yieldG }) },
    ];
  }
  if (mode === "extractamundo") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.espresso.setup.title"), detail: tx(ctx, "step.espresso.turbo.setup", { prep, ratio }) },
      { at: "0:00", title: tx(ctx, "step.espresso.turbo.fill.title"), detail: tx(ctx, "step.espresso.turbo.fill.detail") },
      { at: "0:05", title: tx(ctx, "step.espresso.turbo.soak.title"), detail: tx(ctx, "step.espresso.turbo.soak.detail") },
      { at: "0:08", title: tx(ctx, "step.espresso.turbo.extract.title"), detail: tx(ctx, "step.espresso.turbo.extract.detail") },
      { at: "0:18", title: tx(ctx, "step.espresso.turbo.cut.title"), detail: tx(ctx, "step.espresso.turbo.cut.detail", { yieldG }) },
    ];
  }
  if (mode === "lhl") {
    const mid = Math.round(yieldG * 0.83);
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.espresso.setup.title"), detail: tx(ctx, "step.espresso.lhl.setup", { prep, coffee: ctx.coffeeG, yieldG, ratio }) },
      { at: "0:00", title: tx(ctx, "step.espresso.lhl.low.title"), detail: tx(ctx, "step.espresso.lhl.low.detail") },
      { at: "0:04", title: tx(ctx, "step.espresso.lhl.high.title"), detail: tx(ctx, "step.espresso.lhl.high.detail", { mid }) },
      { at: "0:16", title: tx(ctx, "step.espresso.lhl.low2.title"), detail: tx(ctx, "step.espresso.lhl.low2.detail", { yieldG, time }) },
      { at: at(ctx, "step.at.taste"), title: tx(ctx, "step.espresso.lhl.dial.title"), detail: tx(ctx, "step.espresso.lhl.dial.detail") },
    ];
  }
  if (mode === "londinium") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.espresso.setup.title"), detail: tx(ctx, "step.espresso.lever.setup", { prep, ratio, time }) },
      { at: "0:00", title: tx(ctx, "step.espresso.lever.fill.title"), detail: tx(ctx, "step.espresso.lever.fill.detail") },
      { at: at(ctx, "step.at.soak"), title: tx(ctx, "step.espresso.lever.soak.title"), detail: tx(ctx, "step.espresso.lever.soak.detail") },
      { at: at(ctx, "step.at.rise"), title: tx(ctx, "step.espresso.lever.rise.title"), detail: tx(ctx, "step.espresso.lever.rise.detail") },
      { at: at(ctx, "step.at.decline"), title: tx(ctx, "step.espresso.lever.decline.title"), detail: tx(ctx, "step.espresso.lever.decline.detail", { yieldG }) },
    ];
  }
  if (mode === "adaptive-dark") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.espresso.setup.title"), detail: tx(ctx, "step.espresso.dark.setup", { prep, ratio, time }) },
      { at: "0:00", title: tx(ctx, "step.espresso.dark.fill.title"), detail: tx(ctx, "step.espresso.dark.fill.detail") },
      { at: "0:08", title: tx(ctx, "step.espresso.dark.hold.title"), detail: tx(ctx, "step.espresso.dark.hold.detail") },
      { at: "0:16", title: tx(ctx, "step.espresso.dark.tail.title"), detail: tx(ctx, "step.espresso.dark.tail.detail", { yieldG }) },
      { at: at(ctx, "step.at.taste"), title: tx(ctx, "step.espresso.dark.dial.title"), detail: tx(ctx, "step.espresso.dark.dial.detail") },
    ];
  }
  if (mode === "stock") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.espresso.setup.title"), detail: tx(ctx, "step.espresso.stock.setup", { prep, ratio }) },
      { at: "0:00", title: tx(ctx, "step.espresso.stock.pre.title"), detail: tx(ctx, "step.espresso.stock.pre.detail") },
      { at: "0:05", title: tx(ctx, "step.espresso.stock.nine.title"), detail: tx(ctx, "step.espresso.stock.nine.detail") },
      { at: "0:27", title: tx(ctx, "step.espresso.stock.cut.title"), detail: tx(ctx, "step.espresso.stock.cut.detail", { yieldG, time }) },
    ];
  }
  if (mode === "filter") {
    return [
      { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.espresso.setup.title"), detail: tx(ctx, "step.espresso.filter.setup", { prep }) },
      { at: "0:00", title: tx(ctx, "step.espresso.filter.fill.title"), detail: tx(ctx, "step.espresso.filter.fill.detail") },
      { at: "0:15", title: tx(ctx, "step.espresso.filter.pull.title"), detail: tx(ctx, "step.espresso.filter.pull.detail", { yieldG, time }) },
      { at: at(ctx, "step.at.dilute"), title: tx(ctx, "step.espresso.filter.cut.title"), detail: tx(ctx, "step.espresso.filter.cut.detail", { bypass: ctx.bypassG ?? 230, temp }) },
    ];
  }
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.espresso.setup.title"), detail: tx(ctx, "step.espresso.light.setup", { prep, ratio, time }) },
    { at: "0:00", title: tx(ctx, "step.espresso.light.fill.title"), detail: tx(ctx, "step.espresso.light.fill.detail") },
    { at: "0:08", title: tx(ctx, "step.espresso.light.soak.title"), detail: tx(ctx, "step.espresso.light.soak.detail") },
    { at: "0:18", title: tx(ctx, "step.espresso.light.rise.title"), detail: tx(ctx, "step.espresso.light.rise.detail") },
    { at: "0:24", title: tx(ctx, "step.espresso.light.tail.title"), detail: tx(ctx, "step.espresso.light.tail.detail", { yieldG }) },
    { at: at(ctx, "step.at.taste"), title: tx(ctx, "step.espresso.light.dial.title"), detail: tx(ctx, "step.espresso.light.dial.detail") },
  ];
}

function coldSteps(ctx: BrewStepCtx, t: string): BrewStep[] {
  const concentrate = ctx.technique === "concentrate";
  return [
    { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.cold.prep.title"), detail: tx(ctx, "step.cold.prep.detail", { coffee: ctx.coffeeG }) },
    { at: "0:00", title: tx(ctx, "step.cold.fill.title"), detail: tx(ctx, "step.cold.fill.detail", { w: ctx.waterG }) },
    { at: t, title: tx(ctx, "step.cold.fridge.title"), detail: tx(ctx, "step.cold.fridge.detail", { h: Math.round(ctx.timeS / 3600) }) },
    {
      at: at(ctx, "step.at.filter"),
      title: tx(ctx, concentrate ? "step.cold.dilute.title" : "step.cold.decant.title"),
      detail: tx(ctx, concentrate ? "step.cold.dilute.detail" : "step.cold.decant.detail"),
    },
  ];
}

export function buildBrewSteps(ctx: BrewStepCtx): BrewStep[] {
  const bloom = Math.round(ctx.coffeeG * (ctx.gassy ? 3 : 2));
  const pour60 = Math.round(ctx.waterG * 0.6);
  const t = formatBrewTime(ctx.timeS);
  const temp = `${ctx.kettleC.toFixed(0)} °C`;
  const stall = stallOf(ctx);

  switch (ctx.method) {
    case "v60":
      return v60Steps(ctx, bloom, pour60, temp, t, stall);
    case "kalita":
      return kalitaSteps(ctx, bloom, temp, t, stall);
    case "origami":
      return origamiSteps(ctx, temp, t, stall);
    case "chemex":
      return [
        { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.chemex.prep.title"), detail: tx(ctx, "step.chemex.prep.detail") },
        { at: "0:00", title: tx(ctx, "step.chemex.bloom.title"), detail: tx(ctx, "step.chemex.bloom.detail", { bloom: Math.max(60, bloom) }) },
        { at: "0:45", title: tx(ctx, "step.chemex.mid.title"), detail: tx(ctx, "step.chemex.mid.detail", { pour60 }) },
        { at: "1:15", title: tx(ctx, "step.chemex.total.title"), detail: tx(ctx, "step.chemex.total.detail", { w: ctx.waterG }) },
        { at: "1:45", title: tx(ctx, "step.chemex.stir.title"), detail: tx(ctx, "step.chemex.stir.detail", { t }) },
      ];
    case "switch":
      return switchSteps(ctx, bloom, temp, t, stall);
    case "clever":
      return cleverSteps(ctx, temp, t);
    case "aeropress":
      return aeroSteps(ctx, temp, t);
    case "frenchpress":
      return frenchSteps(ctx, temp);
    case "orea":
      return oreaSteps(ctx, temp, t, stall);
    case "coldbrew":
      return coldSteps(ctx, t);
    case "moka":
      return [
        { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.moka.prep.title"), detail: tx(ctx, "step.moka.prep.detail", { temp, coffee: ctx.coffeeG }) },
        { at: "0:00", title: tx(ctx, "step.moka.heat.title"), detail: tx(ctx, "step.moka.heat.detail") },
        { at: "~1:00", title: tx(ctx, "step.moka.blonde.title"), detail: tx(ctx, "step.moka.blonde.detail") },
        { at: at(ctx, "step.at.stop"), title: tx(ctx, "step.moka.stop.title"), detail: tx(ctx, "step.moka.stop.detail") },
      ];
    case "espresso":
      return espressoSteps(ctx, temp);
    case "cupping":
      return [
        { at: at(ctx, "step.at.prep"), title: tx(ctx, "step.cupping.prep.title"), detail: tx(ctx, "step.cupping.prep.detail", { coffee: ctx.coffeeG }) },
        { at: "0:00", title: tx(ctx, "step.cupping.pour.title"), detail: tx(ctx, "step.cupping.pour.detail", { w: ctx.waterG, temp }) },
        { at: "4:00", title: tx(ctx, "step.cupping.break.title"), detail: tx(ctx, "step.cupping.break.detail") },
        { at: "8:00–10:00", title: tx(ctx, "step.cupping.slurp.title"), detail: tx(ctx, "step.cupping.slurp.detail") },
      ];
  }
}
