import fs from 'node:fs/promises';
import path from 'node:path';
import { DateTime } from 'luxon';

const QUEUE_PATH =
  process.env.PICKS_QUEUE_PATH || '/Users/Sean/.openclaw/workspace/bets/picks_to_sync.jsonl';

// Default is the UUID for cron job "daily-bet-1pm-et" because Stage 2 (sync-costs-to-supabase.mjs)
// reads ~/.openclaw/cron/runs/<job_id>.jsonl and OpenClaw stores those files keyed by UUID, not slug.
const GENERATION_JOB_ID =
  process.env.GENERATION_JOB_ID || '5749d01e-a101-4d77-b67e-4ada72ad058d';
const ZONE = process.env.GENERATION_ZONE || 'America/New_York';
const HOUR = Number(process.env.GENERATION_HOUR || 13);
const GENERATION_RUN_AT_MS_OVERRIDE =
  process.env.GENERATION_RUN_AT_MS_OVERRIDE != null && String(process.env.GENERATION_RUN_AT_MS_OVERRIDE).trim() !== ''
    ? Number(process.env.GENERATION_RUN_AT_MS_OVERRIDE)
    : null;

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function toJsonl(rows) {
  return rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');
}

async function atomicWrite(filePath, content) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmpPath, content, 'utf8');
  await fs.rename(tmpPath, filePath);
}

function compute1pmEtMsForDate(pickDateString) {
  if (!pickDateString || typeof pickDateString !== 'string') return null;

  // pickDateString is expected like "2026-04-30" (ISO date). Interpret in the configured zone.
  const dt = DateTime.fromISO(pickDateString, { zone: ZONE });
  if (!dt.isValid) return null;

  const runAt = dt.set({ hour: HOUR, minute: 0, second: 0, millisecond: 0 });
  return runAt.toMillis();
}

async function main() {
  if (GENERATION_RUN_AT_MS_OVERRIDE !== null && !Number.isFinite(GENERATION_RUN_AT_MS_OVERRIDE)) {
    throw new Error(
      `Invalid env GENERATION_RUN_AT_MS_OVERRIDE=${JSON.stringify(process.env.GENERATION_RUN_AT_MS_OVERRIDE)}`
    );
  }

  let raw;
  try {
    raw = await fs.readFile(QUEUE_PATH, 'utf8');
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      console.log(`enrich: queue_not_found path=${QUEUE_PATH}`);
      return;
    }
    throw e;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    console.log(`enrich: queue_empty path=${QUEUE_PATH}`);
    return;
  }

  const items = parseJsonl(raw);

  const datesSeen = {};
  let enriched = 0;
  let already = 0;
  let skippedNoDate = 0;
  let updatedAny = 0;

  for (const it of items) {
    let changed = false;

    if (!it.generation_job_id) {
      it.generation_job_id = GENERATION_JOB_ID;
      changed = true;
    }

    const pickDate = typeof it.pick_date === 'string' ? it.pick_date : null;
    if (pickDate) {
      datesSeen[pickDate] = (datesSeen[pickDate] || 0) + 1;
    }

    if (it.generation_run_at_ms) {
      already++;
    } else {
      const runAtMs =
        GENERATION_RUN_AT_MS_OVERRIDE !== null
          ? GENERATION_RUN_AT_MS_OVERRIDE
          : compute1pmEtMsForDate(pickDate);

      if (!Number.isFinite(runAtMs)) {
        skippedNoDate++;
        console.warn(
          `enrich: skipped_no_date source=${it.source || '(unknown)'} pick_date=${pickDate || '(missing)'}`
        );
      } else {
        it.generation_run_at_ms = runAtMs;
        enriched++;
        changed = true;
      }
    }

    if (changed) updatedAny++;
  }

  if (updatedAny) {
    await atomicWrite(QUEUE_PATH, toJsonl(items));
  }

  console.log(
    `enrich: path=${QUEUE_PATH} total=${items.length} enriched=${enriched} already=${already} skipped_no_date=${skippedNoDate}`
  );
  console.log(`enrich: dates_seen=${JSON.stringify(datesSeen)}`);

  if (GENERATION_RUN_AT_MS_OVERRIDE !== null) {
    const iso = DateTime.fromMillis(GENERATION_RUN_AT_MS_OVERRIDE, { zone: ZONE }).toISO();
    console.log(
      `enrich: generation_job_id=${GENERATION_JOB_ID} generation_run_at_ms_override=${GENERATION_RUN_AT_MS_OVERRIDE} generation_run_at_iso=${iso}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
