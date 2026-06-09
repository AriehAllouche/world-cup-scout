# FIWC 2026 — Scraper Backend

Petit backend Flask qui scrape Transfermarkt et expose `POST /api/scrape`.

## Install & run

```bash
cd scraper
python -m venv .venv && source .venv/bin/activate
pip install flask flask-cors requests beautifulsoup4 lxml
python app.py
```

Le serveur tourne sur `http://localhost:5000`. Le bouton **"Lancer le Scraping"** du dashboard l'appelle automatiquement ; si offline, il bascule en mode simulation avec le dataset embarqué (`src/data/fixtures.json`).

## Endpoints

- `POST /api/scrape` — body `{ "url": "..." }` (défaut : page FIWC). Renvoie le compte d'équipes/joueurs scrapés.
- `GET /api/health` — ping.

## Notes

- Respecte Transfermarkt (delay 1s entre pages, User-Agent identifié).
- Sortie : `scraper/output/fiwc2026.json`. Tu peux remplacer `src/data/fixtures.json` avec ce fichier pour brancher les vraies données dans le dashboard.
