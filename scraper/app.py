"""
FIWC 2026 — Transfermarkt scraper backend
Run: pip install flask flask-cors requests beautifulsoup4 lxml
     python scraper/app.py
Then click "Lancer le Scraping" in the dashboard.
"""
import json
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    )
}
BASE = "https://www.transfermarkt.com"
DEFAULT_URL = f"{BASE}/weltmeisterschaft/startseite/pokalwettbewerb/FIWC"
OUT = Path(__file__).parent / "output" / "fiwc2026.json"
OUT.parent.mkdir(parents=True, exist_ok=True)


def parse_value(text: str) -> float:
    """'€1.20bn' -> 1200, '€450.00m' -> 450, '€800k' -> 0.8 (in millions)."""
    if not text:
        return 0.0
    t = text.replace("€", "").replace(",", "").strip().lower()
    try:
        if t.endswith("bn"):
            return float(t[:-2]) * 1000
        if t.endswith("m"):
            return float(t[:-1])
        if t.endswith("k"):
            return float(t[:-1]) / 1000
        return float(t)
    except ValueError:
        return 0.0


def get_soup(url: str) -> BeautifulSoup:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    return BeautifulSoup(r.text, "lxml")


def scrape_competition(url: str = DEFAULT_URL) -> dict:
    """Scrape the FIWC competition page → list of national team links → squads."""
    soup = get_soup(url)
    teams, players = [], []

    # Each group block on the competition page lists national teams.
    team_links = []
    for a in soup.select("a[href*='/startseite/verein/']"):
        href = a.get("href", "")
        name = a.get_text(strip=True)
        if name and href and href not in [t[1] for t in team_links]:
            team_links.append((name, href))

    print(f"Found {len(team_links)} national team links")

    for name, href in team_links[:48]:
        full = BASE + href
        try:
            t_soup = get_soup(full)
            # Total market value
            tv_tag = t_soup.select_one(".dataMarktwert a") or t_soup.select_one(".tm-player-additional-data__value")
            total_value = parse_value(tv_tag.get_text(strip=True)) if tv_tag else 0.0

            teams.append({"name": name, "totalValue": total_value, "url": full})

            # Squad rows
            for row in t_soup.select("table.items > tbody > tr"):
                cells = row.find_all("td", recursive=False)
                if len(cells) < 5:
                    continue
                player_name = row.select_one(".hauptlink a")
                player_name = player_name.get_text(strip=True) if player_name else None
                if not player_name:
                    continue
                pos = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                age_txt = row.select_one("td.zentriert")
                value_txt = row.select_one("td.rechts.hauptlink")
                players.append({
                    "name": player_name,
                    "nation": name,
                    "position": pos,
                    "age": int(age_txt.get_text(strip=True)) if age_txt and age_txt.get_text(strip=True).isdigit() else None,
                    "marketValue": parse_value(value_txt.get_text(strip=True)) if value_txt else 0.0,
                })
            time.sleep(1.0)  # be polite
        except Exception as exc:
            print(f"! {name}: {exc}")

    payload = {"teams": teams, "players": players}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    return payload


@app.post("/api/scrape")
def scrape():
    body = request.get_json(silent=True) or {}
    url = body.get("url", DEFAULT_URL)
    data = scrape_competition(url)
    return jsonify({
        "ok": True,
        "teams": len(data["teams"]),
        "players": len(data["players"]),
        "output": str(OUT),
    })


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
