// #/<state>/<view>/<param>
//
// The state leads because it decides everything after it: the map, the
// members, the promises. An address without one is not an error — the app
// fills in the reader's own state and rewrites it, so a link from before
// there was more than one state still opens.
export function parseRoute(hash, known = []) {
  const path = String(hash || '').replace(/^#\/?/, '').replace(/\/$/, '');
  const parts = path.split('/').filter(Boolean);

  const state = known.includes(parts[0]) ? parts.shift() : null;
  const [head, param = null] = parts;

  if (!head) return { state, view: 'home', param: null };
  if (head === 'd' && param) return { state, view: 'district', param };
  if (head === 'c' && param) return { state, view: 'constituency', param };
  if (head === 'mps') return { state, view: 'mps', param: param ?? null };
  if (head === 'promises') return { state, view: 'promises', param: null };
  if (head === 'methodology') return { state, view: 'methodology', param: null };
  if (head === 'about') return { state, view: 'about', param: null };
  return { state, view: 'home', param: null };
}

export function onRouteChange(handler) {
  const fire = () => handler(window.location.hash);
  window.addEventListener('hashchange', fire);
  fire();
}
