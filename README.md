# Value Pricing Calculator

This project prices a project with the **Campfire** or **Moonshot** curve and can optionally ask AI to suggest the best curve from a sanitized project brief.

The app now runs as:

- a static React/Vite frontend on **Firebase Hosting**
- a minimal **Firebase HTTPS Function** for the AI route

The shared OpenRouter key never lives in the browser.

## Local development

1. Install the web dependencies:

   ```bash
   npm install
   ```

2. Install the Firebase Function dependencies:

   ```bash
   npm --prefix functions install
   ```

3. Copy `.env.example` to `.secret.local` in the repository root and add your local OpenRouter key:

   ```bash
   copy .env.example .secret.local
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

This starts:

- the Firebase Functions emulator on the local demo project `demo-vpc`
- the Vite frontend on `http://localhost:5173`

The Vite dev server proxies `/api/analyze-curve` to the local Firebase Function.

## Firebase deployment

1. Log in with the Firebase CLI:

   ```bash
   firebase login
   ```

2. Choose the Firebase project, or pass it at deploy time:

   ```bash
   firebase use --add
   ```

3. Set the production secret in Firebase Secret Manager:

   ```bash
   firebase functions:secrets:set OPENROUTER_KEY --project your-project-id
   ```

4. Deploy Hosting + Functions:

   ```bash
   npm run deploy -- --project your-project-id
   ```

## Continuous deployment with GitHub Actions

The repository includes `.github/workflows/firebase-deploy.yml`.

Required repository secrets:

- `FIREBASE_PROJECT_ID`: the Firebase project ID to deploy to
- `FIREBASE_SERVICE_ACCOUNT`: a service account JSON with permissions to deploy Hosting and Cloud Functions

On every push to `main`, the workflow:

1. installs root and function dependencies
2. runs `npm run lint`
3. runs `npm run build`
4. deploys `hosting,functions` with the Firebase CLI

`OPENROUTER_KEY` stays in Firebase Secret Manager and is not stored in GitHub.

## Project structure

- `src/` - React frontend
- `functions/` - Firebase HTTPS Function for AI curve analysis
- `firebase.json` - Hosting + rewrite configuration
