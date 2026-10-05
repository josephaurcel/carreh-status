import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStates } from './incidents.mjs';

const ALL_OK = { carreh_app: 'operational', flight_tracking: 'operational' };
test('one bad check is not an incident; two in a row open one; a good one closes it', () => {
  const history = { days: {}, incidents: [] };
  let prev = { streak: {} };
  const t0 = new Date('2026-10-06T08:00:00Z');
  let r = applyStates({ previous: prev, history, states: { ...ALL_OK, flight_tracking: 'degraded' }, now: t0 });
  assert.equal(r.changes.length, 0, 'a single blip says nothing');
  prev = { streak: r.nextStreak };
  r = applyStates({ previous: prev, history, states: { ...ALL_OK, flight_tracking: 'degraded' }, now: new Date(t0.getTime() + 300000) });
  assert.deepEqual(r.changes.map((c) => [c.id, c.to]), [['flight_tracking', 'degraded']]);
  assert.equal(history.incidents[0].title, 'Flight updates may arrive late');
  prev = { streak: r.nextStreak };
  r = applyStates({ previous: prev, history, states: { ...ALL_OK, flight_tracking: 'outage' }, now: new Date(t0.getTime() + 600000) });
  assert.deepEqual(r.changes.map((c) => [c.id, c.from, c.to]), [['flight_tracking', 'degraded', 'outage']], 'getting worse is told');
  assert.equal(history.incidents.length, 1, 'still one incident');
  prev = { streak: r.nextStreak };
  r = applyStates({ previous: prev, history, states: ALL_OK, now: new Date(t0.getTime() + 900000) });
  assert.deepEqual(r.changes.map((c) => [c.id, c.to]), [['flight_tracking', 'operational']]);
  assert.ok(history.incidents[0].resolved_at, 'resolved');
  assert.match(history.incidents[0].body, /resolved/);
});
