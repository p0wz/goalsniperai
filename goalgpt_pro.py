"""
GoalGPT Pro v3.0 - Live Betting Bot (Balanced Mode)
====================================================
Features:
- 3-minute polling interval (480 requests/day)
- Dual Scout Filter: First Half Sniper + Late Game Momentum
- Gemini AI validation for final decisions
- Flashscore4 API integration with full match statistics

Author: GoalGPT Team
API: Flashscore4 (RapidAPI) + Google Gemini
"""

import os
import time
import json
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================
# ⚙️ Configuration
# ============================================
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "YOUR_RAPIDAPI_KEY")
RAPIDAPI_HOST = "flashscore4.p.rapidapi.com"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")

POLL_INTERVAL = 180  # 3 minutes
COOLDOWN_MINUTES = 15  # Prevent spam alerts

# ============================================
# 💾 State Management
# ============================================
alert_history = {}  # {match_id: last_alert_time}


# ============================================
# 🎨 Console Styling
# ============================================
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    PURPLE = '\033[95m'
    BOLD = '\033[1m'
    END = '\033[0m'


def log_info(msg):
    print(f"{Colors.CYAN}[INFO]{Colors.END} {msg}")


def log_success(msg):
    print(f"{Colors.GREEN}[SUCCESS]{Colors.END} {msg}")


def log_warn(msg):
    print(f"{Colors.YELLOW}[WARN]{Colors.END} {msg}")


def log_error(msg):
    print(f"{Colors.RED}[ERROR]{Colors.END} {msg}")


def log_signal(msg):
    print(f"{Colors.GREEN}{Colors.BOLD}[SIGNAL]{Colors.END} {msg}")


def log_api(msg):
    print(f"{Colors.PURPLE}[API]{Colors.END} {msg}")


# ============================================
# 📡 Flashscore4 API Functions
# ============================================
def fetch_live_matches():
    """Fetch all live football matches from Flashscore4"""
    url = f"https://{RAPIDAPI_HOST}/api/flashscore/v1/match/live/1"
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Flatten tournaments into matches
        matches = []
        tournaments = data if isinstance(data, list) else []
        
        for tournament in tournaments:
            league_name = tournament.get("name", "Unknown")
            league_logo = tournament.get("image_path", "")
            country = tournament.get("country_name", "")
            
            for match in tournament.get("matches", []):
                match["league_name"] = league_name
                match["league_logo"] = league_logo
                match["country_name"] = country
                matches.append(match)
        
        log_api(f"Fetched {len(matches)} live matches")
        return matches
    
    except requests.RequestException as e:
        log_error(f"API Error: {e}")
        return []


def fetch_match_stats(match_id):
    """Fetch detailed statistics for a specific match"""
    url = f"https://{RAPIDAPI_HOST}/api/flashscore/v1/match/stats/{match_id}"
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        log_warn(f"Stats fetch failed for {match_id}: {e}")
        return None


def parse_stats(stats_data):
    """Parse match statistics into usable format"""
    stats = {
        "possession": {"home": 50, "away": 50},
        "shots": {"home": 0, "away": 0},
        "shots_on_target": {"home": 0, "away": 0},
        "corners": {"home": 0, "away": 0},
        "dangerous_attacks": {"home": 0, "away": 0},
        "xG": {"home": 0, "away": 0}
    }
    
    if not stats_data:
        return stats
    
    # Use 1st-half or all-match stats
    stat_list = stats_data.get("1st-half", stats_data.get("all-match", []))
    
    for stat in stat_list:
        name = (stat.get("name") or "").lower()
        home = stat.get("home_team", 0)
        away = stat.get("away_team", 0)
        
        if "ball possession" in name:
            stats["possession"]["home"] = int(str(home).replace("%", "") or 50)
            stats["possession"]["away"] = int(str(away).replace("%", "") or 50)
        elif name == "total shots":
            stats["shots"]["home"] = int(home or 0)
            stats["shots"]["away"] = int(away or 0)
        elif name == "shots on target":
            stats["shots_on_target"]["home"] = int(home or 0)
            stats["shots_on_target"]["away"] = int(away or 0)
        elif name == "corner kicks":
            stats["corners"]["home"] = int(home or 0)
            stats["corners"]["away"] = int(away or 0)
        elif "expected goals" in name:
            stats["xG"]["home"] = float(home or 0)
            stats["xG"]["away"] = float(away or 0)
        elif "big chances" in name:
            stats["dangerous_attacks"]["home"] = int(home or 0)
            stats["dangerous_attacks"]["away"] = int(away or 0)
    
    return stats


