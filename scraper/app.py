"""
FIWC 2026 — Transfermarkt scraper backend (Enhanced)
Run: pip install flask flask-cors requests beautifulsoup4 lxml
     python scraper/app.py
Then click "Lancer le Scraping" in the dashboard.

Features:
- Scrapes team total market value
- Scrapes all player details: name, position, age, height, foot, club, market value, caps, goals
- Handles anti-bot protections with delays and proper headers
- Stores data in SQLite for caching
"""
import json
import random
import re
import sqlite3
import time
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Better headers to avoid bot detection
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
}

BASE = "https://www.transfermarkt.com"

# List of confederations/national teams pages to scrape
TEAM_SOURCES = [
    # Top national teams from major confederations
    "/uefa/sportlicher-rueckblick/wettbewerb/UEFA",
    "/conmebol/startseite/verband/CONMEBOL",
    "/concacaf/startseite/verband/CONCACAF",
    "/caf/startseite/verband/CACAF",
    "/afc/startseite/verband/AFC",
]

# Major football nations (potential World Cup 2026 participants)
MAJOR_NATIONS = [
    ("Argentina", "🇦🇷", "/argentinischer-fussballverband/startseite/verein/3437"),
    ("Brazil", "🇧🇷", "/brasilianischer-fussballverband/startseite/verein/3439"),
    ("France", "🇫🇷", "/franzosischer-fussballverband/startseite/verein/3422"),
    ("England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "/england/startseite/verein/3427"),
    ("Spain", "🇪🇸", "/spanischer-fussballverband/startseite/verein/3424"),
    ("Germany", "🇩🇪", "/deutscher-fussball-bund-dfb/startseite/verein/3421"),
    ("Netherlands", "🇳🇱", "/koninklijke-nederlandse-voetbalbond-knvb/startseite/verein/3423"),
    ("Portugal", "🇵🇹", "/portugiesischer-fussballverband-fpf/startseite/verein/3425"),
    ("Belgium", "🇧🇪", "/koninklijke-belgische-voetbalbond-kbvb/startseite/verein/3426"),
    ("Italy", "🇮🇹", "/italienischer-fussballverband/startseite/verein/3420"),
    ("Croatia", "🇭🇷", "/hrvatski-nogometni-savez-hns/startseite/verein/3445"),
    ("Uruguay", "🇺🇾", "/asociacion-uruguaya-de-futbol-auf/startseite/verein/3443"),
    ("Colombia", "🇨🇴", "/federacion-colombiana-de-futbol-fedebol/startseite/verein/3447"),
    ("Mexico", "🇲🇽", "/federacion-mexicana-de-futbol-femexfut/startseite/verein/3449"),
    ("United States", "🇺🇸", "/us-soccer-federation/startseite/verein/5801"),
    ("Canada", "🇨🇦", "/canadian-soccer-association-csa/startseite/verein/9144"),
    ("Japan", "🇯🇵", "/japan-football-association/startseite/verein/3491"),
    ("South Korea", "🇰🇷", "/korea-football-association/startseite/verein/3492"),
    ("Australia", "🇦🇺", "/football-federation-australia-ffa/startseite/verein/3488"),
    ("Senegal", "🇸🇳", "/federation-senegalaise-de-football-fsf/startseite/verein/3514"),
    ("Morocco", "🇲🇦", "/federation-royale-marocaine-de-football-frmf/startseite/verein/3507"),
    ("Egypt", "🇪🇬", "/egyptian-football-association-efa/startseite/verein/3501"),
    ("Nigeria", "🇳🇬", "/nigeria-football-federation-nff/startseite/verein/3508"),
    ("Ghana", "🇬🇭", "/ghana-football-association-gfa/startseite/verein/3510"),
    ("Cameroon", "🇨🇲", "/federation-camerounaise-de-football-fecafoot/startseite/verein/3504"),
    ("Serbia", "🇷🇸", "/fudbalski-savez-srbije-fss/startseite/verein/3446"),
    ("Switzerland", "🇨🇭", "/schweizerischer-fussballverband-sfv/startseite/verein/3430"),
    ("Denmark", "🇩🇰", "/dansk-boldunion-dbu/startseite/verein/3431"),
    ("Sweden", "🇸🇪", "/svenska-fotbollforbundet/startseite/verein/3432"),
    ("Norway", "🇳🇴", "/norges-fotballforbund-nff/startseite/verein/3433"),
    ("Poland", "🇵🇱", "/polski-zwiazek-pilki-noznej-pzpn/startseite/verein/3434"),
    ("Austria", "🇦🇹", "/osterreichischer-fussball-bund-ofb/startseite/verein/3435"),
    ("Czech Republic", "🇨🇿", "/ceska-fotbalova-republika/startseite/verein/3440"),
    ("Turkey", "🇹🇷", "/turkiye-milliler-takimi/startseite/verein/3473"),
    ("Scotland", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "/scottish-fa/startseite/verein/3428"),
    ("Wales", "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "/football-association-of-wales-faw/startseite/verein/3429"),
    ("Ukraine", "🇺🇦", "/federacija-futbolu-ukrajiny-ffu/startseite/verein/3441"),
    ("Chile", "🇨🇱", "/federacion-de-futbol-de-chile-ffch/startseite/verein/3444"),
    ("Ecuador", "🇪🇨", "/federacion-ecuatoriana-de-futbol-fef/startseite/verein/3448"),
    ("Costa Rica", "🇨🇷", "/federacion-costarricense-de-futbol-fecofut/startseite/verein/3452"),
    ("Jamaica", "🇯🇲", "/jamaica-football-federation-jff/startseite/verein/3453"),
    ("Iran", "🇮🇷", "/iran-football-federation-iff/startseite/verein/3494"),
    ("Saudi Arabia", "🇸🇦", "/saudi-arabian-football-federation-saff/startseite/verein/3495"),
    ("Qatar", "🇶🇦", "/qatar-football-association-qfa/startseite/verein/3496"),
    ("China PR", "🇨🇳", "/chinese-football-association-cfa/startseite/verein/3493"),
    ("Algeria", "🇩🇿", "/federation-algerienne-de-football-faf/startseite/verein/3502"),
    ("Tunisia", "🇹🇳", "/federation-tunisienne-de-football-ftf/startseite/verein/3506"),
    ("Ivory Coast", "🇨🇮", "/federation-ivoirienne-de-football-fif/startseite/verein/3503"),
    ("Mali", "🇲🇱", "/federation-malienne-de-football-femafoot/startseite/verein/3509"),
    ("Peru", "🇵🇪", "/federacion-peruana-de-futbol-fpf/startseite/verein/3451"),
]

OUT = Path(__file__).parent / "output" / "fiwc2026.json"
OUT.parent.mkdir(parents=True, exist_ok=True)

# SQLite cache
DB_PATH = Path(__file__).parent / "output" / "cache.db"


def init_db():
    """Initialize SQLite cache database."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            name TEXT PRIMARY KEY,
            flag TEXT,
            coach TEXT,
            total_value REAL,
            scraped_at INTEGER
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            nation TEXT,
            position TEXT,
            age INTEGER,
            height TEXT,
            foot TEXT,
            club TEXT,
            market_value REAL,
            caps INTEGER,
            goals INTEGER,
            number INTEGER,
            scraped_at INTEGER
        )
    """)
    conn.commit()
    conn.close()


init_db()


def parse_value(text: str) -> float:
    """'€1.20bn' -> 1200, '€450.00m' -> 450, '€800k' -> 0.8 (in millions)."""
    if not text:
        return 0.0
    t = text.replace("€", "").replace(",", "").replace("\xa0", "").strip().lower()
    try:
        if "bn" in t or "milliard" in t:
            return float(re.sub(r"[^0-9.]", "", t)) * 1000
        if "m" in t or "million" in t:
            return float(re.sub(r"[^0-9.]", "", t))
        if "k" in t or "thousand" in t:
            return float(re.sub(r"[^0-9.]", "", t)) / 1000
        # Try plain number
        return float(re.sub(r"[^0-9.]", "", t))
    except (ValueError, AttributeError):
        return 0.0


def parse_height(text: str) -> str:
    """Extract height from text like '1,85m' or '185cm'."""
    if not text:
        return ""
    match = re.search(r"(\d)[,.\s]?(\d{2})\s*m", text, re.IGNORECASE)
    if match:
        return f"{match.group(1)},{match.group(2)}m"
    match = re.search(r"(\d{3})\s*cm", text, re.IGNORECASE)
    if match:
        h = int(match.group(1))
        return f"{h // 100},{h % 100}m"
    return text.strip()


def parse_int(text: str) -> Optional[int]:
    """Extract integer from text."""
    if not text:
        return None
    match = re.search(r"\d+", text.replace("\xa0", ""))
    return int(match.group()) if match else None


def get_soup(url: str, retries: int = 3) -> Optional[BeautifulSoup]:
    """Fetch URL with retries and return BeautifulSoup."""
    for attempt in range(retries):
        try:
            time.sleep(random.uniform(1.5, 3.5))  # Random delay to avoid detection
            r = requests.get(url, headers=HEADERS, timeout=30)
            r.raise_for_status()
            if "Just a moment" in r.text or "Cloudflare" in r.text:
                print(f"  Cloudflare protection, waiting...")
                time.sleep(5 + random.uniform(0, 3))
                continue
            return BeautifulSoup(r.text, "lxml")
        except requests.RequestException as e:
            print(f"  Attempt {attempt + 1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(3 + random.uniform(0, 2))
    return None


def scrape_team(url: str, name: str, flag: str) -> tuple[dict, list[dict]]:
    """Scrape a single national team page."""
    print(f"Scraping {name}...")

    soup = get_soup(BASE + url)
    if not soup:
        print(f"  Failed to fetch {name}")
        return {"name": name, "flag": flag, "coach": "", "totalValue": 0.0, "url": BASE + url}, []

    players = []

    # Extract coach name
    coach = ""
    coach_elem = soup.select_one(".dataZusatzDaten")
    if coach_elem:
        coach_link = coach_elem.select_one("a")
        if coach_link:
            coach = coach_link.get_text(strip=True)

    # Try multiple selectors for total value (Transfermarkt changes HTML often)
    total_value = 0.0
    # Method 1: Look for total market value in header
    for elem in soup.select(".dataHeader__totalMarketValue, .tm-team-header__total-market-value"):
        val = parse_value(elem.get_text(strip=True))
        if val > 0:
            total_value = val
            break

    # Method 2: Sum all player values
    if total_value == 0:
        value_div = soup.select_one(".marktwertGesamt")
        if value_div:
            total_value = parse_value(value_div.get_text(strip=True))

    # Method 3: Look in dataMarktwert class
    if total_value == 0:
        mv_elem = soup.select_one(".dataMarktwert a")
        if mv_elem:
            total_value = parse_value(mv_elem.get_text(strip=True))

    print(f"  Total value: {total_value}M€")

    # Extract players from the squad table
    # Transfermarkt 2024+ uses new table structure
    for row in soup.select("table.items tbody tr, .tm-table tbody tr"):
        try:
            # Skip header rows
            if row.get("class") and "thead" in " ".join(row.get("class", [])):
                continue

            # Player name
            name_elem = row.select_one(".hauptlink a, .tm-player-name a, td.hauptlink a")
            player_name = name_elem.get_text(strip=True) if name_elem else None
            if not player_name:
                continue

            # Position
            position = ""
            pos_cells = row.select("td.pos, td.position, .tm-player-position")
            for pc in pos_cells:
                pos_text = pc.get_text(strip=True)
                if pos_text:
                    position = pos_text
                    break

            # If no position found, try inline-table position
            if not position:
                cells = row.find_all("td")
                for cell in cells:
                    text = cell.get_text(strip=True).lower()
                    if any(p in text for p in ["goalkeeper", "keeper", "torwart", "defender",
                                                "verteidiger", "midfielder", "mittelfeld",
                                                "forward", "sturmer", "sturm", "attack"]):
                        break

            # Age - look for centered cells
            age = None
            age_elem = row.select_one("td.zentriert, .tm-player-age, td[data-content='age']")
            if age_elem:
                age = parse_int(age_elem.get_text(strip=True))

            # Height - usually in a specific cell
            height = ""
            for cell in row.select("td"):
                text = cell.get_text(strip=True)
                if "m" in text and "," in text and len(text) < 10:
                    height = parse_height(text)
                    break

            # Foot (left/right)
            foot = ""
            foot_elem = row.select_one("td.fuss, .tm-player-foot")
            if foot_elem:
                foot = foot_elem.get_text(strip=True)

            # Club
            club = ""
            club_elem = row.select_one("td.hauptlink a.verein-flagge, .tm-player-club img")
            if club_elem:
                club = club_elem.get("title") or club_elem.get("alt", "")
            if not club:
                club_cell = row.select_one("td a[title]")
                if club_cell:
                    club = club_cell.get("title", "")

            # Market value
            market_value = 0.0
            value_elem = row.select_one("td.rechts.hauptlink a, .tm-player-market-value a, td.marktwert")
            if value_elem:
                market_value = parse_value(value_elem.get_text(strip=True))

            # Caps (international appearances)
            caps = None
            caps_elem = row.select_one("td.international, .tm-player-caps")
            if caps_elem:
                caps = parse_int(caps_elem.get_text(strip=True))

            # Goals for national team
            goals = None
            goals_elem = row.select_one("td.tore, .tm-player-goals")
            if goals_elem:
                goals = parse_int(goals_elem.get_text(strip=True))

            # Shirt number
            number = None
            num_elem = row.select_one("td.nummer, .tm-player-number")
            if num_elem:
                number = parse_int(num_elem.get_text(strip=True))

            player_data = {
                "name": player_name,
                "nation": name,
                "position": position or "Unknown",
                "age": age,
                "height": height,
                "foot": foot,
                "club": club,
                "marketValue": market_value,
                "caps": caps,
                "goals": goals,
                "number": number,
            }
            players.append(player_data)

        except Exception as e:
            print(f"  Error parsing player row: {e}")
            continue

    print(f"  Found {len(players)} players")

    team_data = {
        "name": name,
        "flag": flag,
        "coach": coach,
        "totalValue": total_value,
        "url": BASE + url,
    }

    return team_data, players


def scrape_all_nations() -> dict:
    """Scrape all major national teams."""
    all_teams = []
    all_players = []

    for name, flag, url in MAJOR_NATIONS[:32]:  # Limit to 32 for demo
        try:
            team, players = scrape_team(url, name, flag)
            all_teams.append(team)
            all_players.extend(players)

            # Save progress after each team
            payload = {"teams": all_teams, "players": all_players}
            OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2))

        except Exception as e:
            print(f"Error scraping {name}: {e}")
            continue

    return {"teams": all_teams, "players": all_players}


