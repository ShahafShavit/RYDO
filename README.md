# RYDO

Monorepo for the RYDO cycling platform: a **Vite + React** client under [`client/`](client/) and a **.NET 9** API under [`server/`](server/). See [`client/README.md`](client/README.md) and [`server/README.md`](server/README.md) for architecture and run instructions.

## Run the full stack (Docker Compose + local client)

[`docker-compose.yml`](docker-compose.yml) at the repo root runs **SQL Server** and the **API** only. The React app is started separately with Node (there is no client container in Compose).

### 1. Backend: Docker Compose

From the repository root:

```bash
docker compose up --build
```

- **API:** [http://localhost:5000](http://localhost:5000) (maps container port 8080)
- **Health check:** `GET http://localhost:5000/health`
- **SQL Server:** host port **1433** (login `sa`, password `Your_password123` — defined in [`docker-compose.yml`](docker-compose.yml))

The API container may restart once while SQL Server finishes starting; that is expected. For a detached run, use `docker compose up --build -d`. To stop and remove containers, `docker compose down`; to wipe the database and re-seed on next start, `docker compose down -v`.

### 2. Frontend: Vite dev server

In a second terminal, with the API running:

```bash
cd client
npm install
npm run dev
```

Point the client at the Docker API by ensuring [`client/.env.local`](client/.env.local) contains:

```env
VITE_API_MODE=real
VITE_API_BASE_URL=http://localhost:5000
```

Then open the URL Vite prints (typically [http://localhost:5173](http://localhost:5173)).

More API-only detail (local `dotnet run`, CORS notes) is in [`server/README.md`](server/README.md).

## Hint: seeded admin and user logins (local API)

After the database is first created (e.g. Docker Compose with a fresh SQL volume), the API seeds two accounts you can use in the UI or against `POST /auth/login`:

| Email | Password | Role |
|--------|----------|------|
| `admin@rydo.test` | `Admin123!` | admin |
| `user@rydo.test` | `User123!` | user |

Additional **demo riders** (`rider003@rydo.test` … `rider036@rydo.test`, same password as `user@rydo.test`) are seeded so lists and metrics look populated—see [`server/Rydo.Api/Data/DbSeeder.cs`](server/Rydo.Api/Data/DbSeeder.cs). To re-seed, wipe the DB volume (e.g. `docker compose down -v`) and start again.

These are **development-only** credentials; change or remove them for any real deployment.
