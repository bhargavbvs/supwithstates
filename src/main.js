import { store } from './store.js';
import { onRouteChange } from './router.js';
import { renderHome } from './views/home.js';
import { renderDistrict } from './views/district.js';
import { renderConstituency } from './views/constituency.js';
import { renderStatic } from './views/static.js';
import { renderPromises } from './views/promises.js';

const app = document.getElementById('app');

const views = {
  home: renderHome,
  district: renderDistrict,
  constituency: renderConstituency,
  promises: renderPromises,
  methodology: (el, p) => renderStatic(el, 'methodology'),
  about: (el, p) => renderStatic(el, 'about')
};

async function boot() {
  await store.load();
  document.title = `ssup with ${store.state.name}`;
  document.getElementById('footer').innerHTML =
    `<a href="#/methodology">Methodology</a> · <a href="#/about">About</a>`;

  onRouteChange(({ view, param }) => {
    app.innerHTML = '';
    document.body.dataset.view = views[view] ? view : 'home';
    (views[view] ?? renderHome)(app, param);
    window.scrollTo(0, 0);
  });
}

boot();
