// The incident rules, kept apart so they can be tested without the network.
export const RANK = { operational: 0, degraded: 1, outage: 2 };
export const TITLES = {
  carreh_app: ['The Carreh app may be slow', 'The Carreh app is not reachable'],
  flight_board: ['Flight Board may be slow', 'Flight Board is not reachable'],
  website: ['carreh.com may be slow', 'carreh.com is not reachable'],
  flight_tracking: ['Flight updates may arrive late', 'Live flight updates are not arriving'],
  notifications: ['Notifications may arrive late', 'Notifications are not being sent'],
  advisor: ['Carreh Advisor may answer slowly', 'Carreh Advisor is not answering'],
  support: ['Support messages may take longer to arrive', 'Support messages are not coming through'],
  esim_store: ['The eSIM store may be slow', 'The eSIM store is not working'],
};

/** One opens after two bad checks in a row (10 minutes); it closes on the first good check.
 *  Mutates history.incidents; returns the changes to tell people about and the new streaks. */
export function applyStates({ previous, history, states, now }) {
  const changes = [];
  const streak = (previous && previous.streak) || {};
  const nextStreak = {};
  for (const id of Object.keys(states)) {
    const st = states[id];
    nextStreak[id] = st === 'operational' ? 0 : (streak[id] || 0) + 1;
    const open = history.incidents.find((x) => !x.resolved_at && x.services.includes(id));
    if (st !== 'operational' && nextStreak[id] >= 2) {
      if (!open) {
        const x = { id: id + '-' + now.toISOString(), services: [id], state: st, title: TITLES[id][st === 'outage' ? 1 : 0],
          body: 'We are looking into it. This page updates every 5 minutes.', started_at: new Date(now.getTime() - 5 * 60000).toISOString(), resolved_at: null };
        history.incidents.push(x);
        changes.push({ id, from: 'operational', to: st, title: x.title });
      } else if (RANK[st] > RANK[open.state]) {
        changes.push({ id, from: open.state, to: st, title: TITLES[id][1] });
        open.state = st; open.title = TITLES[id][1];
      }
    } else if (st === 'operational' && open) {
      open.resolved_at = now.toISOString();
      open.body = 'This was resolved. Everything is working normally again.';
      changes.push({ id, from: open.state, to: 'operational', title: open.title });
    }
  }
  const keepFrom = new Date(now.getTime() - 92 * 86400000).toISOString();
  history.incidents = history.incidents.filter((x) => !x.resolved_at || x.resolved_at >= keepFrom);
  return { changes, nextStreak };
}
