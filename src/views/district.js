import { store } from '../store.js';
import { formatDeclaredCases } from '../format.js';

export function renderDistrict(el, slug) {
  const list = store.byDistrict(slug);

  if (!list.length) {
    el.innerHTML = `<p class="empty">No constituencies found. <a href="#/">Back to map</a></p>`;
    return;
  }

  const districtName = list[0].constituency.district;

  el.innerHTML = `
    <a class="back" href="#/">← All districts</a>
    <h1>${districtName}</h1>
    <p class="sub">${list.length} constituencies</p>
    <ul class="ac-list">
      ${list.map((c) => {
        const cases = formatDeclaredCases(c.representative.declared_cases);
        return `
          <li>
            <a href="#/c/${c.constituency.number}">
              <b>${c.constituency.name}</b>
              <span>${c.representative.name} · ${c.representative.current_party}</span>
              <small>${cases.headline}</small>
            </a>
          </li>`;
      }).join('')}
    </ul>
  `;
}
