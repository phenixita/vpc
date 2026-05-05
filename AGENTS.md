# Value Pricing Calculator — Agent Guide

## Project overview

Single-page React 19 + Vite 8 + TypeScript app for value-based pricing.
Deploy target: Firebase Hosting (SPA rewrite to `index.html`).
AI suggestions use OpenRouter free route from the browser.

For setup and deployment details, link to [README.md](./README.md).

## Commands agents should run

| Command | Description |
|---|---|
| `npm run dev` | Start local Vite dev server on `localhost:5173` |
| `npm run lint` | Run ESLint across the repo |
| `npm run build` | Type-check (`tsc -b`) then build (`vite build`) |
| `npm run deploy` | Deploy hosting with Firebase CLI |

CI uses Node 24 and `npm ci`; mirror that behavior when diagnosing CI-only failures.

## Architecture map

- `src/App.tsx`: Top-level shell with two tabs (`manual` and `ai`), orchestrates state.
- `src/components/ManualScenario.tsx`: Manual calculator workflow.
- `src/components/AiScenario.tsx`: AI workflow UI, warning acknowledgment, and result display.
- `src/components/ValueFields.tsx`: Shared value/currency inputs.
- `src/components/PriceResults.tsx`: Tiered price output rendering.
- `src/pricing.ts`: Core pricing domain logic (curves, parsing, currency formatting, tier generation).
- `src/openrouter.ts`: OpenRouter client, JSON response parsing/validation, guardrails.
- `src/main.tsx`: React entry point.
- `.github/workflows/firebase-deploy.yml`: Lint/build/deploy pipeline.

## Pricing domain facts

Two supported curves (IDs are contractually important across app + AI payloads):

- `might-as-well` -> multipliers `10%`, `15%`, `17.5%`
- `goldilocks` -> multipliers `10%`, `22%`, `50%`

If curve IDs change, update both `src/pricing.ts` and `src/openrouter.ts` prompt/schema logic together.

## Conventions that matter for agents

- TypeScript strictness is high across app and node tsconfigs; unused locals/params fail builds.
- `verbatimModuleSyntax` is enabled: use `import type` for type-only imports.
- `erasableSyntaxOnly` is enabled: avoid enums and namespaces.
- CSS is plain `.css` (no Tailwind, no CSS modules).
- Vite env vars must start with `VITE_`; only `VITE_OPENROUTER_API_KEY` is used.
- Local key setup is `.env.example` -> `.env.local` (see [README.md](./README.md)).

## AI and safety constraints

- AI analysis is disabled when `VITE_OPENROUTER_API_KEY` is not set at build time.
- User must acknowledge that sensitive data was removed before AI request is allowed.
- Prompt length cap exists in app (`MAX_PROJECT_BRIEF_LENGTH = 5000`).
- OpenRouter output must parse into strict JSON with valid curve ID, positive perceived value, non-empty summary, and at least one reasoning item.
- OpenRouter free route provider may vary; expect occasional output-shape drift and handle parse failures gracefully.

## CI/CD facts

- Workflow triggers on push to `main` and manual dispatch.
- Required secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_TOKEN`; `VITE_OPENROUTER_API_KEY` is optional.
- Deployment command in CI uses `npx firebase-tools deploy --non-interactive`.

## Pitfalls to avoid

- Do not rename curve IDs casually; they are used in UI state, AI prompts, and response validation.
- Do not assume US-only numeric input; `parseProjectValue` handles comma/dot variants.
- Do not introduce non-`VITE_` env var names for frontend runtime needs.
- Do not bypass AI warning acknowledgment checks in UI or API helper logic.
