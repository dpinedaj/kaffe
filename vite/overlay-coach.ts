import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

const STATUS_PATH = "/api/overlay-coach/status";
const CHAT_PATH = "/api/overlay-coach";

export function overlayCoachPlugin(env: Record<string, string>): Plugin {
  return {
    name: "kaffe-overlay-coach",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (req.method === "GET" && url === STATUS_PATH) {
          void writeJson(res, 200, statusPayload(env));
          return;
        }
        if (req.method === "POST" && url === CHAT_PATH) {
          void handleChat(req, res, env, server);
          return;
        }
        next();
      });
    },
  };
}

function statusPayload(env: Record<string, string>) {
  const hasKey = Boolean(env.CURSOR_API_KEY?.trim());
  return {
    enabled: hasKey,
    model: env.CURSOR_MODEL?.trim() || "composer-2.5",
    reason: hasKey
      ? null
      : "Set CURSOR_API_KEY in .env (see .env.example) and restart npm run dev.",
  };
}

async function handleChat(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>,
  server: ViteDevServer,
) {
  const key = env.CURSOR_API_KEY?.trim();
  if (!key) {
    await writeJson(res, 503, { error: statusPayload(env).reason });
    return;
  }
  let body: {
    question?: unknown;
    context?: unknown;
    history?: unknown;
    intent?: unknown;
  };
  try {
    body = JSON.parse(await readBody(req)) as typeof body;
  } catch {
    await writeJson(res, 400, { error: "Invalid JSON body." });
    return;
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    await writeJson(res, 400, { error: "question is required." });
    return;
  }

  const model = env.CURSOR_MODEL?.trim() || "composer-2.5";
  const prompt = buildPrompt(question, body.context, body.history, body.intent);

  try {
    const { Agent } = await import("@cursor/sdk");
    const result = await Agent.prompt(prompt, {
      apiKey: key,
      model: { id: model },
      tools: [],
      local: { cwd: server.config.root, settingSources: [] },
    });
    if (result.status === "error") {
      await writeJson(res, 502, { error: result.error?.message ?? "Cursor agent run failed." });
      return;
    }
    await writeJson(res, 200, { text: result.result ?? "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cursor agent failed to start.";
    await writeJson(res, 502, { error: message });
  }
}

function buildPrompt(
  question: string,
  context: unknown,
  history: unknown,
  intent: unknown,
): string {
  return [
    "You are Kaffe's local overlay roast coach for a Kaffelogic Nano 7.",
    "The user already has the BOOST kit and will enter load size on the machine.",
    "Do not retune the time-temperature curve for batch size.",
    "Reply with a single JSON object only, no markdown outside it:",
    '{ "feedback": "markdown-ok string", "intentPatch": { ... } or null }',
    "intentPatch may only contain RoastIntent fields: originId, varietyId, process, altitudeM, moisture, autoDensity, densityGL, expectFc, autoZones, drinkPlan, brew, roastStyle, autoLevel, level, flavors, name.",
    "flavors is at most two { id, weight } objects. Use allowed ids from the context.",
    "If you are only answering, set intentPatch to null.",
    "If you propose a new profile, fill intentPatch so Kaffe can call generateProfile locally.",
    "",
    "Current Generate intent:",
    JSON.stringify(intent ?? null),
    "",
    "Overlay context:",
    JSON.stringify(context ?? null),
    "",
    "Recent chat:",
    JSON.stringify(history ?? []),
    "",
    "User question:",
    question,
  ].join("\n");
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function writeJson(res: ServerResponse, status: number, body: unknown): Promise<void> {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(text);
}
