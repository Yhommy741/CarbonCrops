# CarbonCrops web app

React 19 + Vite + Tailwind CSS 4, installable as a PWA. Farmers and the verifier use it in the browser on a phone or PC.

Setup, the backend and deployment are in the [main README](../../README.md). This file covers working on the web app itself.

## Run

The app needs the backend (API on `localhost:8000`). Easiest is `npm run dev` from the **project root**, which starts both. To run only the web app:

```bash
cd apps/web
npm install        # first time, or after package.json changes
npm run dev        # http://localhost:5173
```

During development Vite forwards `/api` and `/uploads` to `http://localhost:8000` (`vite.config.js`).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build into `dist/` (served by Caddy on a VPS) |
| `npm run preview` | Serve `dist/` locally to test the production build |
| `npm run lint` | Lint with oxlint |

## Code layout

```
src/
├── main.jsx            Entry: ErrorBoundary → preferences → router → auth → App; registers the service worker (production only)
├── App.jsx             Routes; farmers and verifiers get different screens
├── api.js              api() fetch helper (adds the login token) and useApi() hook
├── auth.jsx            Current user, development login, logout
├── preferences.jsx     Language (TH/EN), theme (light/dark), t() and fmt helpers
├── format.js           Shared formatting helpers
├── locales/            en.js, th.js: every text shown to users
├── components/         Layout, ErrorBoundary, shared UI (Card, Button, Badge, ...)
└── pages/              One file per screen
public/
├── sw.js               Service worker: offline read-only cache of the shell, API responses and photos
├── manifest.webmanifest
└── mock/               Placeholder images for sample data
```

## Conventions

- **Text:** never hard-code user-facing text. Add a key to both `locales/en.js` and `locales/th.js` and use `t('section.key')` from `usePreferences()`.
- **Dates and numbers:** use `fmt.date`, `fmt.num`, `fmt.baht`, `fmt.season` from `usePreferences()`. Thai shows Buddhist-era years.
- **Colors:** use the stone/green/amber/sky/red/violet Tailwind colors; dark mode is handled in `src/index.css`, so no `dark:` classes are needed.
- **API errors:** throw/display them with `<ErrorBox error={...} />`; it translates `errors.<code>` from the locale files.

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page, or an error screen right after sign-in | The backend is probably older than the web app. From the project root run `npm run dev:build` (or `docker compose up -d --build`) and reload |
| `Something went wrong (HTTP 502)` on the sign-in page | The API isn't running: start Docker / `docker compose up -d` |
| Old version still showing after `npm run preview` | The service worker cached it. DevTools → Application → Service Workers → Unregister, then hard-reload (`Ctrl + Shift + R`). The service worker is not registered by `npm run dev` |
