# Journey results (2026-10-16, local dev server, live Qloo + Claude)

Scripts: `tests/e2e/journey-plan.js`, `journey-rest.js`, `journey-linkworker.js`, run with
`playwright-cli run-code --filename=...` at 1440x900 (desktop) and a 360 px mobile device.

| Journey | Desktop | Mobile |
|---|---|---|
| A. Seattle sample: intake, taste, plan | pass, first step 142 to 200 ms, plan 12.3 to 18.4 s | pass, first step 159 ms, plan 13.2 s |
| A. Swap uses a backup with no network call | pass (0 API calls) | pass (0 API calls) |
| A. No horizontal overflow | pass | pass at 360 px |
| B. Check in "Not for me" replaces and excludes | pass | pass (no backup left, refilled from Qloo) |
| B. Check in "I'd go back" refreshes later tiers (manual, Chicago) | pass, liked place drove 34% of new matches | not run |
| C. Compare: both sides live, same request text | pass | pass |
| D. Link worker: Spanish sheet, needs, print, wipe | pass, sheet in 13.1 to 14.7 s, no storage keys | not run |
| E. Privacy: two step delete empties storage | pass | pass |
| F. Misspelled neighborhood rejected | pass | pass |
| G. Qloo outage shows honest error, 0 cards | pass (mocked server error) | pass |

Targets from the spec: first step under 3 s (met), plan under 60 s (met), sample plan under 60 s
from the home page with no typing (met: two clicks plus about 15 s).
