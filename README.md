# 🧮 Value Pricing Calculator

> **AI-assisted value-based pricing, powered by OpenRouter's free tier.**  
> Based on Jonathan Stark's [Value Pricing Calculator](https://jonathanstark.com/vpc/).

---

## ✨ What is this?

A single-page React app that helps consultants, freelancers, and agencies **price projects based on perceived client value** — not hours, not effort, not cost-plus.

You get **three price tiers** calculated from one of two pricing curves:

| Curve | Mindset | Multipliers |
|---|---|---|
| **Might As Well** 🎯 | *"I want to land it really bad!"* — safer, easier to close | 10% · 15% · 17.5% |
| **Goldilocks** 🚀 | *"Meh, I don't really care"* — bolder, higher upside | 10% · 22% · 50% |

Choose manually, or **let AI do the heavy lifting** — describe your project and get a suggested perceived value + the optimal curve, all through OpenRouter's **free** model route.

---

## 🤖 The OpenRouter Free Magic

This is the heart of the project. The AI tab sends your sanitized project brief to OpenRouter's `openrouter/free` route — **completely free of charge**.

### How it works

1. You write a project brief (up to 5,000 characters)
2. Optionally add context: geographic zone, company revenue, people impacted, expected ROI, intangible benefits
3. The app builds a **structured prompt** with a locked system prompt based on value-based pricing principles
4. The request goes directly from your browser to `https://openrouter.ai/api/v1/chat/completions`
5. OpenRouter routes it to a **free provider model** — no API costs, no credits, no subscriptions
6. The AI returns a strict JSON response with:
   - `curveId` — suggested pricing curve (`might-as-well` or `goldilocks`)
   - `perceivedValue` — estimated value in the client's currency
   - `summary` — one-sentence rationale
   - `reasoning` — up to 5 bullet points explaining the logic
7. The app auto-fills the perceived value and selects the curve — you see the three price tiers instantly

### Why this matters

- **Zero AI cost** — OpenRouter's free route means you can iterate as much as you want
- **No backend needed** — the browser calls OpenRouter directly, so the app is a static site on Firebase Hosting
- **Privacy-first** — you acknowledge a warning before sending data, and no data is retained server-side
- **Geographic context** — the AI adapts its reasoning to regional business cultures (Italy, Europe, North America, APAC, etc.)

### Safety guardrails

- AI is **disabled entirely** when `VITE_OPENROUTER_API_KEY` is not set at build time
- Users must **acknowledge a warning** about data privacy before each AI request
- The prompt has a **hard cap** of 5,000 characters
- The AI response is **strictly validated** — malformed JSON, missing fields, or invalid curve IDs all produce a graceful error
- OpenRouter's free route may change providers; the app handles **parse failures gracefully**

---

## 🚀 Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up your OpenRouter API key
copy .env.example .env.local
# Then edit .env.local and paste your key: VITE_OPENROUTER_API_KEY=sk-or-v1-...

# 3. Start the dev server
npm run dev
```

Open **http://localhost:5173** — you're ready to price.

> 💡 **No key? No problem.** The app works fully in manual mode. The AI tab will show a friendly message that AI suggestions aren't available.

---

## 🧪 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server on `localhost:5173` |
| `npm run build` | Type-check (`tsc -b`) then build (`vite build`) |
| `npm run lint` | Run ESLint across the repo |
| `npm run preview` | Preview the production build locally |
| `npm run deploy` | Deploy hosting with Firebase CLI |

---

## ☁️ Deployment

### Firebase Hosting

```bash
firebase login
firebase use --add
npm run deploy -- --project your-project-id
```

### GitHub Actions (CI/CD)

The repo includes `.github/workflows/firebase-deploy.yml`. On every push to `main`:

1. `npm ci` (Node 24)
2. `npm run lint`
3. `npm run build`
4. Deploy to Firebase Hosting

**Required secrets:** `FIREBASE_PROJECT_ID`, `FIREBASE_TOKEN`  
**Optional secret:** `VITE_OPENROUTER_API_KEY` — without it, the AI tab stays disabled in production.

---

## 🏗️ Architecture

```
src/
├── App.tsx              # Shell with tabs (manual / AI), orchestrates all state
├── openrouter.ts        # OpenRouter client, prompt builder, JSON validation
├── pricing.ts           # Core domain: curves, parsing, currency, tier generation
├── main.tsx             # React entry point
├── components/
│   ├── ManualScenario   # Manual calculator workflow
│   ├── AiScenario       # AI workflow with warning + result display
│   ├── ValueFields      # Shared value/currency input
│   └── PriceResults     # Tiered price output cards
└── App.css              # Plain CSS (no Tailwind, no CSS modules)
```

### Key design decisions

- **React 19 + Vite 8 + TypeScript** — modern, fast, strict
- **Plain CSS** — zero runtime, zero build complexity
- **No backend** — the entire app is a static SPA; OpenRouter is called directly from the browser
- **`verbatimModuleSyntax`** — all type imports use `import type`
- **`erasableSyntaxOnly`** — no enums or namespaces
- **Multi-currency** — EUR, USD, GBP with locale-aware formatting
- **International number parsing** — handles both comma and dot decimal separators

---

## 🔐 Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_OPENROUTER_API_KEY` | No (AI disabled without it) | OpenRouter API key, embedded at build time |

Copy `.env.example` → `.env.local` to get started.

---

## 📚 Learn more

- [Jonathan Stark — Value Pricing Calculator](https://jonathanstark.com/vpc/)
- [Jonathan Stark — Pricing Curves explained](https://jonathanstark.com/pricing-curves)
- [OpenRouter — Free models](https://openrouter.ai/models?order=free)
- [OpenRouter API docs](https://openrouter.ai/docs/api-reference)

---

## 📄 License

MIT — use it, fork it, ship it.
