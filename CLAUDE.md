# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (run from project root)
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Import spreadsheet data
```bash
python scripts/import_xlsx.py        # local (needs DB running)
docker compose exec api python scripts/import_xlsx.py  # inside container
```

### Frontend (run from `web/`)
```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → web/dist/
npx tsc -b        # type-check only
```

### Docker
```bash
docker compose up -d --build          # build and start all services
docker compose up db -d               # start DB only
docker compose logs -f api
```

## Architecture

### Data flow
`sbr-stats.xlsx` is the source of truth for race results. The import script (`scripts/import_xlsx.py`) loads it into MariaDB. The API reads from the DB on every request — there is no in-memory cache.

```
sbr-stats.xlsx
    ↓
scripts/import_xlsx.py  (run manually after each spreadsheet update)
    ↓
MariaDB (running in Docker)
    ↓
API routes → calc.py + aliases.py → JSON response
    ↓
Frontend (React)
```

### Database (`db/`)
- **`schema.sql`** — full DDL, applied once on first DB container boot via `docker-entrypoint-initdb.d/`. Contains two table groups:
  - **Config tables** (never overwritten by import): `canonical_players`, `driver_aliases`, `classes`, `points_structures`, `points_structure_entries`, `season_points_structure`
  - **Data tables** (truncated on every import): `drivers`, `seasons`, `rounds`, `race_results`, `driver_season_class`
- **`seed_config.sql`** — template for aliases, points structures, and class assignments. Also applied once on first boot. Edit before first `docker compose up db`.

### Import script (`scripts/import_xlsx.py`)
- Idempotent — safe to run multiple times. Truncates data tables, upserts drivers (stable IDs preserve alias FKs), re-inserts all season/round/result data.
- `SEASON_FLAGS` dict controls `has_drop_round` and `is_multiclass` per season sheet name.
- `POSITION_SEASONS` and `NON_SEASON_SHEETS` sets mirror the old `parser.py` constants.
- Cell values are decomposed into `(value_numeric, value_flag, is_asterisked)` — no string parsing in the API.

### Backend (`api/`)
- **`database.py`** — async SQLAlchemy engine (`mysql+aiomysql`). `get_db()` is a FastAPI dependency yielding an `AsyncSession` per request.
- **`aliases.py`** — `load_alias_map(db)` fetches `{raw_name: display_name}` from `driver_aliases JOIN canonical_players`. `resolve_name()` falls back to the raw name if no alias exists. Multiple raw names can map to one canonical player (same person, different spellings across seasons).
- **`calc.py`** — pure Python championship logic, no DB access:
  - `compute_season_data()` — standings + race winners. Handles drop rounds (`has_drop_round`), position→points conversion via `points_map`, and double-format seasons.
  - `compute_race_winners()` — per-round winner detection. Position seasons: lowest value wins. Points seasons: highest value wins.
  - `compute_driver_season_stats()` — per-driver stats for a single season (used by drivers route).
- **`routes/stats.py`** — `/api/stats` and `/api/leaderboard`. Both re-derive wins/podiums/championships from `race_results` via `calc.py`. **Note:** these endpoints load all seasons and compute standings — acceptable for current data size but worth caching if the dataset grows.
- **`routes/seasons.py`** — `/api/seasons` and `/api/seasons/{name}`. Season name lookup is case-insensitive.
- **`routes/drivers.py`** — `/api/drivers` and `/api/drivers/{name}`. Driver lookup is case-insensitive and resolves aliases. A driver identified by their display name may have multiple raw names across seasons — all are merged.

### Key behaviours
- **Drop rounds**: `seasons.has_drop_round = TRUE` → `calc.py` removes the worst-scoring round before summing totals. Set via `SEASON_FLAGS` in import script or `UPDATE seasons SET has_drop_round = TRUE WHERE name = '...'`.
- **Multiclass**: `seasons.is_multiclass = TRUE` + entries in `driver_season_class` + `classes`. Per-class standings not yet exposed in the API (future work).
- **Points structures**: Required for `score_type = 'position'` seasons (S1–S6, WEC) to compute championship totals. Without one, totals show as `null` and drivers are ranked by raw position sum (ascending). Seed via `db/seed_config.sql`.
- **Asterisked values** (e.g. `48*`): stored with `is_asterisked = TRUE`, numeric value used as normal for scoring. Display layer can use this flag to render the asterisk.

### Frontend (`web/src/`)
- **`api/client.ts`** — all API types and fetch wrappers. `VITE_API_URL` env var sets the base URL (default: `http://localhost:8000`).
- **`RoundResult`** union type — `{ result }` for single-format seasons, `{ feature, reverse }` for double-format. Components use `'feature' in r` to distinguish.
- **`RaceResultsTable`** — handles both formats in one table. Double-format renders two sub-columns per round with a "Feat / Rev" sub-header row.
- **`DriverDetail`** — result strip renders abbreviated `DNS→D`, `DNF→F` in 24×24 colored cells.

### Deployment
- **Frontend**: GitHub Actions (`.github/workflows/deploy.yml`) builds on push to `main` and deploys `web/dist/` to the `gh-pages` branch. Set repo secret `VITE_API_URL` and repo variable `VITE_BASE_PATH` (`/repo-name/` for project pages, `/` for user/org pages).
- **Backend**: Docker Compose exposes port 8000. `sbr-stats.xlsx` is bind-mounted as read-only. Sits behind existing nginx + Cloudflare tunnel for HTTPS.

### Updating the spreadsheet
Drop a new `sbr-stats.xlsx` in the project root, then run `python scripts/import_xlsx.py` (or `docker compose exec api python scripts/import_xlsx.py`). No container restart needed.
