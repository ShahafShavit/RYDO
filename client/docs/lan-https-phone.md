# HTTPS on your LAN (real phone testing)

Mobile browsers usually require a **secure context** (`https://` or `http://localhost`) for APIs such as **Geolocation**. Opening the Vite dev server as `http://192.168.x.x:5173` often blocks those APIs. This flow uses **[mkcert](https://github.com/FiloSottile/mkcert)** so your PC acts as a local CA and the dev server serves **HTTPS** on your LAN.

## One-time: install mkcert on the dev machine (the “server”)

1. Install **mkcert** and follow upstream instructions:  
   https://github.com/FiloSottile/mkcert#installation  
   On Windows, **Chocolatey** (`choco install mkcert`) or **Scoop** (`scoop install mkcert`) are typical; on macOS **Homebrew** works.

2. Install the local CA into your OS trust store (may need **Administrator** / **sudo**):

   ```bash
   mkcert -install
   ```

3. From the **`client/`** directory, generate certificates for `localhost`, loopback, and your current LAN IPv4 addresses:

   ```bash
   npm run setup:dev-https
   ```

   This creates `client/.certs/dev.pem` and `client/.certs/dev-key.pem` (gitignored).  
   The script prints the path to mkcert’s **root CA** folder (`mkcert -CAROOT`). You need **`rootCA.pem`** from that folder on the phone (next section).

4. Start the dev server bound to the LAN with HTTPS:

   ```bash
   npm run dev:lan
   ```

   The script prints a **`https://<your-lan-ip>:5173`** URL. Ensure the phone is on the **same Wi‑Fi** as the PC. If Windows Firewall prompts, allow **Node** / **private networks** for that port.

---

## One-time per phone: trust the mkcert root CA

Without this step, the phone will warn about an untrusted certificate or block the site.

### Android

1. Copy **`rootCA.pem`** from the mkcert CA folder (shown by `npm run setup:dev-https` or `mkcert -CAROOT`) to the phone (USB, cloud, email).
2. Open **Settings → Security → Encryption & credentials** (wording varies by OEM).
3. **Install a certificate → CA certificate** (or “Install from storage”).
4. Select **`rootCA.pem`** and complete the install.

### iOS

1. AirDrop or email **`rootCA.pem`** to the iPhone, then open it and install the **profile** (**Settings** will show a “Profile Downloaded” flow).
2. Open **Settings → General → VPN & Device Management** (or **Profiles & Device Management**) and finish installing the profile if needed.
3. Open **Settings → General → About → Certificate Trust Settings** and enable **full trust** for the mkcert root.

Apple’s UI labels change slightly between iOS versions; if something fails, search for “install custom CA certificate iOS” for your version.

---

## Point the app at your API (recommended: Vite dev proxy)

The dev server proxies backend routes to your local API so the **browser only talks to port 5173** — no per-network LAN IP in env, and no mixed-content issues when the SPA is `https://` on the phone.

1. Run the **.NET API** on the same machine as Vite. **`docker compose`** from the repo root exposes **`http://127.0.0.1:5000`**. If you use **`dotnet run`** instead, the HTTP URL is usually **`http://127.0.0.1:5032`** (see `server/Rydo.Api/Properties/launchSettings.json`).
2. In **`client/.env.local`**, use **real** API mode and **leave the base URL empty** so requests go to `/api/...` on the Vite origin:

```env
VITE_API_MODE=real
VITE_API_BASE_URL=
```

3. If the API listens on another origin, set the proxy target (defaults match **Docker :5000**):

```env
# Only if not using the default (5000). Example: dotnet run on 5032
VITE_DEV_PROXY_TARGET=http://127.0.0.1:5032
```

[`vite.config.js`](../vite.config.js) forwards `/api`, `/hubs` (including **WebSockets** for SignalR), and `/health` to `VITE_DEV_PROXY_TARGET` (default **`http://127.0.0.1:5000`**).

**Alternative:** you can still set `VITE_API_BASE_URL=https://<lan-ip>:<port>` and skip the proxy, but you must fix the IP whenever the network changes and handle HTTPS/mixed-content yourself.

---

## Disable HTTPS for normal desktop dev

Use the usual command; it does not read `.certs`:

```bash
npm run dev
```

To turn off the kinematic gate on the live map (unrelated, but useful when debugging):

- Append `?liveRideNoGate=1` to the URL (see `rideLiveLog.js`).

---

## Troubleshooting

| Issue | What to try |
|--------|-------------|
| `mkcert` not found | Add mkcert to PATH or reinstall from the official releases. |
| Phone still warns on HTTPS | Confirm **root CA** is installed *and* trusted (especially iOS “Certificate Trust Settings”). |
| Connection refused | Same Wi‑Fi, firewall allows Node, correct IP/port, `npm run dev:lan` is running. |
| Regenerated certs after Wi‑Fi IP changed | Run `npm run setup:dev-https` again so the cert includes the new LAN IP (or add hostnames manually with mkcert). |
| **Login works on PC but "Failed to fetch" on phone** | **`VITE_API_BASE_URL` must be empty** for LAN testing so `/api` goes through Vite on port 5173. Values like `http://localhost:5032` resolve to the **phone** on mobile, not your PC. Restart Vite after changing `.env.local`. In dev, the app warns in the console if it detects this. |
| **Vite: `http proxy error` / `ECONNREFUSED 127.0.0.1:5000` (or :5032)** | The API is not reachable at the proxy target. Start **`docker compose`** (port **5000** on the host) or **`dotnet run`** and set `VITE_DEV_PROXY_TARGET=http://127.0.0.1:5032` if you use the default launch profile. |
