"""
NBA Stats Fetcher using nba_api
Provides player stats, game logs, and today's games
"""

import json
import sys
import time
from datetime import datetime, timedelta

try:
    from nba_api.stats.endpoints import (
        playergamelog, 
        commonplayerinfo,
        scoreboardv2,
        leaguegamefinder,
        teamgamelog
    )
    from nba_api.stats.static import players, teams
except ImportError:
    print(json.dumps({"error": "nba_api not installed. Run: pip install nba_api"}))
    sys.exit(1)

# Rate limit delay (600ms recommended)
RATE_LIMIT_DELAY = 0.6

def get_todays_games():
    """Get today's NBA games"""
    try:
        time.sleep(RATE_LIMIT_DELAY)
        scoreboard = scoreboardv2.ScoreboardV2(game_date=datetime.now().strftime('%Y-%m-%d'))
        games = scoreboard.get_normalized_dict()
        
        result = []
        for game in games.get('GameHeader', []):
            result.append({
                'game_id': game.get('GAME_ID'),
                'status': game.get('GAME_STATUS_TEXT'),
                'home_team_id': game.get('HOME_TEAM_ID'),
                'away_team_id': game.get('VISITOR_TEAM_ID'),
                'home_team': get_team_name(game.get('HOME_TEAM_ID')),
                'away_team': get_team_name(game.get('VISITOR_TEAM_ID')),
                'start_time': game.get('GAME_STATUS_TEXT')
            })
        
        return {"success": True, "games": result}
    except Exception as e:
        return {"error": str(e)}

def get_team_name(team_id):
    """Get team name by ID"""
    team_list = teams.get_teams()
    for team in team_list:
        if team['id'] == team_id:
            return team['full_name']
    return f"Team {team_id}"

def get_player_id(player_name):
    """Find player ID by name"""
    player_list = players.get_players()
    for player in player_list:
        if player_name.lower() in player['full_name'].lower():
            return player['id']
    return None

def get_player_game_logs(player_id, season='2024-25', last_n=20):
    """Get player's last N game logs"""
    try:
        time.sleep(RATE_LIMIT_DELAY)
        gamelog = playergamelog.PlayerGameLog(
            player_id=player_id,
            season=season,
            season_type_all_star='Regular Season'
        )
        games = gamelog.get_normalized_dict()['PlayerGameLog']
        
        # Get last N games
        games = games[:last_n]
        
        result = []
        for game in games:
            result.append({
                'game_id': game.get('Game_ID'),
                'date': game.get('GAME_DATE'),
                'matchup': game.get('MATCHUP'),
                'wl': game.get('WL'),
                'min': game.get('MIN'),
                'pts': game.get('PTS'),
                'reb': game.get('REB'),
                'ast': game.get('AST'),
                'stl': game.get('STL'),
                'blk': game.get('BLK'),
                'tov': game.get('TOV'),
                'fg3m': game.get('FG3M'),
                'pra': game.get('PTS', 0) + game.get('REB', 0) + game.get('AST', 0),
                'home': '@' not in game.get('MATCHUP', '')
            })
        
        return {"success": True, "games": result, "player_id": player_id}
    except Exception as e:
        return {"error": str(e)}

def get_team_roster(team_id):
    """Get team roster"""
    try:
        time.sleep(RATE_LIMIT_DELAY)
        from nba_api.stats.endpoints import commonteamroster
        roster = commonteamroster.CommonTeamRoster(team_id=team_id)
        players_data = roster.get_normalized_dict()['CommonTeamRoster']
        
        result = []
        for player in players_data:
            result.append({
                'id': player.get('PLAYER_ID'),
                'name': player.get('PLAYER'),
                'number': player.get('NUM'),
                'position': player.get('POSITION'),
                'age': player.get('AGE')
            })
        
        return {"success": True, "players": result}
    except Exception as e:
        return {"error": str(e)}

