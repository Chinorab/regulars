# Feature Specification: Regulars Connection Plan

**Feature Branch**: `001-regulars-connection-plan`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Regulars: a web app plus agent that helps lonely adults become regulars
somewhere. From 3 to 5 things a person loves and their city, find real places where people with
similar taste already gather (via the Qloo taste graph) and build a six week Connection Plan in three
tiers (Show up, Come back, Join in), with check ins, a Without Qloo / With Qloo comparison, a link
worker mode with a printable sheet, an agent tool endpoint, three live sample profiles, a sourced
landing page and a privacy page." (full description in the build brief, 2026-10-15)

## Clarifications

### Session 2026-10-16

- Q: Should the plan be built by an agent that chooses which taste data tools to call, or by a fixed
  sequence with the language model only writing prose? → A: Agent chooses tools; its steps are shown
  live to the user; every fact is checked against taste data before display.
- Q: How many places should each tier offer? → A: One featured place plus two backups per tier,
  taken from the same lookup so swaps are instant.
- Q: How long may a taste data answer be reused from the server cache? → A: 24 hours; cards show when
  the data was fetched.
- Decided from live probes (no question needed): a neighborhood that resolves outside the United
  States or to a different city is rejected and the user is asked to correct it; Join in searches the
  neighborhood first and widens to the whole city when fewer than three places qualify; distance is
  shown from the neighborhood center, labeled as such.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get a six week plan from what I love (Priority: P1)

A person who feels isolated names three to five things they love (artists, films, series, books,
podcasts) and their neighborhood and city, sets a few constraints (budget per outing, free evenings,
no alcohol, how easy talking to someone new feels), and receives a six week Connection Plan: one or
more real places per tier, each explaining why it fits them.

**Why this priority**: This is the product. Every other story builds on a plan existing.

**Independent Test**: Enter "Big Thief, Past Lives, The Bear" and "Logan Square, Chicago", choose
constraints, and confirm a three tier plan of real Chicago places appears, each with Qloo evidence.

**Acceptance Scenarios**:

1. **Given** the intake screen, **When** the user types the names of things they love, **Then** each
   name is matched to a real catalog entity shown as a card with its image (when available), name and
   kind, and the user can remove any card.
2. **Given** a typed name that matches several entities, **When** the match is ambiguous, **Then** the
   user can pick the right one before continuing.
3. **Given** resolved entities and a city, **When** the user continues, **Then** a taste portrait
   appears built from the real taste tags returned for those entities, with each tag traceable to the
   entities it came from.
4. **Given** the taste portrait, **When** the user removes a tag, **Then** the next plan build no
   longer uses that tag as a signal.
5. **Given** the user asks to build the plan, **When** places are found, **Then** the plan shows three
   tiers: Weeks 1 and 2 "Show up" (places you can go alone with no pressure), Weeks 3 and 4 "Come back"
   (places with recurring formats where regulars form), Weeks 5 and 6 "Join in" (places where you take
   part).
6. **Given** a place card, **When** it is displayed, **Then** it shows only facts present in the taste
   data (name, address, category tags, price level, hours, website or similar, when present) and a
   "Why you" block listing the real evidence: affinity, the signal entities and tags that matched.
7. **Given** a place card, **When** "Your move" tips are displayed, **Then** they contain general
   behavioral suggestions only (no times, events or venue facts) and are visually distinct from
   evidence.
8. **Given** the user chose "no alcohol", **When** the plan is built, **Then** no place whose taste data
   classifies it primarily as a bar, pub, brewery, nightclub or similar drinking venue appears.
9. **Given** a plan, **When** the user taps "Swap place" on a card, **Then** a different real place for
   the same tier replaces it and the swapped place is not proposed again in this plan.

---

### User Story 2 - Try a sample profile in one click (Priority: P1)

A judge or curious visitor opens the site and, without typing anything, launches one of three sample
profiles: a newcomer in Austin who loves indie folk, a remote worker in Chicago who loves science
fiction, a retiree in Seattle who loves jazz and crime novels.

**Why this priority**: Judges must test end to end in seconds, with no account.

**Independent Test**: Click each sample on the home page and confirm a live plan appears for the
right city.

**Acceptance Scenarios**:

1. **Given** the home page, **When** a sample profile is clicked, **Then** the intake is filled with
   that profile and the real taste data lookup runs live (no stored results).
2. **Given** a sample profile run, **When** results appear, **Then** they are labeled as a sample
   profile but every place and piece of evidence is live data.

---

### User Story 3 - Check in after a visit and let the plan adapt (Priority: P2)

After going to a place, the user records how it went with one of three choices: "I'd go back",
"It was okay", "Not for me", plus an optional note. The plan changes in response.

