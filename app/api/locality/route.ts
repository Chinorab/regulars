import { z } from "zod";
import { resolveLocality } from "@/lib/plan/locality";
import { ERROR_COPY, errorJson, readBody } from "@/lib/http";
import { limit, limited } from "@/lib/ratelimit";

const Body = z.object({ query: z.string().trim().min(2).max(120), city: z.string().trim().min(2).max(80) });

export async function POST(req: Request) {
  const rl = await limit(req, "light");
  if (!rl.ok) return limited(rl.retryAfterSec);
  try {
    const { query, city } = await readBody(req, Body);
    const r = await resolveLocality(query, city);
    if (!r.ok) {
      return Response.json(
        { error: "locality_not_found", message: ERROR_COPY.locality_not_found, resolvedTo: r.resolvedTo },
        { status: 422 },
      );
    }
    return Response.json({ locality: r.locality });
  } catch (e) {
    return errorJson(e);
  }
}