def calculate_hit_rates(games, market, line):
    """Calculate hit rates for a specific market and line"""
    hits = 0
    total = len(games)
    
    if total == 0:
        return {"hit_rate": 0, "hits": 0, "total": 0}
    
    for game in games:
        value = 0
        if market == 'pts':
            value = game.get('pts', 0)
        elif market == 'reb':
            value = game.get('reb', 0)
        elif market == 'ast':
            value = game.get('ast', 0)
        elif market == 'pra':
            value = game.get('pra', 0)
        elif market == 'fg3m':
            value = game.get('fg3m', 0)
        elif market == 'stl':
            value = game.get('stl', 0)
        elif market == 'blk':
            value = game.get('blk', 0)
        elif market == 'tov':
            value = game.get('tov', 0)
        
        if value > line:
            hits += 1
    
    hit_rate = round((hits / total) * 100, 1)
    return {"hit_rate": hit_rate, "hits": hits, "total": total}

def get_player_hit_rates(player_id, line_pts=25.5, line_reb=8.5, line_ast=6.5, 
                         line_pra=38.5, line_fg3m=2.5, line_stl=1.5, 
                         line_blk=1.5, line_tov=3.5, last_n=20):
    """Get hit rates for all markets"""
    games_result = get_player_game_logs(player_id, last_n=last_n)
    
    if 'error' in games_result:
        return games_result
    
    games = games_result['games']
    
    # Calculate for each market
    result = {
        'player_id': player_id,
        'games_analyzed': len(games),
        'markets': {
            'pts': calculate_hit_rates(games, 'pts', line_pts),
            'reb': calculate_hit_rates(games, 'reb', line_reb),
            'ast': calculate_hit_rates(games, 'ast', line_ast),
            'pra': calculate_hit_rates(games, 'pra', line_pra),
            'fg3m': calculate_hit_rates(games, 'fg3m', line_fg3m),
            'stl': calculate_hit_rates(games, 'stl', line_stl),
            'blk': calculate_hit_rates(games, 'blk', line_blk),
            'tov': calculate_hit_rates(games, 'tov', line_tov)
        },
        'lines': {
            'pts': line_pts,
            'reb': line_reb,
            'ast': line_ast,
            'pra': line_pra,
            'fg3m': line_fg3m,
            'stl': line_stl,
            'blk': line_blk,
            'tov': line_tov
        }
    }
    
    # Calculate home/away splits
    home_games = [g for g in games if g['home']]
    away_games = [g for g in games if not g['home']]
    
    result['splits'] = {
        'home': {
            'pts': calculate_hit_rates(home_games, 'pts', line_pts),
            'games': len(home_games)
        },
        'away': {
            'pts': calculate_hit_rates(away_games, 'pts', line_pts),
            'games': len(away_games)
        }
    }
    
    return {"success": True, "data": result}

# CLI Interface
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python nbaFetcher.py <command> [args]"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'games':
        result = get_todays_games()
    elif command == 'player_logs':
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Player ID required"}))
            sys.exit(1)
        player_id = int(sys.argv[2])
        last_n = int(sys.argv[3]) if len(sys.argv) > 3 else 20
        result = get_player_game_logs(player_id, last_n=last_n)
    elif command == 'player_id':
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Player name required"}))
            sys.exit(1)
        player_name = ' '.join(sys.argv[2:])
        player_id = get_player_id(player_name)
        result = {"player_id": player_id} if player_id else {"error": "Player not found"}
    elif command == 'roster':
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Team ID required"}))
            sys.exit(1)
        team_id = int(sys.argv[2])
        result = get_team_roster(team_id)
    elif command == 'hit_rates':
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Player ID required"}))
            sys.exit(1)
        player_id = int(sys.argv[2])
        result = get_player_hit_rates(player_id)
    elif command == 'teams':
        result = {"teams": teams.get_teams()}
    else:
        result = {"error": f"Unknown command: {command}"}
    
    print(json.dumps(result))