def parse_elapsed(stage):
    """Parse match time from stage field"""
    if not stage:
        return 0
    
    stage_str = str(stage).lower()
    if "2nd half" in stage_str:
        return 60
    if "1st half" in stage_str:
        return 25
    if "halftime" in stage_str:
        return 45
    
    try:
        return int(stage)
    except:
        return 0


# ============================================
# 🎯 Scout Filter: First Half Sniper
# ============================================
def scout_first_half_sniper(match, elapsed, stats):
    """
    Strategy A: First Half Sniper (IY 0.5 Goal)
    - Time: 15' - 40'
    - Score: EXACTLY 0-0
    - Trigger: SoT >= 2 AND DA/min > 1.0
    """
    home_score = match.get("home_team", {}).get("score", 0) or 0
    away_score = match.get("away_team", {}).get("score", 0) or 0
    
    # Must be 15-40' and 0-0
    if elapsed < 15 or elapsed > 40:
        return None
    if home_score != 0 or away_score != 0:
        return None
    
    # Calculate stats
    total_sot = stats["shots_on_target"]["home"] + stats["shots_on_target"]["away"]
    total_da = stats["dangerous_attacks"]["home"] + stats["dangerous_attacks"]["away"]
    da_per_min = total_da / elapsed if elapsed > 0 else 0
    
    # Trigger: SoT >= 2 AND DA/min > 1.0
    if total_sot >= 2 and da_per_min > 1.0:
        return {
            "strategy": "First Half Sniper",
            "strategy_code": "IY_05",
            "match_id": match.get("match_id"),
            "home": match.get("home_team", {}).get("name", "Home"),
            "away": match.get("away_team", {}).get("name", "Away"),
            "minute": elapsed,
            "score": f"{home_score}-{away_score}",
            "stats": {
                "shots_on_target": total_sot,
                "total_shots": stats["shots"]["home"] + stats["shots"]["away"],
                "da_per_min": round(da_per_min, 2),
                "corners": stats["corners"]["home"] + stats["corners"]["away"],
                "xG": round(stats["xG"]["home"] + stats["xG"]["away"], 2)
            },
            "league": match.get("league_name", "Unknown")
        }
    
    return None


# ============================================
# 🔥 Scout Filter: Late Game Momentum
# ============================================
def scout_late_game_momentum(match, elapsed, stats):
    """
    Strategy B: Late Game Momentum (Next Goal)
    - Time: 60' - 85'
    - Score: Goal Difference <= 2
    - Trigger: DA/min > 0.9 OR Total Shots > 13 OR recent momentum
    """
    home_score = match.get("home_team", {}).get("score", 0) or 0
    away_score = match.get("away_team", {}).get("score", 0) or 0
    goal_diff = abs(home_score - away_score)
    
    # Must be 60-85' with goal diff <= 2
    if elapsed < 60 or elapsed > 85:
        return None
    if goal_diff > 2:
        return None
    
    # Calculate stats
    total_shots = stats["shots"]["home"] + stats["shots"]["away"]
    total_da = stats["dangerous_attacks"]["home"] + stats["dangerous_attacks"]["away"]
    da_per_min = total_da / elapsed if elapsed > 0 else 0
    
    # Trigger: ANY of the conditions
    trigger_met = False
    trigger_reason = ""
    
    if da_per_min > 0.9:
        trigger_met = True
        trigger_reason = f"High DA rate: {da_per_min:.2f}/min"
    elif total_shots > 13:
        trigger_met = True
        trigger_reason = f"High shot volume: {total_shots}"
    elif elapsed >= 65 and elapsed <= 78:
        # Peak goal timing window
        trigger_met = True
        trigger_reason = f"Peak goal window: {elapsed}'"
    
    if trigger_met:
        return {
            "strategy": "Late Game Momentum",
            "strategy_code": "MS_GOL",
            "match_id": match.get("match_id"),
            "home": match.get("home_team", {}).get("name", "Home"),
            "away": match.get("away_team", {}).get("name", "Away"),
            "minute": elapsed,
            "score": f"{home_score}-{away_score}",
            "stats": {
                "total_shots": total_shots,
                "shots_on_target": stats["shots_on_target"]["home"] + stats["shots_on_target"]["away"],
                "da_per_min": round(da_per_min, 2),
                "corners": stats["corners"]["home"] + stats["corners"]["away"],
                "xG": round(stats["xG"]["home"] + stats["xG"]["away"], 2)
            },
            "trigger_reason": trigger_reason,
            "league": match.get("league_name", "Unknown")
        }
    
    return None


