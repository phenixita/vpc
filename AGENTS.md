# Value Pricing Calculator — Agent Guide

## Project overview

Single-page React 19 + Vite 8 + TypeScript app for value-based pricing.  
Deployed on **Firebase Hosting** with SPA rewrites.  
AI curve suggestions via **OpenRouter** (free route).

See [README.md](./README.md) for full setup and deployment instructions.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on `localhost:5173` |
| `npm run build` | Type-check (`tsc -b`) then build (`vite build`) |
| `npm run lint` | ESLint on all files |
| `npm run deploy` | `firebase deploy --only hosting` |

## Architecture

- **`src/App.tsx`** — Main component with two tabs: Manual (user picks curve) and AI (OpenRouter suggests curve)
- **`src/openrouter.ts`** — OpenRouter API client; exports `analyzeCurveSuggestion()`, `hasConfiguredOpenRouterKey`, and `CurveId` type
- **`src/vite-env.d.ts`** — Declares `ImportMetaEnv` with `VITE_OPENROUTER_API_KEY`
- **`src/index.css`** — Global styles and CSS custom properties
- **`src/App.css`** — Component styles

## Pricing curves

Two curves, each with 3 multipliers applied to the perceived value:

| Curve | Multipliers | Use case |
|-------|-------------|----------|
| Campfire | 10%, 15%, 17.5% | Safer, easier to close, lower risk |
| Moonshot | 10%, 22%, 50% | Bolder, higher-upside, premium-facing |

## Key conventions

- **TypeScript strict mode**: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly` are all enabled. Unused imports/variables cause build errors. Use `type` prefix for type-only imports.
- **CSS**: Plain `.css` files (no CSS modules or Tailwind). CSS custom properties in `:root` (`--surface`, `--border`, `--text`, `--muted`, `--primary`, `--danger`).
- **Vite env vars**: Must be prefixed `VITE_`. Only `VITE_OPENROUTER_API_KEY` is used. Embedded at build time.
- **OpenRouter**: Uses `openrouter/free` route. API key is optional — if missing, the AI tab shows a disabled-state message.
- **CI/CD**: GitHub Actions on push to `main` — lint, build, deploy to Firebase. Requires `FIREBASE_PROJECT_ID`, `FIREBASE_TOKEN`, and optionally `VITE_OPENROUTER_API_KEY` as secrets.
- **Firebase**: SPA rewrite (`"source": "**"` → `/index.html`). Public dir is `dist`.

## File structure

```
src/
  App.tsx          — Main UI component
  App.css          — Component styles
  index.css        — Global styles + CSS variables
  main.tsx         — React entry point
  openrouter.ts    — OpenRouter API client
  vite-env.d.ts    — Vite env type declarations
  assets/          — Static images (hero.png, react.svg, vite.svg)
public/
  favicon.svg      — Favicon
  icons.svg        — SVG icons sprite
.github/workflows/
  firebase-deploy.yml  — CI/CD pipeline
```

## Potential pitfalls

- **Missing API key**: If `VITE_OPENROUTER_API_KEY` is not set at build time, `hasConfiguredOpenRouterKey` is `false` and the AI button stays disabled.
- **TypeScript strictness**: `verbatimModuleSyntax` requires `import type` for type-only imports. `erasableSyntaxOnly` disallows enums and `namespace` keywords.
- **OpenRouter free route**: The underlying model provider may change between requests. Responses are parsed as JSON from the LLM output — malformed JSON causes a fallback error.
