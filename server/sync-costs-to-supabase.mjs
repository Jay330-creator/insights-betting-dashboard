import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { PRICING_VERSION, calculateCost } from './pricing.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

const RUNS_DIR = process.env.CRON_RUNS_DIR || path.join(os.homedir(), '.openclaw', 'cron', 'runs');

const COST_KIND = 'generation';
const MATCH_TOLERANCE_MS = Number(process.env.MATCH_TOLERANCE_MS || 60_000);
const TOO_FAR_MS = Number(process.env.TOO_FAR_MS || 6 * 60 * 60 * 1000);

async function sbSelect(url) {
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase select failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

async function sbInsert(table, rows, { onConflict } = {}) {
  if (!rows.length) return [];
  const url = onConflict ? `${REST}/${table}?on_conflict=${encodeURIComponent(onConflict)}` : `${REST}/${table}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: onConflict ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
    },
    body: JSON.stringify(rows),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase insert ${table} failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

async function sbInsertIdempotent(table, rows, { onConflict, ignoreDuplicates = false } = {}) {
  if (!rows.length) return [];
  const url = onConflict ? `${REST}/${table}?on_conflict=${encodeURIComponent(onConflict)}` : `${REST}/${table}`;

  const prefer = onConflict
    ? ignoreDuplicates
      ? 'resolution=ignore-duplicates,return=representation'
      : 'resolution=merge-duplicates,return=representation'
    : 'return=representation';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: JSON.stringify(rows),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase insert ${table} failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function getUsage(entry) {
  const u = entry.usage || entry.tokenUsage || entry.usageSummary || {};

  const promptTokens = Number(
    u.promptTokens ?? u.prompt_tokens ?? u.inputTokens ?? u.input_tokens ?? u.input_tokens ?? u.input ?? u.prompt ?? 0
  );
  const completionTokens = Number(
    u.completionTokens ?? u.completion_tokens ?? u.outputTokens ?? u.output_tokens ?? u.output_tokens ?? u.output ?? u.completion ?? 0
  );
  const cachedTokens = Number(
    u.cachedTokens ??
      u.cached_tokens ??
      u.cachedPromptTokens ??
      u.cached_prompt_tokens ??
      u.cached_input_tokens ??
      u.cachedInputTokens ??
      0
  );

  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    cachedTokens: Number.isFinite(cachedTokens) ? cachedTokens : 0,
    raw: u,
  };
}

function getModel(entry) {
  if (!entry || typeof entry !== 'object') return null;

  // Most common (OpenClaw cron run logs)
  const direct = entry.model;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  // Other possible flat fields
  const candidates = [
    entry.modelId,
    entry.model_id,
    entry.modelName,
    entry.model_name,
    entry.providerModel,
    entry.provider_model,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }

  // Possible nested locations (defensive)
  const nested = [
    entry.usage?.model,
    entry.context?.model,
    entry.payload?.model,
    entry.result?.model,
    entry.error?.model,
  ];
  for (const n of nested) {
    if (typeof n === 'string' && n.trim()) return n.trim();
  }

  return null;
}

function getSessionKey(entry) {
  return String(entry.sessionKey ?? entry.session_key ?? entry.session ?? '').trim();
}

function getProvider(entry) {
  return String(entry.provider ?? entry.providerId ?? entry.provider_id ?? '').trim();
}

function getRunAtMs(entry) {
  const v = entry.runAtMs ?? entry.run_at_ms ?? entry.runAt ?? entry.run_at;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function splitEven(total, n) {
  const T = Math.max(0, Number(total || 0));
  if (!Number.isFinite(T) || n <= 0) return Array.from({ length: n }, () => 0);

  const base = Math.floor(T / n);
  let rem = T - base * n;

  const parts = Array.from({ length: n }, () => base);
  for (let i = 0; i < parts.length && rem > 0; i++) {
    parts[i] += 1;
    rem -= 1;
  }
  return parts;
}

async function loadRunLog(jobId) {
  const logPath = path.join(RUNS_DIR, `${jobId}.jsonl`);
  const raw = await fs.readFile(logPath, 'utf8');
  return { logPath, entries: parseJsonl(raw) };
}

function pickClosestRun(entries, targetRunAtMs) {
  let best = null;
  for (const e of entries) {
    const ms = getRunAtMs(e);
    if (ms === null) continue;

    // Skip error/incomplete entries.
    if (e.status === 'error') continue;
    if (e.action !== 'finished') continue;
    if (!e.usage || typeof e.usage !== 'object') continue;
    if (!("input_tokens" in e.usage)) continue;
    if (Number(e.usage.input_tokens) <= 0) continue;

    const diff = Math.abs(ms - targetRunAtMs);
    if (!best || diff < best.diffMs) best = { entry: e, runAtMs: ms, diffMs: diff };
  }
  return best;
}

async function main() {
  // 1) Load candidate picks (stamped with generation fields)
  const picks = await sbSelect(
    `${REST}/picks?select=id,source,generation_job_id,generation_run_at_ms&generation_run_at_ms=not.is.null&generation_job_id=not.is.null&limit=2000`
  );

  if (!picks.length) {
    console.log('cost-sync: no_stamped_picks');
    return;
  }

  // 2) Load existing generation costs for those picks
  const ids = picks.map((p) => p.id).filter(Boolean);
  const existingCosts = ids.length
    ? await sbSelect(
        `${REST}/pick_costs?select=pick_id,cost_kind&cost_kind=eq.${encodeURIComponent(COST_KIND)}&pick_id=in.(${ids
          .map((id) => `\"${id}\"`)
          .join(',')})&limit=2000`
      )
    : [];

  const alreadyCosted = new Set(existingCosts.map((c) => String(c.pick_id)));
  const missing = picks.filter((p) => !alreadyCosted.has(String(p.id)));

  if (!missing.length) {
    console.log('cost-sync: nothing_to_do');
    return;
  }

  // 3) Group by (generation_job_id, generation_run_at_ms)
  const groups = new Map();
  for (const p of missing) {
    const jobId = String(p.generation_job_id || '').trim();
    const runAtMs = Number(p.generation_run_at_ms);
    if (!jobId || !Number.isFinite(runAtMs)) continue;

    const key = `${jobId}__${runAtMs}`;
    const arr = groups.get(key) || [];
    arr.push(p);
    groups.set(key, arr);
  }

  let insertedRuns = 0;
  let insertedCosts = 0;
  let skippedGroups = 0;

  for (const [key, groupPicks] of groups.entries()) {
    const [jobId, runAtMsStr] = key.split('__');
    const targetRunAtMs = Number(runAtMsStr);

    let log;
    try {
      log = await loadRunLog(jobId);
    } catch (e) {
      console.warn(`cost-sync: missing_run_log job_id=${jobId} err=${e?.message || e}`);
      skippedGroups++;
      continue;
    }

    const closest = pickClosestRun(log.entries, targetRunAtMs);
    if (!closest) {
      console.warn(`cost-sync: no_runnable_entries job_id=${jobId} path=${log.logPath}`);
      skippedGroups++;
      continue;
    }

    if (closest.diffMs > MATCH_TOLERANCE_MS) {
      const why = closest.diffMs > TOO_FAR_MS ? 'too_far' : 'outside_tolerance';
      console.warn(
        `cost-sync: no_match_${why} job_id=${jobId} target_run_at_ms=${targetRunAtMs} closest_run_at_ms=${closest.runAtMs} diff_ms=${closest.diffMs}`
      );
      skippedGroups++;
      continue;
    }

    const entry = closest.entry;
    const sessionKey = getSessionKey(entry);
    const model = getModel(entry);
    const provider = getProvider(entry) || 'openai';
    const usage = getUsage(entry);

    if (!sessionKey) {
      console.warn(
        `cost-sync: missing_session_key job_id=${jobId} target_run_at_ms=${targetRunAtMs} closest_run_at_ms=${closest.runAtMs}`
      );
      skippedGroups++;
      continue;
    }

    const totalTokens = usage.promptTokens + usage.completionTokens;
    const totalCostUsd = calculateCost(model, usage.promptTokens, usage.completionTokens, usage.cachedTokens);

    // Ensure a generation_runs row exists for this session_key.
    // NOTE: We intentionally avoid PostgREST upsert (on_conflict=session_key) unless the DB enforces
    // a UNIQUE constraint on session_key. Without that constraint, Postgres errors (42P10).
    const runRow = {
      session_key: sessionKey,
      run_at: new Date(closest.runAtMs).toISOString(),
      model,
      provider,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: totalTokens,
      cost_usd: totalCostUsd,
      pricing_version: PRICING_VERSION,
      context: {
        job_id: jobId,
        cached_tokens: usage.cachedTokens,
        matched_run_at_ms: closest.runAtMs,
        target_run_at_ms: targetRunAtMs,
        match_diff_ms: closest.diffMs,
        session_id: entry.sessionId || null,
      },
    };

    let generationRunId = null;

    const existingRuns = await sbSelect(
      `${REST}/generation_runs?select=id&session_key=eq.${encodeURIComponent(sessionKey)}&limit=1`
    );
    generationRunId = existingRuns?.[0]?.id || null;

    if (!generationRunId) {
      const insertedRunsRows = await sbInsert('generation_runs', [runRow]);
      generationRunId = insertedRunsRows?.[0]?.id || null;
    }

    if (!generationRunId) {
      console.warn(
        `cost-sync: missing_generation_run_id job_id=${jobId} target_run_at_ms=${targetRunAtMs} closest_run_at_ms=${closest.runAtMs}`
      );
      skippedGroups++;
      continue;
    }

    insertedRuns++;

    // Split tokens/cost evenly across picks in this group
    const n = groupPicks.length;
    const promptParts = splitEven(usage.promptTokens, n);
    const completionParts = splitEven(usage.completionTokens, n);
    const cachedParts = splitEven(usage.cachedTokens, n);

    const costRows = groupPicks.map((p, idx) => {
      const pt = promptParts[idx];
      const ct = completionParts[idx];
      const cat = cachedParts[idx];

      return {
        pick_id: p.id,
        generation_run_id: generationRunId,
        cost_kind: COST_KIND,
        model,
        provider,
        prompt_tokens: pt,
        completion_tokens: ct,
        total_tokens: pt + ct,
        cost_usd: calculateCost(model, pt, ct, cat),
        pricing_version: PRICING_VERSION,
      };
    });

    try {
      const inserted = await sbInsertIdempotent('pick_costs', costRows, {
        onConflict: 'pick_id,cost_kind',
        ignoreDuplicates: true,
      });
      insertedCosts += inserted.length;
    } catch (e) {
      console.warn(`cost-sync: pick_costs_insert_failed group=${key} err=${e?.message || e}`);
      skippedGroups++;
    }
  }

  console.log(
    `cost-sync: stamped_picks=${picks.length} missing_costs=${missing.length} groups=${groups.size} inserted_runs=${insertedRuns} inserted_costs=${insertedCosts} skipped_groups=${skippedGroups}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
