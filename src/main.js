import { store } from './store.js';
import { parseRoute, onRouteChange } from './router.js';
import { renderHome } from './views/home.js';
import { renderDistrict } from './views/district.js';
import { renderConstituency } from './views/constituency.js';
import { renderStatic } from './views/static.js';
import { renderPromises } from './views/promises.js';
import { renderMps } from './views/mps.js';
import { escapeHtml } from './format.js';

const app = document.getElementById('app');

const views = {
  home: renderHome,
  district: renderDistrict,
  constituency: renderConstituency,
  mps: renderMps,
  promises: renderPromises,
  methodology: (el) => renderStatic(el, 'methodology'),
  about: (el) => renderStatic(el, 'about'),
};

/** The header, repainted per state: its name is in the wordmark, and the
 *  switcher sits at the right where a reader looks for one. */
function paintChrome(view) {
  const options = store.states.map((s) => `<option value="${escapeHtml(s.slug)}"${
    s.slug === store.slug ? ' selected' : ''}>${escapeHtml(s.name)}</option>`).join('');

  document.getElementById('site-header').innerHTML = `
    <a href="${store.href()}" class="logo">ssup with ${escapeHtml(store.state.name)}</a>
    <nav>
      <a href="${store.href()}"${view === 'home' ? ' aria-current="page"' : ''}>MLAs</a>
      <a href="${store.href('mps')}"${view === 'mps' ? ' aria-current="page"' : ''}>MPs</a>
      ${store.promiseSets.length
    ? `<a href="${store.href('promises')}"${view === 'promises' ? ' aria-current="page"' : ''}>Govt Tracker</a>`
    : ''}
      <label class="state-switch">
        <span class="sr-only">State</span>
        <select id="state-select" aria-label="Choose a state">${options}</select>
      </label>
    </nav>`;

  // A state is a different map, a different assembly and different
  // members, so switching goes to that state's map rather than trying to
  // hold a place that does not exist there.
  document.getElementById('state-select').addEventListener('change', (e) => {
    window.location.hash = `#/${e.target.value}`;
  });

  document.getElementById('footer').innerHTML =
    `<a href="${store.href('methodology')}">Methodology</a> · <a href="${store.href('about')}">About</a>`;
}

async function boot() {
  await store.loadStates();
  const known = store.states.map((s) => s.slug);

  onRouteChange(async (hash) => {
    const route = parseRoute(hash, known);

    // An address that does not name a state gets one — the reader's last,
    // or the first we hold — and is rewritten so it can be shared.
    if (!route.state) {
      const rest = String(hash || '').replace(/^#\/?/, '');
      window.location.replace(`#/${store.preferred()}${rest ? `/${rest}` : ''}`);
      return;
    }

    await store.load(route.state);
    store.remember(route.state);

    const view = views[route.view] ? route.view : 'home';
    document.title = `ssup with ${store.state.name}`;
    paintChrome(view);
    app.innerHTML = '';
    document.body.dataset.view = view;
    (views[view] ?? renderHome)(app, route.param);
    window.scrollTo(0, 0);
  });
}

boot();
