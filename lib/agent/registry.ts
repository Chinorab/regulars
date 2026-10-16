import "server-only";
import type { AgentStep, Entity, Place, TierKey } from "@/lib/plan/types";

// Per run evidence registry. Every fact the UI shows is read from here, and everything here
// came from a Qloo response during this run (constitution I). The model only ever hands back ids.
export class EvidenceRegistry {
  readonly entities = new Map<string, Entity>();
  readonly places = new Map<string, Place>();
  readonly tierResults: Record<TierKey, string[]> = { show_up: [], come_back: [], join_in: [] };
  readonly widened = new Set<TierKey>();
  readonly steps: AgentStep[] = [];
  qlooCalls = 0;
  cacheHits = 0;

  addEntity(e: Entity) {
    this.entities.set(e.id, e);
  }

  addPlaces(tier: TierKey | null, places: Place[]) {
    for (const p of places) {
      this.places.set(p.id, p);
      if (tier && !this.tierResults[tier].includes(p.id)) this.tierResults[tier].push(p.id);
    }
  }

  countCall(cacheHit: boolean) {
    this.qlooCalls++;
    if (cacheHit) this.cacheHits++;
  }

  // Name of a signal (a loved entity or a liked place) for "Why you" lines.
  signalName(id: string): string | undefined {
    return this.entities.get(id)?.name ?? this.places.get(id)?.name;
  }
}