**Why this priority**: Turning a list into a plan that follows the person is what makes regulars form.

**Independent Test**: Check in "Not for me" on the Show up place and confirm it is replaced and never
proposed again; check in "I'd go back" and confirm later tiers are rebuilt using that place as an
additional signal.

**Acceptance Scenarios**:

1. **Given** a plan, **When** the user checks in "Not for me" on a place, **Then** that place is
   excluded from all future suggestions and replaced with another real place for the same tier.
2. **Given** a plan, **When** the user checks in "I'd go back", **Then** the place is kept and used as
   an additional taste signal when later tiers are refreshed, and the change is shown to the user.
3. **Given** a plan, **When** the user checks in "It was okay", **Then** the place stays for one more
   visit and the plan shows that it will be reconsidered at the next check in.
4. **Given** any check in, **When** it is saved, **Then** the user sees a summary of what changed in
   each tier (unchanged, replaced, refreshed).

---

### User Story 4 - See the difference taste data makes (Priority: P2)

The user (or a judge) opens the comparison and sees the same request answered two ways, side by side
and live: by a general assistant with no taste data, and by the Regulars agent grounded in Qloo.

**Why this priority**: It is the clearest proof for the jury that Qloo is load bearing.

**Independent Test**: Open the comparison for an existing plan and confirm both answers are generated
at that moment from the same request text.

**Acceptance Scenarios**:

