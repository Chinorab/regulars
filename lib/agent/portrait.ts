import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_MODEL, cleanProse } from "./run";

// A short reading of the person's Qloo tags for the Taste screen. It may only use the tag
// names it is given; if the model is unavailable the screen shows the tags alone.
export async function writePortrait(
  taste: string[],
  rooms: string[],
): Promise<{ headline: string; body: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY || taste.length === 0) return null;
  try {
    const client = new Anthropic({ maxRetries: 1 });
    const msg = await client.beta.messages.create(
      {
        model: AGENT_MODEL,
        max_tokens: 2000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system:
          "You write a two part reading of someone's taste for a friendly, editorial web page. Use only the tags provided, rephrased in plain, literal words. No metaphors, no imagery, no scenes, nothing about light, smoke or weather. Line 1: a headline of at most 12 words, second person, no quotes. Line 2: one or two short sentences. No flattery, no mention of data or technology, no em dashes, no en dashes, no emoji. Output exactly two lines.",
        messages: [
          {
            role: "user",
            content: `Taste tags: ${taste.join(", ")}\nRooms they like: ${rooms.join(", ") || "none listed"}`,
          },
        ],
      },
      { timeout: 15_000 },
    );
    if (msg.stop_reason === "refusal") return null;
    const text = msg.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const [headline, ...rest] = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const h = cleanProse(headline?.replace(/^(headline|line 1)\s*:\s*/i, ""), 120);
    const b = cleanProse(rest.join(" ").replace(/^(body|line 2)\s*:\s*/i, ""), 320);
    return h && b ? { headline: h, body: b } : null;
  } catch {
    return null;
  }
}
