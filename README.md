# Value Pricing Calculator

This project prices a project with the **Campfire** or **Moonshot** curve and can optionally ask AI to suggest the best curve from a sanitized project brief.

The app now runs as:

- a static React/Vite frontend on **Firebase Hosting**
- a direct browser call to OpenRouter using a **Vite build-time env variable**

In this simplified setup, the user never types the key into the UI, but the key is still embedded in the client bundle at build time.

## Local development

1. Install the web dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` in the repository root and add your OpenRouter key:

   ```bash
   copy .env.example .env.local
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

The Vite frontend runs on `http://localhost:5173`.

## Firebase deployment

1. Log in with the Firebase CLI:

   ```bash
   firebase login
   ```

2. Choose the Firebase project, or pass it at deploy time:

   ```bash
   firebase use --add
   ```

3. Deploy Hosting:

   ```bash
   npm run deploy -- --project your-project-id
   ```

## Continuous deployment with GitHub Actions

The repository includes `.github/workflows/firebase-deploy.yml`.

Required repository secrets:

- `FIREBASE_PROJECT_ID`: the Firebase project ID to deploy to
- `FIREBASE_TOKEN`: a Firebase CLI token or refresh token usable by `firebase-tools`
- `VITE_OPENROUTER_API_KEY`: optional, but required if you want AI suggestions in the deployed build

On every push to `main`, the workflow:

1. installs root dependencies
2. runs `npm run lint`
3. runs `npm run build`
4. deploys **Hosting** with the Firebase CLI

If `VITE_OPENROUTER_API_KEY` is missing, the deployed UI stays live but the AI button remains disabled.

## Project structure

- `src/` - React frontend
- `firebase.json` - Hosting + rewrite configuration
