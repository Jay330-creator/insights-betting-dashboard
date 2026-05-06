# Insights Betting — import tools

This folder will hold scripts to backfill Discord messages into Supabase.

## Setup

Create a `.env` with:

- `SUPABASE_URL=https://<project>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=...`

## Import

This importer expects a JSON file of Discord messages shaped like:

```json
[
  {
    "channel_id": "1428018750187376681",
    "message_id": "...",
    "author_id": "...",
    "author_username": "...",
    "sent_at": "2026-03-01T18:00:00Z",
    "content": "..."
  }
]
```

Run:

```bash
node import-discord-to-supabase.mjs ./messages.json
```

The parsing logic is intentionally minimal for the first pass.
We will iterate based on real post formats.
