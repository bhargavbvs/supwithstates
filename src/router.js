export function parseRoute(hash) {
  const path = String(hash || '').replace(/^#\/?/, '').replace(/\/$/, '');
  if (!path) return { view: 'home', param: null };

  const [head, param = null] = path.split('/');
  if (head === 'd' && param) return { view: 'district', param };
  if (head === 'c' && param) return { view: 'constituency', param };
  if (head === 'promises') return { view: 'promises', param: null };
  if (head === 'methodology') return { view: 'methodology', param: null };
  if (head === 'about') return { view: 'about', param: null };
  return { view: 'home', param: null };
}

export function onRouteChange(handler) {
  const fire = () => handler(parseRoute(window.location.hash));
  window.addEventListener('hashchange', fire);
  fire();
}
