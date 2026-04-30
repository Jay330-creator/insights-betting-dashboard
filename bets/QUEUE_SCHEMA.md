# picks_to_sync.jsonl schema

Each line is one JSON object representing a *final 1pm straight pick* (not previews). With 2-straights/day, you will append 2 lines per day (best + secondary).

Required fields (minimum for insert):
- pick_date (YYYY-MM-DD)
- sport (e.g., basketball)
- league (e.g., NBA)
- team (string) OR player_name (string)
- opponent (string) if team present
- bet_type (moneyline|spread|total|player_prop|parlay or freeform)
- market (optional)
- line (optional)
- odds (american int)
- sportsbook / book (optional)
- units (number)
- confidence (0-10)
- pick (human readable selection)
- reasoning (optional)
- pass_triggers (optional)
- source (string unique, e.g. discord:<channelId>:<messageId>)
- source_summary (optional)
- created_at (ISO timestamp)

The sync script reads this file and inserts into Supabase `picks`.