1. **Given** a request (from the user's intake or a sample), **When** the comparison opens, **Then**
   the exact request text is shown once, followed by both answers side by side (stacked on phones).
2. **Given** both answers, **When** they are displayed, **Then** the grounded answer lists the Qloo
   evidence for each place and the general answer is shown as returned, without edits.
3. **Given** either side fails, **When** the comparison renders, **Then** that side shows an honest
   error and the other side still renders.

---

### User Story 5 - Build a plan with a patient and print it (Priority: P2)

A link worker, social prescriber or care team member fills in a short form with a patient (first
name, neighborhood, three things they love, needs, social ease, sheet language, worker name and
phone) and prints a large print, letter size sheet the patient can take home.

**Why this priority**: Social prescribing is the credible real world channel for the product.

**Independent Test**: Fill the link worker form, print, and confirm the sheet contains the patient's
first name, three tiers of real places with evidence summaries, and the worker's contact, then confirm
nothing remains stored after printing.

**Acceptance Scenarios**:

1. **Given** link worker mode, **When** the worker fills the form, **Then** a live preview of the
   sheet updates.
2. **Given** a need such as "daytime only" or "step free entrance", **When** the taste data contains
   information that supports it, **Then** places are filtered accordingly; **when** it does not,
   **Then** the sheet says "Call ahead to check" for that need instead of promising it.
3. **Given** the sheet language is Spanish, **When** the sheet is printed, **Then** all fixed sheet
   text is in Spanish while place names and data stay as returned.
4. **Given** the sheet has been printed, **When** the worker leaves or starts over, **Then** no patient
   data remains in the browser.

---

### User Story 6 - Let another agent use Regulars (Priority: P3)

A developer connects an external agent (for example Claude Desktop) to the Regulars tool endpoint and
calls find_regular_spots, build_connection_plan and explain_match.

**Why this priority**: Shows agentic depth; not needed for the core human experience.

**Independent Test**: Connect a standard agent client to the endpoint, list its tools, call each tool
with a sample profile, and confirm results match what the web app shows for the same input.

**Acceptance Scenarios**:

1. **Given** an agent client, **When** it connects to the endpoint, **Then** it sees exactly the three
   tools with documented inputs and outputs.
2. **Given** a tool call, **When** it succeeds, **Then** it returns the same Qloo grounded data and
   evidence the web app uses; **when** taste data is unavailable, **Then** it returns an explicit error.

---

### User Story 7 - Understand the problem and the privacy promise (Priority: P3)

A visitor reads the landing page (the problem, with sources), how the six weeks work, and a privacy
page describing exactly what is sent where.

**Why this priority**: Credibility for judges and trust for real users.

**Independent Test**: Every statistic on the landing page links to one of the three source articles;
the privacy page matches actual data flows.

**Acceptance Scenarios**:

1. **Given** the landing page, **When** a figure or research claim is shown, **Then** it links to its
   source and appears in that source.
2. **Given** the privacy page, **When** read, **Then** it states that no account exists, plan data
   stays in the browser, and only Qloo and Anthropic receive the minimum needed.

---

### Edge Cases

- A typed name matches no entity: the user is told and can retry or remove it; the plan still works
  with at least one resolved entity.
- Fewer than three entities resolve: the user is told the plan may be less precise.
- The city is unknown or outside the data coverage: the user is told plainly, no invented places.
- A tier finds no place that satisfies every constraint: the tier says so and offers to relax one
  named constraint; it is never filled with an unverified place.
- Taste data service is down, slow or rate limited: an honest message explains it and offers retry;
  no cached result from another user or fixture is shown as theirs.
- The general assistant service is down: the plan still shows Qloo data, but sections that need
  generated prose (portrait sentence, tips, comparison left side) show a clear unavailable state.
- Browser storage is blocked (private mode): the app works for the session and warns the plan will
  not be kept.
- The same visitor sends many requests quickly: they are slowed with a clear message, not an error
  page.
- A place returned has no image: a designed placeholder is used, never a stock photo.

## Requirements *(mandatory)*

### Functional Requirements

**Intake and taste**

- **FR-001**: Users MUST be able to enter 1 to 5 things they love (3 recommended; under 3 shows a
  notice that the plan may be less precise) as free text and see each matched to a real entity card
  (image when available, name, kind), with disambiguation and removal.
- **FR-002**: Users MUST be able to enter a neighborhood and city (no street address requested).
- **FR-003**: Users MUST be able to set budget per outing (Free, Under $15, Under $40, Any), free
  evenings by weekday, a "no alcohol" preference and social ease on a 1 to 5 scale.
- **FR-004**: System MUST show a taste portrait made of real tags returned by the taste data service,
  each traceable to its source entities, plus a short headline and at most two sentences generated
  only from the displayed tags and labeled as a reading of them.
- **FR-005**: Users MUST be able to remove tags; removed tags MUST NOT be used as signals.

**Plan**

- **FR-006**: System MUST build a plan with three tiers: Show up (weeks 1 and 2), Come back (weeks 3
  and 4), Join in (weeks 5 and 6), each with one featured real place and up to two backup places
  from the same lookup.
- **FR-006a**: The plan MUST be built by an agent that decides which taste data tools to call; its
  steps (for example "Resolving Big Thief", "Searching bookstores near Logan Square") MUST be shown
  to the user as they happen, and the build MUST finish or fail with a clear message within 60
  seconds.
- **FR-006b**: The agent's final plan MUST be validated against the taste data it fetched; any place
  or fact not present in those responses MUST be dropped before display.
- **FR-006c**: Join in MUST search near the neighborhood first and widen to the whole city when fewer
  than three places qualify, showing each place's distance from the neighborhood center.
- **FR-007**: System MUST choose place categories per tier from the taste data's place categories
  (for example bookstores, record stores, music venues, climbing gyms, board game cafes, parks,
  community gardens), using lower pressure categories for lower social ease.
- **FR-008**: System MUST rank places using taste affinity for the user's signals within the user's
  city.
- **FR-009**: Each place card MUST display only facts present in the taste data payload; any field
  absent from the payload MUST NOT be displayed or inferred.
- **FR-010**: Each place card MUST include a "Why you" block showing affinity and the signal entities
  and tags used, as returned.
- **FR-011**: "Your move" tips MUST be general suggestions with no venue specific facts and MUST be
  visually distinct from evidence.
- **FR-012**: Budget, evenings and no alcohol constraints MUST be applied using taste data fields when
  present (price level, hours, category); where a field is missing, the card MUST say the constraint
  could not be checked rather than claim compliance.
- **FR-013**: Users MUST be able to swap a place; the next backup takes its place without a new
  lookup when one remains, and swapped places MUST be excluded from that plan.
- **FR-013a**: The neighborhood entered MUST resolve to a locality in the United States matching the
  stated city; otherwise the user is asked to correct it and no plan is built.

**Check in**

- **FR-014**: Users MUST be able to check in on a place with "I'd go back", "It was okay" or "Not for
  me" and an optional note.
- **FR-015**: "Not for me" MUST exclude the place from future suggestions and replace it; "I'd go
  back" MUST add the place as a signal for refreshing later tiers; "It was okay" MUST keep it and mark
  it for reconsideration.
- **FR-016**: After each check in, the system MUST show what changed per tier.

**Comparison**

- **FR-017**: System MUST send one identical request text live, at the moment the comparison opens,
  to a general assistant without taste data and to the grounded agent, and display both results side
  by side with the request text.
- **FR-018**: The grounded side MUST show evidence per place; the general side MUST be shown
  unedited.

**Link worker mode**

- **FR-019**: Link workers MUST be able to build a plan for another person with first name,
  neighborhood, loves, needs, social ease, sheet language (English or Spanish), worker name and phone.
- **FR-020**: Needs MUST be applied only where taste data supports them; otherwise the sheet MUST say
  "Call ahead to check".
- **FR-021**: System MUST produce a printable letter size, large print sheet with the three tiers,
  short evidence lines, small steps, check boxes for visits and the worker's contact.
- **FR-022**: Patient data in link worker mode MUST be erased from the browser after printing or on
  "Start over".

**Agent endpoint**

- **FR-023**: System MUST expose an agent tool endpoint, compatible with standard agent clients, with
  three tools: find_regular_spots, build_connection_plan, explain_match, documented in the README.

**Samples, content, trust**

- **FR-024**: Home page MUST offer three one click sample profiles (Austin indie folk newcomer,
  Chicago science fiction remote worker, Seattle jazz and crime novels retiree) that run live.
- **FR-025**: Landing page figures MUST come only from the three October 2026 sources named in the
  brief, each linked, using only figures each source contains.
- **FR-026**: System MUST provide a privacy page that matches the real data flows.
- **FR-027**: System MUST NOT require an account; plan state MUST be kept in the user's browser and
  the app MUST keep working when browser storage is unavailable.
- **FR-028**: Only the taste data provider (Qloo) and the language model provider (Anthropic) MAY
  receive user input, limited to what each needs. Any server cache or rate limit store MUST receive
  only keyed hashes (never raw input or IP addresses) and taste data responses.
- **FR-029**: When the taste data service fails, the system MUST show an honest error and MUST NOT
  display fixtures or invented data as results.
- **FR-030**: Requests MUST be limited per visitor to protect the shared service quota, with a clear
  message when the limit is hit.
- **FR-030a**: Taste data answers MAY be reused from the server cache for up to 24 hours; each place
  card MUST show when its data was fetched.
- **FR-031**: All user facing text MUST be in English (except the Spanish link worker sheet), with no
  em or en dashes, no emoji and no mention of AI.
- **FR-032**: Every screen MUST work and look finished on phones (from 360 px wide) and desktops, and
  MUST meet WCAG 2.1 AA contrast and keyboard access.

### Key Entities

- **Loved Item**: something the person loves; typed text, resolved entity id, name, kind, image.
- **Taste Tag**: a tag from the taste data service; id, label, the loved items it came from, removed
  flag.
- **Constraints**: city and neighborhood, budget, free evenings, no alcohol, social ease.
- **Place**: a real venue from the taste data service; id, name, the fields the payload provides,
  affinity, matched signals.
- **Tier**: Show up, Come back or Join in; weeks, goal, one featured place, up to two backups, tips.
- **Connection Plan**: constraints, taste tags used, three tiers, excluded places, created and updated
  dates.
- **Check In**: place, tier, choice, optional note, date, resulting changes.
- **Patient Sheet**: first name, needs, language, worker name and phone, plan snapshot; never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first time visitor can go from the home page to a complete three tier plan for a
  sample profile in under 60 seconds, with no account and no typing.
- **SC-002**: A user typing their own loves and city reaches a plan in under 3 minutes, and plan
  building itself completes within 60 seconds with visible progress throughout.
- **SC-003**: 100% of venue facts and evidence items displayed can be traced to a taste data response
  for that request (verified by audit of the three sample profiles).
- **SC-004**: All three sample profiles produce at least one real place in each of the three tiers.
- **SC-005**: When the taste data service is unreachable, 100% of affected screens show an honest
  error state and none show invented places.
- **SC-006**: A link worker can produce and print a sheet in under 5 minutes.
- **SC-007**: All primary journeys (intake, plan, check in, comparison, link worker, privacy) pass at
  phone and desktop sizes before each release.
- **SC-008**: An external agent client can list and successfully call all three tools.
- **SC-009**: The live demo remains available from submission until 2026-11-16.

## Assumptions

- Users are adults in US cities covered by the taste data service; coverage outside the US is out of
  scope.
- Taste data for places may lack hours, price or accessibility; those constraints are applied only
  when data exists (see FR-012, FR-020). The live API probes will establish which fields exist.
- No account, email or server side user storage exists in this version; the privacy page mockup's
  mentions of accounts, email, cookies for sign in and deletion from Settings will be removed.
- Tier names follow the brief (Show up, Come back, Join in) rather than the mockup (Watch, Return,
  Join in).
- Distance is computed from taste data coordinates and the neighborhood center returned by the taste
  data service, and labeled "from the center of <neighborhood>"; no walking time is shown.
- Social ease 1 to 2 favors places where people are side by side (listening, browsing, parks); 4 to 5
  allows participatory formats earlier.
- Spanish applies only to fixed sheet text in link worker mode, not to the whole app.
- The general assistant used for the comparison and for prose is the same model provider used by the
  agent.
