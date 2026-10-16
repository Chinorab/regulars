<!--
Sync Impact Report
- Version change: template (unversioned) → 1.0.0
- Principles defined (all new):
  I. Truth From Qloo Only (NON-NEGOTIABLE)
  II. Every Claim Has a Source
  III. Privacy by Default
  IV. Qloo Is the Engine
  V. Warm, Editorial, Faithful to the Mockups
  VI. English Everywhere
  VII. Verified Before Every Deploy
  VIII. Spec Driven, Probe First
- Added sections: Technology and Delivery Constraints, Development Workflow and Quality Gates
- Removed sections: none
- Templates: plan/spec/tasks templates read this file at runtime; no template edits made.
- Deferred TODOs: none
-->

# Regulars Constitution

Regulars turns what a person loves into places where people with similar taste already gather,
then into a six week Connection Plan. Built for the Qloo Agentic Hackathon.

## Core Principles

### I. Truth From Qloo Only (NON-NEGOTIABLE)

- Every venue, attribute, affinity score, tag and piece of "Why you" evidence shown to a user
  MUST come from a live (or cached live) Qloo API response for that request.
- Opening hours, events, prices, distances, accessibility and descriptions MUST NOT be invented
  by the LLM or by code. If Qloo does not return a field, the UI does not show it.
- The LLM MAY write connective prose (a taste portrait, a suggested small step) but MUST NOT
  assert facts about a venue that are absent from the Qloo payload it was given. Generated prose
  MUST be visually distinct from Qloo evidence.
- When Qloo is unavailable, rate limited or returns nothing, the app MUST say so plainly. Fixtures
  and sample data MUST NOT be presented as real results anywhere in the product or demo.

Rationale: the product's credibility, and the jury's reason to believe Qloo matters, depend on
users being able to trust every concrete detail.

### II. Every Claim Has a Source

- Every statistic or research claim in the app, README or DEVPOST.md MUST link to its source.
- No fake reviews, testimonials, user counts, outcome numbers or placeholder metrics, ever.

### III. Privacy by Default

- No account is required to use any feature.
- Plan state lives in browser storage, and every storage read and write is wrapped in try/catch
  with a working fallback when storage is unavailable.
- Only Qloo (entity names, tags, city) and Anthropic (the conversation needed to plan) receive
  user data. No analytics, ad pixels or other third parties receive personal data.
- Secrets (QLOO_API_KEY, ANTHROPIC_API_KEY and any others) live only in server environment
  variables. They MUST NOT be hard coded, committed, logged, or reachable from client bundles.
- A privacy page that accurately describes these flows MUST exist before any public deploy.

### IV. Qloo Is the Engine

- Agent tools MUST be typed wrappers around real Qloo endpoints (/search, /v2/tags,
  /v2/insights) with validated inputs and outputs.
- Qloo responses MUST be cached server side and requests MUST be rate limited per IP.
- The "Without Qloo / With Qloo" comparison MUST send the same request to the bare LLM and to the
  Qloo grounded agent, both live, side by side.
- The same tools MUST be exposed through an MCP endpoint (Streamable HTTP) so external agents can
  call them.

Rationale: technical depth of Qloo usage is a primary judging criterion; Qloo must be load bearing,
not decorative.

### V. Warm, Editorial, Faithful to the Mockups

- The Claude Design mockups in /design are the visual source of truth. Design tokens live in one
  file; components consume tokens only.
- Banned: violet or purple gradients, pill shaped buttons, emoji (use icons), em or en dashes in
  copy, generic AI marketing copy, and any mention or tag of AI in user facing text or images.
  When a mockup conflicts with this list, this list wins and the conflict is reported.
- Missing states (loading, Qloo error, empty result) are designed in the same visual language.
- Mobile layouts MUST be complete and polished; WCAG AA contrast, keyboard access and 44px touch
  targets are required.
- A favicon MUST ship before any public deploy.

### VI. English Everywhere

All user facing text, generated output, documentation, code comments and commit messages are in
English.

### VII. Verified Before Every Deploy

- Before each Vercel deploy, playwright-cli MUST run the full journeys (intake, plan, check in,
  comparison, link worker mode, privacy) at mobile and desktop sizes against real Qloo data.
- Rendered screens are compared against the mockups before release.
- A failing journey blocks the deploy.

### VIII. Spec Driven, Probe First

- Work follows the Spec Kit order: constitution, specify, clarify, plan, tasks, analyze,
  implement.
- Before agent code is written, scripts in /scripts MUST call the live Qloo API (three US cities,
  three taste profiles) to confirm parameters, venue categories and response shapes. Findings go
  into the README section "What the live API taught us".

## Technology and Delivery Constraints

- Next.js (App Router) and TypeScript, deployed on Vercel.
- Agent: Claude API tool use loop on model `claude-sonnet-5-5`; tools wrap Qloo.
- Qloo hackathon base URL `https://hackathon.api.qloo.com`, header `X-Api-Key`.
- Public GitHub repository, MIT license visible in the repository About section.
- Three one click sample profiles (Austin, Chicago, Seattle) MUST run through the live Qloo API.
- Submission deadline: 2026-10-30 23:45 EDT. The live demo MUST stay online until 2026-11-16.

## Development Workflow and Quality Gates

- Each change is checked against Principles I and V before merge: no invented facts, no banned
  design patterns.
- Secret scan (no keys in the repo or client bundle) before each deploy.
- README and DEVPOST.md are updated whenever behaviour or Qloo usage changes.
- Solo developer: simplicity wins; any added dependency or service needs a stated reason in plan.md.

## Governance

This constitution supersedes other practices for this project. Amendments are written into this
file with a version bump (MAJOR for removed or redefined principles, MINOR for new principles or
sections, PATCH for wording) and an updated Sync Impact Report. Every plan.md includes a
Constitution Check against these principles; violations need a written justification or a fix.

**Version**: 1.0.0 | **Ratified**: 2026-10-15 | **Last Amended**: 2026-10-15