# ============================================
# 🧠 Gemini AI Analyst
# ============================================
def ask_gemini_analyst(candidate):
    """Send match data to Gemini for final validation"""
    
    prompt = f"""Act as a Professional Football Analyst.
STRATEGY: {candidate['strategy']} ({candidate['strategy_code']})
MATCH: {candidate['home']} vs {candidate['away']}
TIME: {candidate['minute']}' | SCORE: {candidate['score']}
LEAGUE: {candidate['league']}
STATS:
- DA/min: {candidate['stats']['da_per_min']}
- Shots (Total/Target): {candidate['stats']['total_shots']}/{candidate['stats']['shots_on_target']}
- Corners: {candidate['stats']['corners']}
- xG: {candidate['stats']['xG']}

Based on the stats, is a goal imminent?
OUTPUT JSON ONLY:
{{
  "verdict": "PLAY" or "SKIP",
  "confidence": (0-100),
  "reason": "One short sentence."
}}"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 200
        }
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Extract text from response
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
        
        # Parse JSON from response
        # Clean up markdown formatting if present
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        result = json.loads(text)
        return result
    
    except Exception as e:
        log_warn(f"Gemini API error: {e}")
        return {"verdict": "SKIP", "confidence": 0, "reason": "API error"}


# ============================================
# 🚦 Cooldown Check
# ============================================
def is_on_cooldown(match_id):
    """Check if match is on cooldown (alerted in last 15 mins)"""
    if match_id not in alert_history:
        return False
    
    last_alert = alert_history[match_id]
    cooldown_end = last_alert + timedelta(minutes=COOLDOWN_MINUTES)
    
    return datetime.now() < cooldown_end


def set_cooldown(match_id):
    """Set cooldown for a match"""
    alert_history[match_id] = datetime.now()


# ============================================
# 🔄 Main Scan Loop
# ============================================
def run_scan():
    """Execute one scan cycle"""
    matches = fetch_live_matches()
    
    if not matches:
        log_info("No live matches found")
        return 0
    
    candidates_found = 0
    alerts_sent = 0
    
    for match in matches:
        match_id = match.get("match_id")
        elapsed = parse_elapsed(match.get("stage"))
        
        # Check if candidate for either strategy
        home_score = match.get("home_team", {}).get("score", 0) or 0
        away_score = match.get("away_team", {}).get("score", 0) or 0
        goal_diff = abs(home_score - away_score)
        
        # Quick filter before fetching stats
        is_iy_candidate = 15 <= elapsed <= 40 and home_score == 0 and away_score == 0
        is_ms_candidate = 60 <= elapsed <= 85 and goal_diff <= 2
        
        if not (is_iy_candidate or is_ms_candidate):
            continue
        
        # Skip if on cooldown
        if is_on_cooldown(match_id):
            continue
        
        # Fetch detailed stats
        stats_data = fetch_match_stats(match_id)
        stats = parse_stats(stats_data)
        
        # Run scout filters
        candidate = None
        
        if is_iy_candidate:
            candidate = scout_first_half_sniper(match, elapsed, stats)
        
        if not candidate and is_ms_candidate:
            candidate = scout_late_game_momentum(match, elapsed, stats)
        
        if not candidate:
            continue
        
        candidates_found += 1
        
        # Send to Gemini for validation
        log_info(f"🧠 Analyzing: {candidate['home']} vs {candidate['away']}")
        gemini_result = ask_gemini_analyst(candidate)
        
        verdict = gemini_result.get("verdict", "SKIP")
        confidence = gemini_result.get("confidence", 0)
        reason = gemini_result.get("reason", "No reason provided")
        
        # Alert if PLAY and confidence > 75
        if verdict == "PLAY" and confidence > 75:
            alerts_sent += 1
            set_cooldown(match_id)
            
            emoji = "⏱️" if candidate["strategy_code"] == "IY_05" else "🔥"
            strategy_label = "IY GOL" if candidate["strategy_code"] == "IY_05" else "MS GOL"
            
            print()
            print(f"{Colors.GREEN}{Colors.BOLD}{'='*60}{Colors.END}")
            log_signal(f"[{strategy_label}] {candidate['home']} vs {candidate['away']}")
            print(f"   Time: {candidate['minute']}' | Score: {candidate['score']} | League: {candidate['league']}")
            print(f"   Shots: {candidate['stats']['total_shots']} | SoT: {candidate['stats']['shots_on_target']} | xG: {candidate['stats']['xG']}")
            print(f"   Confidence: {Colors.GREEN}{confidence}%{Colors.END}")
            print(f"   Reason: {reason}")
            print(f"{Colors.GREEN}{Colors.BOLD}{'='*60}{Colors.END}")
            print()
        else:
            log_info(f"❌ Skipped: {candidate['home']} vs {candidate['away']} (Conf: {confidence}%)")
        
        # Small delay between API calls
        time.sleep(0.5)
    
    return candidates_found, alerts_sent


# ============================================
# 🚀 Main Entry Point
# ============================================
def main():
    print()
    print(f"{Colors.GREEN}{Colors.BOLD}+======================================================+{Colors.END}")
    print(f"{Colors.GREEN}{Colors.BOLD}|       GoalGPT Pro v3.0 - Live Betting Bot            |{Colors.END}")
    print(f"{Colors.GREEN}{Colors.BOLD}|       Flashscore4 + Gemini AI Integration            |{Colors.END}")
    print(f"{Colors.GREEN}{Colors.BOLD}+======================================================+{Colors.END}")
    print()
    
    log_info(f"Poll Interval: {POLL_INTERVAL}s (3 minutes)")
    log_info(f"Cooldown: {COOLDOWN_MINUTES} minutes")
    log_info("Strategies: First Half Sniper (15-40') + Late Game Momentum (60-85')")
    log_success("Bot started! Press Ctrl+C to stop.")
    print()
    
    scan_count = 0
    
    while True:
        try:
            scan_count += 1
            current_time = datetime.now().strftime("%H:%M:%S")
            log_info(f"[Scan #{scan_count}] Starting at {current_time}...")
            
            candidates, alerts = run_scan()
            
            if alerts > 0:
                log_success(f"Scan complete: {alerts} alert(s) sent!")
            else:
                log_info(f"Scan complete: {candidates} candidate(s) analyzed, no alerts.")
            
            log_info(f"Next scan in {POLL_INTERVAL}s...")
            print("-" * 50)
            
            time.sleep(POLL_INTERVAL)
        
        except KeyboardInterrupt:
            print()
            log_warn("Bot stopped by user.")
            break
        
        except Exception as e:
            log_error(f"Unexpected error: {e}")
            log_info("Retrying in 60 seconds...")
            time.sleep(60)


if __name__ == "__main__":
    main()
