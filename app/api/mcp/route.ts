import { mcpHandler } from "@/lib/mcp/server";
import { limit, limited } from "@/lib/ratelimit";

export const maxDuration = 60;

// MCP Streamable HTTP endpoint (contracts/mcp-tools.md). Only tool calls count against the
// per visitor limit; handshakes and tool listing are free.
async function handle(req: Request) {
  if (req.method === "POST") {
    const body = await req
      .clone()
      .json()
      .catch(() => null);
    const calls = (Array.isArray(body) ? body : [body]).filter((m) => m?.method === "tools/call").length;
    if (calls > 0) {
      const rl = await limit(req, "mcp");
      if (!rl.ok) return limited(rl.retryAfterSec);
    }
  }
  return mcpHandler(req);
}

export { handle as GET, handle as POST, handle as DELETE };
