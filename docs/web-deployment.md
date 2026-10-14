# Web 1.2 — run, host and verify

## Local development

Use Node.js 20.19+ or 22.12+:

```sh
npm ci
npm test
npm run dev
```

The development server binds all interfaces on port 3000. Its permissive host setting supports sandbox previews; it is not a production server. Do not put private files in `public/`.

## Production

`npm run build` creates `dist/`. The downloadable web ZIP includes the equivalent prepared files as `production/`. Upload that directory's **contents** to the root of a static HTTPS site. No server-side application or secret keys are required. Do not open the files using `file://`, deploy under a subdirectory without adjusting Vite/service-worker paths, or use a development server as a public production service.

Recommended host headers:

- `/`, `/index.html`, `/sw.js`, `/manifest.webmanifest`: `Cache-Control: no-cache`.
- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable` (filenames are hashed).
- JavaScript, CSS and the manifest must have correct MIME types. Do not rewrite missing asset requests to HTML.
- Deploy the HTML and matching assets atomically; keep the previous hashed assets available during rollout.

Keep a stable HTTPS origin if people need their existing local data. A different hostname/port is a different browser store. Browser profiles, private browsing, storage clearing or OS eviction may remove local data and encryption keys. Export what you choose to keep; exported files are not encrypted by CareSphere.

## Checks

```sh
npx playwright install chromium
npm run test:ui       # 23 interaction/responsive tests against development server
npm run build
npm run test:offline  # first-install + encrypted note reopening in production preview
npm audit --audit-level=moderate
```

The offline test verifies the actual built app, not only a service-worker file. The worker precaches the application entry points and icons on first installation. It stores only the public application shell/assets, not exports, sensor packets, video or user care records. User records use encrypted browser storage separately.

After deploying, visit online until installation finishes, close/reopen offline and check your own routine or note and an activity. Video, external sources and downloads need connectivity. Initial registration can be blocked by browser policy/storage restrictions; don't promise offline support before checking that target browser.

Chrome/Edge support varies by OS. Web Bluetooth requires a compatible browser and physical standard Heart Rate monitor. Safari on iPhone does not offer the Web Bluetooth integration: use native iOS instead. PWA installation availability is browser-dependent. No hosted URL, clinical certification or app-store approval is provided by this source package.

## No application backend

Device sharing uses encrypted files and the operating system's share sheet or a download. There is no `/api/shares`, database, invite relay or account service to deploy. The receiving browser can unlock, preview and import while offline after the app is loaded. Backups and transfers are separate formats; see `device-sharing.md`.
