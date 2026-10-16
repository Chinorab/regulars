import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AGENT_MODEL, runAgent } from "@/lib/agent/run";
import { buildRequestText } from "@/lib/agent/prompt";
import { ProfileSchema } from "@/lib/plan/types";
import { ERROR_COPY, errorJson, readBody, toApiError } from "@/lib/http";
import { limit, limited } from "@/lib/ratelimit";

export const maxDuration = 60;

const Body = z.object({ profile: ProfileSchema });

// The bare side gets the same model and a neutral role, but no tools and no taste data.
const BARE_SYSTEM =
  "You help people who feel isolated find places to meet others and become regulars somewhere. Answer the person's question directly.";

// Both sides run live and in parallel on the identical request text (FR-017, analysis fix C2).
export async function POST(req: Request) {
  const rl = await limit(req, "plan");
  if (!rl.ok) return limited(rl.retryAfterSec);
  let body: z.infer<typeof Body>;
  try {
    body = await readBody(req, Body);
  } catch (e) {
    return errorJson(e);
  }
  const requestText = buildRequestText(body.profile);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      send({ type: "request", requestText });

      const without = (async () => {
        try {
          if (!process.env.ANTHROPIC_API_KEY) throw new Error("no key");
          const client = new Anthropic({ maxRetries: 1 });
          const msg = await client.beta.messages.create(
            {
              model: AGENT_MODEL,
              max_tokens: 4000,
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
              output_config: { effort: "low" },
              system: BARE_SYSTEM,
              messages: [{ role: "user", content: requestText }],
            },
            { timeout: 45_000 },
          );
          const text = msg.content
            .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n")
            .trim();
          send({ side: "without", type: "text", text, generatedAt: new Date().toISOString() });
        } catch {
          send({ side: "without", type: "error", code: "model_unavailable", message: ERROR_COPY.model_unavailable });
        }
      })();

      const withQloo = (async () => {
        try {
          const plan = await runAgent(body.profile, { onStep: (s) => send({ side: "with", type: "step", ...s }) });
          send({ side: "with", type: "plan", plan, generatedAt: new Date().toISOString() });
        } catch (e) {
          const err = toApiError(e);
          send({ side: "with", type: "error", code: err.code, message: err.message });
        }
      })();

      await Promise.allSettled([without, withQloo]);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
