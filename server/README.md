# RYDO API (.NET 9)

School-project backend: ASP.NET Core Web API, EF Core, SQL Server, JWT auth. Schema is created with `Database.EnsureCreated()` (no migrations). Docker Compose runs **SQL Server** and the **API** together.

## Run with Docker (recommended)

From the repository root:

```bash
docker compose up --build
```

- API: `http://localhost:5000`
- Health: `GET http://localhost:5000/health`
- SQL Server is exposed on host port **1433** (sa / `Your_password123` — change in `docker-compose.yml` for anything beyond local class demos).

The API container may restart once while SQL Server finishes starting; `restart: on-failure` handles that.

### GPX timelapse (9:16 MP4)

Compose also builds **`timelapse-renderer`** (Playwright + Mapbox GL) and **`timelapse-encoder`** (ffmpeg). They share a volume with the API at `/data/timelapse/current` (overwrites each run).

The **`timelapse-renderer`** container needs a Mapbox token as **`MAPBOX_ACCESS_TOKEN`**. In Compose, if that is unset, **`VITE_MAPBOX_ACCESS_TOKEN`** from the repo root `.env` is used instead (same value you use for the map). After changing `.env`, recreate the renderer: `docker compose up -d --force-recreate timelapse-renderer`.

- UI: `http://localhost:5000/timelapse` (after the SPA is built into the image)
- API: `POST /api/timelapse/generate` (multipart `gpxFile`), `GET /api/timelapse/video`

### Seeded test users (after first successful start)

| Email | Password | Role |
|--------|----------|------|
| `admin@rydo.test` | `Admin123!` | admin |
| `user@rydo.test` | `User123!` | user |

The seeder also creates **34 community riders** (`rider003@rydo.test` … `rider036@rydo.test`, password `User123!`), plus many routes (from Groopy scrape assets), hazards, rides, history rows, demo friend requests / inbox items, and preferences so admin and dashboards reflect a busy platform.

Source: [`Rydo.Api/Data/DbSeeder.cs`](Rydo.Api/Data/DbSeeder.cs). Seeding runs only when the database has **no roles** yet (first boot with an empty volume). After **EF model or seed changes** (new tables, columns, or seeder updates), recreate the SQL volume so `EnsureCreated` and the seeder run on a clean schema: e.g. `docker compose down -v` then `docker compose up -d`.

## Run locally (without Docker)

1. Install [.NET 9 SDK](https://dotnet.microsoft.com/download).
2. Start SQL Server (e.g. LocalDB or a container on `localhost:1433`).
3. Adjust `ConnectionStrings:DefaultConnection` in [`Rydo.Api/appsettings.json`](Rydo.Api/appsettings.json) if needed (default matches the Docker SA password for convenience).
4. Run:

```bash
cd server/Rydo.Api
dotnet run
```

## Frontend (Vite) pointing at this API

With the API on **`http://localhost:5000`** (Docker), use the Vite dev **proxy** so the browser only talks to port 5173 (works from a phone on the LAN). In `client/.env.local`:

```env
VITE_API_MODE=real
VITE_API_BASE_URL=
```

(Optional: `VITE_DEV_PROXY_TARGET=http://127.0.0.1:5032` if you run **`dotnet run`** instead of Docker; the default proxy target is **5000**.)

If you are not using the proxy, you can set `VITE_API_BASE_URL=http://localhost:5000` instead (desktop-only; see `client/docs/lan-https-phone.md`).

**Club group chat** is implemented: REST under `/api/clubs/{clubId}/chat/*`, summary at `/api/users/me/club-chat/summary`, and SignalR at `/hubs/club-chat` (JWT). After pulling schema changes that add chat tables, recreate the Docker SQL volume (`docker compose down -v`) so `EnsureCreated` and `DbSeeder` run on a clean database.

## Project layout

- [`Rydo.Api/Program.cs`](Rydo.Api/Program.cs) — DI, JWT, CORS, `EnsureCreated`, seed
- [`Rydo.Api/Controllers/`](Rydo.Api/Controllers/) — HTTP API
- [`Rydo.Api/Data/`](Rydo.Api/Data/) — EF entities and `RydoDbContext`
- [`docker-compose.yml`](../docker-compose.yml) — root Compose file
