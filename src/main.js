import { store } from './store.js';
import { parseRoute, onRouteChange } from './router.js';
import { renderHome } from './views/home.js';
import { renderDistrict } from './views/district.js';
import { renderConstituency } from './views/constituency.js';
import { renderStatic } from './views/static.js';
import { renderPromises } from './views/promises.js';
import { renderMps } from './views/mps.js';
import { renderRoster, renderDistricts } from './views/roster.js';
import { escapeHtml } from './format.js';

const app = document.getElementById('app');

const views = {
  home: renderHome,
  district: renderDistrict,
  constituency: renderConstituency,
  mps: renderMps,
  roster: renderRoster,
  districts: renderDistricts,
  promises: renderPromises,
  methodology: (el) => renderStatic(el, 'methodology'),
  about: (el) => renderStatic(el, 'about'),
};

/** The header, repainted per state: its name is in the wordmark, and the
 *  switcher sits at the right where a reader looks for one.
 *
 *  The two flat links became menus because the site outgrew them. A
 *  constituency map is one way into an assembly and not the only one —
 *  the same members sorted by what they declared, or their districts as a
 *  list, answer questions the map cannot — and there is no room for six
 *  top-level links on a phone.
 */
function paintChrome(view) {
  const options = store.states.map((s) => `<option value="${escapeHtml(s.slug)}"${
    s.slug === store.slug ? ' selected' : ''}>${escapeHtml(s.name)}</option>`).join('');

  // Each menu is [label, [[href, text, viewsThatCount AsCurrent], …]].
  // A destination is listed only where it exists: a state with no promise
  // sets gets no Govt Tracker line rather than a link to an empty page.
  const menus = [
    ['MLAs', [
      [store.href(), 'Map', ['home']],
      [store.href('mlas'), 'All MLAs', ['roster']],
      [store.href('districts'), 'Districts', ['districts', 'district']],
    ]],
    ['MPs', [
      [store.href('mps'), `${store.state.name} in the Lok Sabha`, ['mps']],
    ]],
    ['More', [
      ...(store.promiseSets.length ? [[store.href('promises'), 'Govt Tracker', ['promises']]] : []),
      [store.href('methodology'), 'Methodology', ['methodology']],
      [store.href('about'), 'About', ['about']],
    ]],
  ];

  const markup = menus.map(([label, items], i) => {
    const active = items.some(([, , views]) => views.includes(view));
    return `
      <div class="menu">
        <button type="button" class="menu-btn${active ? ' on' : ''}" aria-expanded="false"
                aria-haspopup="true" aria-controls="menu-${i}">${escapeHtml(label)}</button>
        <div class="menu-list" id="menu-${i}" role="menu" hidden>
          ${items.map(([href, text, views]) => `<a role="menuitem" href="${href}"${
  views.includes(view) ? ' aria-current="page"' : ''}>${escapeHtml(text)}</a>`).join('')}
        </div>
      </div>`;
  }).join('');

  document.getElementById('site-header').innerHTML = `
    <a href="${store.href()}" class="logo">ssup with ${escapeHtml(store.state.name)}</a>
    <nav>
      ${markup}
      <label class="state-switch">
        <span class="sr-only">State</span>
        <select id="state-select" aria-label="Choose a state">${options}</select>
      </label>
    </nav>`;

  // One menu open at a time, and closed by anything that means "not this":
  // a click elsewhere, Escape, or following a link. Without the last one a
  // menu stays open over the page it just navigated to.
  const header = document.getElementById('site-header');
  const closeAll = () => header.querySelectorAll('.menu-btn').forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
    document.getElementById(b.getAttribute('aria-controls')).hidden = true;
  });
  header.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const list = document.getElementById(btn.getAttribute('aria-controls'));
      const wasOpen = btn.getAttribute('aria-expanded') === 'true';
      closeAll();
      if (!wasOpen) { btn.setAttribute('aria-expanded', 'true'); list.hidden = false; }
    });
  });
  header.querySelectorAll('.menu-list a').forEach((a) => a.addEventListener('click', closeAll));
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

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
