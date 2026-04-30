import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

async function sbDeleteBySourcePrefix(prefix) {
  // Delete rows where source_summary LIKE `${prefix}%`
  const res = await fetch(`${REST}/picks?source_summary=like.${encodeURIComponent(prefix + '%')}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation',
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Delete failed: ${res.status} ${text}`);
  const deleted = text ? JSON.parse(text) : [];
  console.log(`Deleted picks=${deleted.length}`);
}

await sbDeleteBySourcePrefix('DM message ');