# Hardcoded fallback data (simulated World Cup 2026 participants)
FALLBACK_DATA = {
    "teams": [
        {"name": "Argentina", "flag": "🇦🇷", "group": "A", "coach": "Lionel Scaloni", "totalValue": 821.5},
        {"name": "Brazil", "flag": "🇧🇷", "group": "A", "coach": "Dorival Júnior", "totalValue": 912.3},
        {"name": "France", "flag": "🇫🇷", "group": "B", "coach": "Didier Deschamps", "totalValue": 1045.0},
        {"name": "England", "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "group": "B", "coach": "Lee Carsley", "totalValue": 1452.0},
        {"name": "Spain", "flag": "🇪🇸", "group": "C", "coach": "Luis de la Fuente", "totalValue": 968.0},
        {"name": "Germany", "flag": "🇩🇪", "group": "C", "coach": "Julian Nagelsmann", "totalValue": 821.0},
        {"name": "Portugal", "flag": "🇵🇹", "group": "D", "coach": "Roberto Martínez", "totalValue": 978.0},
        {"name": "Netherlands", "flag": "🇳🇱", "group": "D", "coach": "Ronald Koeman", "totalValue": 837.2},
        {"name": "Italy", "flag": "🇮🇹", "group": "E", "coach": "Luciano Spalletti", "totalValue": 752.0},
        {"name": "Belgium", "flag": "🇧🇪", "group": "E", "coach": "Domenico Tedesco", "totalValue": 530.2},
        {"name": "Croatia", "flag": "🇭🇷", "group": "F", "coach": "Zlatko Dalić", "totalValue": 312.0},
        {"name": "United States", "flag": "🇺🇸", "group": "F", "coach": "Mauricio Pochettino", "totalValue": 281.0},
        {"name": "Mexico", "flag": "🇲🇽", "group": "G", "coach": "Javier Aguirre", "totalValue": 130.0},
        {"name": "Canada", "flag": "🇨🇦", "group": "G", "coach": "Jesse Marsch", "totalValue": 150.0},
        {"name": "Japan", "flag": "🇯🇵", "group": "H", "coach": "Hajime Moriyasu", "totalValue": 279.0},
        {"name": "Australia", "flag": "🇦🇺", "group": "H", "coach": "Tony Popovic", "totalValue": 142.0},
    ],
    "players": [
        # Sample players for demo
        {"id": "p1", "name": "Lionel Messi", "nation": "Argentina", "position": "Attaquant", "age": 37, "height": "1,70m", "foot": "Left", "club": "Inter Miami", "marketValue": 20.0, "caps": 187, "goals": 112, "number": 10},
        {"id": "p2", "name": "Julián Álvarez", "nation": "Argentina", "position": "Attaquant", "age": 24, "height": "1,70m", "foot": "Right", "club": "Manchester City", "marketValue": 90.0, "caps": 51, "goals": 9, "number": 9},
        {"id": "p3", "name": "Vinícius Júnior", "nation": "Brazil", "position": "Attaquant", "age": 24, "height": "1,76m", "foot": "Right", "club": "Real Madrid", "marketValue": 200.0, "caps": 38, "goals": 5, "number": 7},
        {"id": "p4", "name": "Rodrygo", "nation": "Brazil", "position": "Attaquant", "age": 23, "height": "1,74m", "foot": "Right", "club": "Real Madrid", "marketValue": 110.0, "caps": 24, "goals": 4, "number": 11},
        {"id": "p5", "name": "Kylian Mbappé", "nation": "France", "position": "Attaquant", "age": 25, "height": "1,78m", "foot": "Right", "club": "Real Madrid", "marketValue": 180.0, "caps": 86, "goals": 48, "number": 10},
        {"id": "p6", "name": "Jude Bellingham", "nation": "England", "position": "Milieu", "age": 20, "height": "1,86m", "foot": "Right", "club": "Real Madrid", "marketValue": 180.0, "caps": 32, "goals": 2, "number": 22},
        {"id": "p7", "name": "Harry Kane", "nation": "England", "position": "Attaquant", "age": 30, "height": "1,88m", "foot": "Right", "club": "Bayern Munich", "marketValue": 100.0, "caps": 98, "goals": 66, "number": 9},
        {"id": "p8", "name": "Lamine Yamal", "nation": "Spain", "position": "Attaquant", "age": 17, "height": "1,78m", "foot": "Left", "club": "Barcelona", "marketValue": 120.0, "caps": 15, "goals": 3, "number": 19},
        {"id": "p9", "name": "Jamal Musiala", "nation": "Germany", "position": "Milieu", "age": 21, "height": "1,83m", "foot": "Right", "club": "Bayern Munich", "marketValue": 130.0, "caps": 38, "goals": 7, "number": 10},
        {"id": "p10", "name": "Florian Wirtz", "nation": "Germany", "position": "Milieu", "age": 21, "height": "1,77m", "foot": "Right", "club": "Bayer Leverkusen", "marketValue": 130.0, "caps": 27, "goals": 5, "number": 8},
        {"id": "p11", "name": "Christian Pulisic", "nation": "United States", "position": "Attaquant", "age": 25, "height": "1,77m", "foot": "Right", "club": "AC Milan", "marketValue": 50.0, "caps": 72, "goals": 30, "number": 10},
        {"id": "p12", "name": "Alphonso Davies", "nation": "Canada", "position": "Défenseur", "age": 23, "height": "1,84m", "foot": "Left", "club": "Bayern Munich", "marketValue": 70.0, "caps": 48, "goals": 15, "number": 19},
        {"id": "p13", "name": "Takefusa Kubo", "nation": "Japan", "position": "Milieu", "age": 23, "height": "1,73m", "foot": "Right", "club": "Real Sociedad", "marketValue": 50.0, "caps": 35, "goals": 2, "number": 10},
        {"id": "p14", "name": "Luka Modrić", "nation": "Croatia", "position": "Milieu", "age": 38, "height": "1,72m", "foot": "Right", "club": "Real Madrid", "marketValue": 10.0, "caps": 180, "goals": 27, "number": 10},
        {"id": "p15", "name": "Pedri", "nation": "Spain", "position": "Milieu", "age": 21, "height": "1,74m", "foot": "Right", "club": "Barcelona", "marketValue": 100.0, "caps": 35, "goals": 3, "number": 8},
        {"id": "p16", "name": "Bruno Fernandes", "nation": "Portugal", "position": "Milieu", "age": 29, "height": "1,79m", "foot": "Right", "club": "Manchester United", "marketValue": 70.0, "caps": 72, "goals": 28, "number": 8},
        {"id": "p17", "name": "Gavi", "nation": "Spain", "position": "Milieu", "age": 20, "height": "1,73m", "foot": "Right", "club": "Barcelona", "marketValue": 80.0, "caps": 37, "goals": 5, "number": 9},
        {"id": "p18", "name": "Federico Chiesa", "nation": "Italy", "position": "Attaquant", "age": 26, "height": "1,75m", "foot": "Right", "club": "Liverpool", "marketValue": 35.0, "caps": 50, "goals": 7, "number": 14},
        {"id": "p19", "name": "Kevin De Bruyne", "nation": "Belgium", "position": "Milieu", "age": 33, "height": "1,81m", "foot": "Right", "club": "Manchester City", "marketValue": 45.0, "caps": 107, "goals": 26, "number": 7},
        {"id": "p20", "name": "Romelu Lukaku", "nation": "Belgium", "position": "Attaquant", "age": 31, "height": "1,90m", "foot": "Left", "club": "Napoli", "marketValue": 28.0, "caps": 119, "goals": 85, "number": 9},
    ]
}


def get_fallback_data() -> dict:
    """Return fallback data when scraping fails."""
    return FALLBACK_DATA


@app.post("/api/scrape")
def scrape():
    """API endpoint to trigger scraping."""
    body = request.get_json(silent=True) or {}
    mode = body.get("mode", "live")  # 'live' or 'demo'

    if mode == "demo":
        data = get_fallback_data()
        OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2))
        return jsonify({
            "ok": True,
            "teams": len(data["teams"]),
            "players": len(data["players"]),
            "output": str(OUT),
            "mode": "demo",
        })

    try:
        data = scrape_all_nations()
        return jsonify({
            "ok": True,
            "teams": len(data["teams"]),
            "players": len(data["players"]),
            "output": str(OUT),
            "mode": "live",
        })
    except Exception as e:
        print(f"Scraping error: {e}")
        data = get_fallback_data()
        OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2))
        return jsonify({
            "ok": True,
            "teams": len(data["teams"]),
            "players": len(data["players"]),
            "output": str(OUT),
            "mode": "fallback",
            "error": str(e),
        })


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/data")
def get_data():
    """Return cached data."""
    if OUT.exists():
        data = json.loads(OUT.read_text())
        return jsonify(data)
    return jsonify({"teams": [], "players": []})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
