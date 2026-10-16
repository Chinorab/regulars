import type { TierKey } from "@/lib/plan/types";

// General "Your move" steps used when generated tips are unavailable or fail validation.
// They describe behavior only, never a venue fact (FR-011).
export const DEFAULT_TIPS: Record<TierKey, string[]> = {
  show_up: [
    "Go alone and give yourself permission to leave whenever you like.",
    "Find a spot where you can watch the room without being in the middle of it.",
    "Go back the same day next week, ideally at the same time.",
  ],
  come_back: [
    "Return at the same time of week so the same people see you again.",
    "Ask the person working there one small question about what they like.",
    "If someone looks familiar, a nod is enough.",
  ],
  join_in: [
    "Say one thing you noticed, even a small one.",
    "Learn one name and use it the next time.",
    "Ask if there is a regular group or table you could sit in on.",
  ],
};
