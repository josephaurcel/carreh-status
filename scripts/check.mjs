// Carreh status checker. Runs every 5 minutes on GitHub's servers, outside Carreh's own
// infrastructure, so it keeps working when Netlify does not.
//
//   node scripts/check.mjs <data-dir>
//
// Reads and writes <data-dir>/status.json and <data-dir>/history.json (the status-data branch),
// then emails the founder and support when a service changes state (RESEND_API_KEY, optional).
// Without that key, a new outage fails the run so GitHub emails the repository owner instead.
// It only ever READS Carreh: two public pages, the health probe, and one public summary.
import fs from 'node:fs';
import path from 'node:path';
import { applyStates, TITLES, RANK } from './incidents.mjs';

const DATA = process.argv[2] || 'data';
const SUPABASE = 'https://kujufeuceyrhgfwyonsl.supabase.co';
// The public (anon) key: it ships in every Carreh app and web page, and can only call public functions.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1anVmZXVjZXlyaGdmd3lvbnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzMxOTIsImV4cCI6MjA4ODQwOTE5Mn0.ipkHVasACY2rErJxSaXFxdEdkdTMhqzdT2bK3bhlsl4';
const SERVICES = ['carreh_app', 'flight_board', 'website', 'flight_tracking', 'notifications', 'advisor', 'support', 'esim_store'];
const NAMES = {
  carreh_app: 'The Carreh app', flight_board: 'Flight Board', website: 'carreh.com', flight_tracking: 'Live flight tracking',
  notifications: 'Notifications', advisor: 'Carreh Advisor', support: 'Support', esim_store: 'The eSIM store',
};

const worst = (...s) => s.filter(Boolean).reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'operational');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return fallback; } };
const writeJson = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 1) + '\n');

async function get(url, { expect, json = false, method = 'GET', headers = {}, body } = {}) {
  let last = { ok: false, error: 'not tried' };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12000);
    try {
      const r = await fetch(url, { method, body, signal: ac.signal, headers: Object.assign({ 'user-agent': 'CarrehStatus/1.0 (+https://status.carreh.com)' }, headers) });
      const text = await r.text();
      clearTimeout(timer);
      const parsed = json ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
      last = { ok: r.ok && (!expect || text.includes(expect)) && (!json || parsed != null), status: r.status, json: parsed };
      if (last.ok) return last;
    } catch (e) {
      clearTimeout(timer);
      last = { ok: false, error: String(e && e.message || e) };
    }
    if (attempt === 1) await sleep(4000);
  }
  return last;
}

async function check(previous) {
  const [site, fbSite, health, summary] = await Promise.all([
    get('https://carreh.com/', { expect: 'Carreh' }),
    get('https://flightboard.carreh.com/', { expect: 'Flight Board' }),
    get('https://carreh.com/.netlify/functions/health', { json: true }),
    get(`${SUPABASE}/rest/v1/rpc/carreh_public_status`, { json: true, method: 'POST', body: '{}',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' } }),
  ]);
  const serverUp = health.ok && health.json && health.json.ok === true && health.json.database === 'up';
  const s = {};
  s.website = site.ok ? 'operational' : 'outage';
  s.carreh_app = serverUp ? 'operational' : 'outage';
  s.flight_board = serverUp ? (fbSite.ok ? 'operational' : 'degraded') : 'outage';
  const inner = (summary.ok && summary.json && summary.json.services) || null;
  for (const id of ['flight_tracking', 'notifications', 'advisor', 'support', 'esim_store']) {
    if (inner && inner[id] && RANK[inner[id].state] != null) s[id] = inner[id].state;
    else if (!serverUp) s[id] = 'outage';
    else s[id] = (previous.services && previous.services[id] && previous.services[id].state) || 'operational';
  }
  // Every service needs Carreh's servers; when they are down, nothing behind them works either.
  if (!serverUp) for (const id of ['flight_tracking', 'notifications', 'advisor', 'support', 'esim_store']) s[id] = worst(s[id], 'outage');
  return s;
}

async function email(subject, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const to = (process.env.ALERT_TO || 'josephaurcel@gmail.com,support@carreh.com').split(',').map((x) => x.trim()).filter(Boolean);
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Carreh Status <status@carreh.com>', to, subject, text }),
  }).catch(() => null);
  return !!(r && r.ok);
}

const now = new Date();
const today = now.toISOString().slice(0, 10);
const previous = readJson('status.json', { services: {} });
const history = readJson('history.json', { days: {}, incidents: [] });
const states = await check(previous);

// Daily counts, 90 days kept.
const cutoff = new Date(now.getTime() - 92 * 86400000).toISOString().slice(0, 10);
for (const id of SERVICES) {
  const days = (history.days[id] = history.days[id] || {});
  const c = (days[today] = days[today] || { ok: 0, degraded: 0, outage: 0 });
  c[states[id] === 'operational' ? 'ok' : states[id]] += 1;
  for (const k of Object.keys(days)) if (k < cutoff) delete days[k];
}

const { changes, nextStreak } = applyStates({ previous, history, states, now });

writeJson('status.json', {
  checked_at: now.toISOString(),
  services: Object.fromEntries(SERVICES.map((id) => [id, { state: states[id] }])),
  streak: nextStreak,
});
writeJson('history.json', history);

// Tell people only about real changes.
let alerted = true;
if (changes.length) {
  const down = changes.filter((c) => c.to !== 'operational');
  const subject = down.length
    ? 'Carreh status: ' + down.map((c) => NAMES[c.id] + (c.to === 'outage' ? ' is down' : ' is slow')).join(', ')
    : 'Carreh status: ' + changes.map((c) => NAMES[c.id]).join(', ') + ' working normally again';
  const text = changes.map((c) => `${NAMES[c.id]}: ${c.from} -> ${c.to}. ${c.title}.`).join('\n')
    + '\n\nChecked from GitHub at ' + now.toISOString() + '. Live page: https://status.carreh.com';
  alerted = await email(subject, text);
  console.log(subject, '| emailed:', alerted);
}
console.log(JSON.stringify(states));
// No email key and something just went down: fail this run so GitHub emails the owner.
if (!alerted && changes.some((c) => c.to === 'outage')) process.exitCode = 1;
