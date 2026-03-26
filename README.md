# SBR Stats

Sim racing league results viewer. Python/FastAPI backend + React frontend + MariaDB.

## Quick start

```bash
cp .env.example .env
# Edit .env with your passwords

docker compose up -d --build

# First time: import the spreadsheet
docker compose exec api python scripts/import_xlsx.py
```

API docs: `http://localhost:8000/docs`
Frontend (dev): `http://localhost:5173`

---

## Backend (API)

**Requirements:** Python 3.12+, MariaDB running (or use Docker Compose).

```bash
pip install -r requirements.txt

# Set DB connection env vars (see .env.example), then:
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Environment variables:**

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | MariaDB host |
| `DB_PORT` | `3306` | MariaDB port |
| `DB_USER` | `sbr` | Database user |
| `DB_PASSWORD` | `sbr` | Database password |
| `DB_NAME` | `sbr` | Database name |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins |

---

## Database

MariaDB runs in a container. The schema and seed config are applied automatically on first boot.

```bash
# Start DB only
docker compose up db -d

# Import / re-import spreadsheet data (safe to run multiple times)
python scripts/import_xlsx.py

# Or inside the running api container
docker compose exec api python scripts/import_xlsx.py
```

### Updating the spreadsheet

Drop a new `sbr-stats.xlsx` in the project root and re-run the import script. Config data (aliases, points structures, drop round flags, class assignments) is never overwritten.

### Configuring aliases, points structures, drop rounds, multiclass

Edit `db/seed_config.sql` (run once on first DB boot) or apply SQL directly:

```sql
-- Alias: "ARI" → "Arib Hossain"
INSERT INTO canonical_players (display_name) VALUES ('Arib Hossain');
INSERT INTO driver_aliases (raw_name, player_id)
  SELECT 'ARI', id FROM canonical_players WHERE display_name = 'Arib Hossain';

-- Drop round for a season
UPDATE seasons SET has_drop_round = TRUE WHERE name = 'SeasonName';
```

Points structures (required for position-based seasons like S1–S6, WEC) and multiclass class assignments are documented with examples in `db/seed_config.sql`.

Drop round and multiclass flags can also be set before import via the `SEASON_FLAGS` dict in `scripts/import_xlsx.py`.

---

## Frontend

**Requirements:** Node 22+

```bash
cd web
npm install
npm run dev        # dev server → http://localhost:5173
npm run build      # production build → web/dist/
npx tsc -b         # type-check only
```

**Environment variables (`web/.env.local` for dev):**

```
VITE_API_URL=http://localhost:8000
```

---

## Deployment

### Backend (Docker Compose + nginx + Cloudflare tunnel)

```bash
docker compose up -d --build
docker compose exec api python scripts/import_xlsx.py
```

The `sbr-stats.xlsx` file is bind-mounted read-only from the project root — update it and re-run the import without rebuilding.

### Frontend (GitHub Pages)

1. Push to `main`.
2. Go to **Settings → Pages**, set source to the `gh-pages` branch.
3. Add in **Settings → Secrets and variables → Actions**:
   - Secret `VITE_API_URL` → your API's public HTTPS URL
   - Variable `VITE_BASE_PATH` → `/sbr-results/` for a project site, `/` for a user/org site
4. GitHub Actions builds and deploys automatically on every push.

---

## Project structure

```
sbr-results/
├── sbr-stats.xlsx          # Source data (gitignored — bind-mounted in prod)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── db/
│   ├── schema.sql          # DDL — runs once on first DB container boot
│   └── seed_config.sql     # Config data template (aliases, points, classes)
├── scripts/
│   └── import_xlsx.py      # Idempotent xlsx → MariaDB importer
├── api/
│   ├── main.py             # FastAPI app
│   ├── database.py         # SQLAlchemy async engine
│   ├── aliases.py          # Driver name alias resolution
│   ├── calc.py             # Championship standings + race winner logic
│   ├── models.py           # Pydantic response schemas
│   └── routes/
│       ├── stats.py        # GET /api/stats, /api/leaderboard
│       ├── drivers.py      # GET /api/drivers, /api/drivers/{name}
│       └── seasons.py      # GET /api/seasons, /api/seasons/{name}
└── web/
    └── src/
        ├── api/client.ts   # Typed API fetch wrappers
        ├── components/     # Nav, StatCard, Leaderboard, RaceResultsTable, etc.
        └── pages/          # Home, Seasons, SeasonDetail, Drivers, DriverDetail
```
