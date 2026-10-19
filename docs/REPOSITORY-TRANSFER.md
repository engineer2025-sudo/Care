# Manual repository transfer

Manual checklist for copying the application source into a separate repository.

## Include

- Application source: `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, and Vite/Tailwind configuration.
- Native projects: `ios/` and `android/`.
- Shared translations, tests, automation, and build scripts: `localization/`, `test/`, `e2e/`, `e2e-offline/`, `scripts/`, and `.github/workflows/`.
- Product and build guidance: `README.md`, `DOWNLOAD.md`, `ROADMAP.md`, `docs/`, `ios/README.md`, and `android/README.md`.
- The release inventory in `docs/version-history.md`.

## Exclude

Do not copy `.git/`, `node_modules/`, `dist/`, `build/`, `.gradle/`, local signing keys, provisioning profiles, personal app data, or generated test artifacts. Keep private signing credentials out of the destination repository.

## Preserve version identity

| Target | Marketing version | Build |
|---|---:|---:|
| Web | 1.5.1 | — |
| iPhone | 3.8.0 | 17 |
| Android | 1.9.0 | 11 |

These are the versions in the public source release published 2026-10-18. This local source snapshot includes additional unreleased work dated 2026-10-19; it does not increment the published platform versions. Earlier public releases available to this checkout are listed in `docs/version-history.md`. The checkout does not contain verifiable version/release records from June 2026, so do not backdate or invent missing entries.

## Transfer steps

1. Create the destination repository and choose its license, visibility, and default branch.
2. Copy the included files while excluding the items above.
3. Review `README.md`, `DOWNLOAD.md`, workflow files, deployment links, package metadata, and any repository-specific URLs for the new destination.
4. Run `npm ci`, `npm test`, `npm run build`, and `python3 scripts/generate_localizations.py --check`.
5. Run the iOS and Android project checks in their supported toolchains before publishing a release.
6. Add the destination's remote only in your own Git setup, then create the initial commit and push there when ready.
