# RYDO Mobile (Capacitor)

Native Android and iOS shells around the same React app as [`../client/`](../client/).

| Document | Purpose |
|----------|---------|
| [**BUILD_PLAN.md**](./BUILD_PLAN.md) | Full migration plan and feature parity |

---

## Run on Android emulator (Windows / macOS / Linux)

This **builds the app, syncs it into an Android project, and launches it** on an emulator or connected device.

### 1. One-time setup

1. **API** (from repo root): `docker compose up` → `http://localhost:5000`
2. **Android Studio** — install [Android Studio](https://developer.android.com/studio), SDK, and create a **Virtual Device** (Device Manager → Create device).
3. **Environment variables** (Windows)

   **Automatic (recommended)** — from PowerShell:

   ```powershell
   cd mobile
   .\scripts\setup-windows-env.ps1
   ```

   Then **close and reopen** your terminal / Cursor.

   **Git Bash still shows `java.exe`?** The IDE terminal may have cached the old value. Either restart Cursor, or for the **current session only**:

   ```bash
   source scripts/android-env.sh
   npm run check:android
   ```

   (`npm run check:android` and `npm run run:android` also auto-read the correct Windows User `JAVA_HOME` when possible.)

   **Manual** — User environment variables:

   | Variable | Value |
   |----------|--------|
   | `JAVA_HOME` | **JDK 21+** folder (Capacitor 7), e.g. `C:\Program Files\Java\jdk-23` — **not** `...\bin\java.exe` |
   | `ANDROID_HOME` | SDK path, e.g. `C:\Users\<you>\AppData\Local\Android\Sdk` |

   Add `%JAVA_HOME%\bin` and `%ANDROID_HOME%\platform-tools` to `PATH` if needed.

4. **Mapbox** — token in [`../client/.env.local`](../client/.env.local) (copied automatically by `env:android`).

### 2. Start an emulator

Open **Android Studio → Device Manager** → start an AVD (▶).  
Or from a terminal: `adb devices` should list `emulator-5554   device`.

### 3. Build and launch the app

```bash
cd mobile
npm install          # first time only
npm run check:android   # optional: verify JAVA_HOME / ANDROID_HOME
npm run run:android     # env + build + cap sync + cap run
```

**What you should see:** Gradle build, then the **RYDO** app (login screen with purple/dark RYDO styling) — not a generic “Hello World” sample.

1. On the emulator home screen, open the app drawer (swipe up / grid icon).
2. Tap the app named **RYDO** (not “Phone”, “Settings”, or an Android Studio demo).
3. If you still see a blank or wrong screen, rebuild and reinstall:

   ```bash
   npm run build:android
   npm run run:android
   ```

The app talks to the API at **`http://10.0.2.2:5000`** (Docker on your PC). Log in with `user@rydo.test` / `User123!`.

**API via `dotnet run` (port 5032):**

```bash
npm run run:android:dotnet
```

### 4. After code changes

```bash
npm run build
npx cap sync android
npx cap run android
```

Or repeat `npm run run:android`.

### Troubleshooting Android

| Problem | Fix |
|---------|-----|
| `error: invalid source release: 21` | **JDK 21+ required** (Capacitor 7). Run `.\scripts\setup-windows-env.ps1` — uses `C:\Program Files\Java\jdk-23` if installed. |
| `JAVA_HOME is set to an invalid directory` … `java.exe` | Set `JAVA_HOME` to the **JDK root**, not `bin\java.exe`. Restart the terminal. |
| `ANDROID_HOME` not set | Set it to your Android SDK path (see Android Studio SDK settings). |
| No devices / emulator | Start an AVD in Device Manager before `npm run run:android`. |
| App opens but login fails | `docker compose up` running? On emulator use `npm run env:android` (not `env:ios`). Test host: `curl http://localhost:5000/health` |
| Gradle / build slow first time | Normal; downloads dependencies once. |

```bash
npm run check:android
npm run env:show
```

---

## Run on iOS Simulator (macOS only)

Requires **Xcode** on a Mac. Not available on Windows.

```bash
cd mobile
npm install
npm run env:ios
npm run build
npx cap add ios          # first time only
npx cap sync ios
npx cap open ios         # Run from Xcode (▶ on a Simulator)
```

Or add a `run:ios` script later; opening Xcode is the usual flow.

---

## What each command does

| Command | What happens |
|---------|----------------|
| `npm run env:android` | Writes `mobile/.env.local` (`http://10.0.2.2:5000`) |
| `npm run build` | Vite bundles `client/src` → `mobile/dist/` |
| `npx cap sync android` | Copies `dist/` into the native Android project |
| `npm run run:android` | All of the above + Gradle + installs/launches on emulator |
| `npm run check:android` | Checks `JAVA_HOME`, `ANDROID_HOME`, `adb devices` |

`npm run env:android` **alone** does not open anything — use **`npm run run:android`** to run the app.

---

## Emulator API URLs

| Target | `VITE_API_BASE_URL` (Docker) |
|--------|-------------------------------|
| Android Emulator | `http://10.0.2.2:5000` |
| iOS Simulator | `http://127.0.0.1:5000` |

Templates: `.env.android-emulator`, `.env.ios-emulator` — applied via `npm run env:*`.

---

## Physical phone (not emulator)

Use your PC’s LAN IP in `.env.local`, e.g. `http://192.168.1.10:5000`, rebuild, and `cap run` with USB debugging.  
Or use the **web client** on the phone: [`client/docs/lan-https-phone.md`](../client/docs/lan-https-phone.md).

---

## Project layout

```
mobile/
├── android/           # Native project (after cap add android)
├── src/main.jsx       # Entry — loads ../client/src via @ alias
├── dist/              # Vite build output (Capacitor webDir)
├── capacitor.config.ts
└── vite.config.js     # @ → ../client/src
```

---

## Related docs

- [BUILD_PLAN.md](./BUILD_PLAN.md) — phases and platform adapters  
- [../README.md](../README.md) — Docker stack and seeded logins (`user@rydo.test` / `User123!`)  
- [../client/README.md](../client/README.md) — web client  
