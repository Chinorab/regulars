import { z } from "zod";
import { runAgent } from "@/lib/agent/run";
import { ProfileSchema } from "@/lib/plan/types";
import { errorJson, readBody, toApiError } from "@/lib/http";
import { limit, limited } from "@/lib/ratelimit";

export const maxDuration = 60;

const Body = z.object({
  profile: ProfileSchema,
  excludedPlaceIds: z.array(z.string()).max(60).default([]),
  addedSignalIds: z.array(z.string()).max(10).default([]),
});

// Streams the agent's steps as NDJSON lines, then the validated plan (contracts/http-api.md).
export async function POST(req: Request) {
  const rl = await limit(req, "plan");
  if (!rl.ok) return limited(rl.retryAfterSec);

  let body: z.infer<typeof Body>;
  try {
    body = await readBody(req, Body);
  } catch (e) {
    return errorJson(e);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      try {
        const plan = await runAgent(body.profile, {
          excludedPlaceIds: body.excludedPlaceIds,
          addedSignalIds: body.addedSignalIds,
          onStep: (s) => send({ type: "step", ...s }),
        });
        send({ type: "plan", plan });
      } catch (e) {
        const err = toApiError(e);
        send({ type: "error", code: err.code, message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
