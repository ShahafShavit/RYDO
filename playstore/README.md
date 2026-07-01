# Google Play — release build (Step 3)

Everything needed to produce a **signed Android App Bundle (`.aab`)** for [Google Play Console](https://play.google.com/console).

| Item | Value |
|------|--------|
| App name | RYDO |
| Package name | `dev.rydo.app` |
| Production API | `https://rydo.bike` |
| Binary for Play | `.aab` (not the debug APK from `rydo.bike/app`) |

Store listing, data safety, and Console upload are **Phase 4** — see [../docs/deploy-and-publish.md](../docs/deploy-and-publish.md).

### Legal pages (privacy policy URL for Play Console)

| Page | URL |
|------|-----|
| Privacy policy | `https://rydo.bike/privacy` |
| Terms of service | `https://rydo.bike/terms` |
| Delete account | `https://rydo.bike/delete-account` |

Deploy the web app to production before submitting to Play Console so these URLs resolve. Update entity placeholders in [`client/src/shared/content/legal/legal-meta.js`](../client/src/shared/content/legal/legal-meta.js) before going live.

**Play Console → App content → Account deletion:** enter `https://rydo.bike/delete-account`.

**Play Console → Data safety → Data deletion:** use the same delete-account URL; answers must match the page (email request to `privacy@rydo.bike`, 30-day processing).

---

## One-time setup

### 1. Prerequisites

Same as local Android dev ([../mobile/README.md](../mobile/README.md)):

- Android Studio + SDK (API 35)
- **JDK 21+** — `JAVA_HOME` set
- **`ANDROID_HOME`** (or `ANDROID_SDK_ROOT`)
- On Windows: `powershell -File mobile/scripts/setup-windows-env.ps1` then restart the terminal

Verify:

```bash
cd mobile && npm run check:android
```

Mapbox token in `client/.env.local` (used when building maps into the bundle):

```env
VITE_MAPBOX_ACCESS_TOKEN=pk.…
```

### 2. Create upload keystore

Run **once**. Back up the keystore and passwords — losing them means you cannot ship updates for this Play listing.

**Git Bash / macOS / Linux:**

```bash
cd playstore
bash create-keystore.sh
```

**PowerShell:**

```powershell
cd playstore
.\create-keystore.ps1
```

**Manual (correct `keytool` syntax — not `-genkey -pair`):**

```bash
cd playstore
keytool -genkeypair -alias rydo-upload -keyalg RSA -keysize 2048 -validity 10000 -keystore rydo-upload.keystore
```

Use the same password for keystore and key if you prefer (Gradle needs both in `keystore.properties`).

### 3. Configure signing

```bash
cd playstore
cp keystore.properties.example keystore.properties
```

Edit `keystore.properties` with your real passwords. The keystore file path defaults to `rydo-upload.keystore` in this folder.

Gradle reads this automatically via [../mobile/android/app/build.gradle](../mobile/android/app/build.gradle).

**Never commit** `keystore.properties` or `*.keystore` (already in [`.gitignore`](./.gitignore)).

---

## Build the release AAB

From **repository root**:

```bash
node playstore/build-release-aab.mjs
```

Optional: copy a versioned artifact into `playstore/output/`:

```bash
node playstore/build-release-aab.mjs --copy-output
```

The script:

1. Writes `mobile/.env.local` for production (`npm run env:prod` → `https://rydo.bike`)
2. `npm run build` + `npx cap sync android`
3. `gradlew bundleRelease` with your upload keystore

**Output (default):**

```
mobile/android/app/build/outputs/bundle/release/app-release.aab
```

Upload that file in Play Console → **Release** → **Internal testing** (recommended first) or **Production**.

---

## Each new Play upload

Bump version in [../mobile/android/app/build.gradle](../mobile/android/app/build.gradle):

```gradle
versionCode 2        // integer — must increase every upload
versionName "1.0.1"  // user-visible string
```

Then rebuild:

```bash
node playstore/build-release-aab.mjs --copy-output
```

---

## Play App Signing

On **first** `.aab` upload, Google asks about Play App Signing. Choose **Let Google manage and protect your app signing key** (recommended). You keep the **upload key** (`rydo-upload.keystore`); Google holds the app signing key used for installs.

---

## Smoke-test before upload

Install a release build on a device (optional sanity check):

```bash
cd mobile/android
./gradlew installRelease   # or gradlew.bat on Windows
```

Or use **Internal testing** in Play Console and install from the opt-in link.

Confirm: login, map loads, short live-ride session against `https://rydo.bike`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Illegal option: -pair` | Use `-genkeypair` (one word), not `-genkey -pair` |
| `keystore.properties` missing | Copy from `keystore.properties.example` |
| `bundleRelease` unsigned | Ensure `keystore.properties` exists and paths are correct |
| Maps blank in release build | Set `VITE_MAPBOX_ACCESS_TOKEN` in `client/.env.local`, rebuild |
| `JAVA_HOME` / SDK errors | Run `mobile/scripts/setup-windows-env.ps1`, restart terminal, `npm run check:android` |
| `cannot access the file because it is being used by another process` | Close Android Studio, stop emulators, then `cd mobile/android && gradlew.bat --stop && gradlew.bat clean bundleRelease`. The build script runs `--stop` + `clean` automatically. |

---

## Files in this directory

| File | Purpose |
|------|---------|
| `create-keystore.sh` / `.ps1` | One-time upload keystore |
| `keystore.properties.example` | Template for Gradle signing |
| `build-release-aab.mjs` | Full prod build + signed AAB |
| `output/` | Optional copied `.aab` artifacts (gitignored) |

---

## Related docs

- [../docs/deploy-and-publish.md](../docs/deploy-and-publish.md) — full AWS → Play checklist
- [../mobile/README.md](../mobile/README.md) — emulator / debug builds
