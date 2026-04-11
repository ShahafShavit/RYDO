# RYDO

Monorepo for the RYDO cycling platform: a **Vite + React** client under [`client/`](client/) and a **.NET 9** API under [`server/`](server/). See [`client/README.md`](client/README.md) and [`server/README.md`](server/README.md) for architecture and run instructions.

## Hint: seeded admin and user logins (local API)

After the database is first created (e.g. Docker Compose with a fresh SQL volume), the API seeds two accounts you can use in the UI or against `POST /auth/login`:

| Email | Password | Role |
|--------|----------|------|
| `admin@rydo.test` | `Admin123!` | admin |
| `user@rydo.test` | `User123!` | user |

Additional **demo riders** (`rider003@rydo.test` … `rider036@rydo.test`, same password as `user@rydo.test`) are seeded so lists and metrics look populated—see [`server/Rydo.Api/Data/DbSeeder.cs`](server/Rydo.Api/Data/DbSeeder.cs). To re-seed, wipe the DB volume (e.g. `docker compose down -v`) and start again.

These are **development-only** credentials; change or remove them for any real deployment.
