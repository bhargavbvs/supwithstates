// The two lists the dropdowns lead to: every member of an assembly, and
// every district in it.
//
// The map answers "who represents this place". These answer the questions
// the map cannot: who holds the most, who has declared the most against
// them, and what the state looks like as a list rather than a shape. Both
// read from the bundle already in memory — no fetch, no new data.
import { store } from '../store.js';
import {
  formatDeclaredCases, formatRupeesCompact, severityOf, partyColor, initials, escapeHtml,
} from '../format.js';

function partyChip(party) {
  if (!party) return '';
  const { bg, text } = partyColor(party);
  return `<span class="party-chip small" style="background:${bg};color:${text}">${escapeHtml(party)}</span>`;
}

function thumb(rep) {
  return rep.photo
    ? `<img class="ac-thumb" src="${escapeHtml(rep.photo.url)}" alt="" loading="lazy" />`
    : `<div class="ac-thumb avatar">${escapeHtml(initials(rep.name))}</div>`;
}

// Sorting a member to the top for having declared the most is a claim
// about the declaration, never about the person, so every ordering here
// is named for the thing declared.
const SORTS = {
  seat: { label: 'Constituency', by: (c) => c.constituency.number },
  name: { label: 'Name', by: (c) => c.representative.name.toLowerCase() },
  cases: { label: 'Declared cases', by: (c) => -(c.representative.declared_cases.total ?? 0) },
  assets: { label: 'Declared assets', by: (c) => -(c.representative.assets.total ?? 0) },
};

export function renderRoster(el, sortKey = 'seat') {
  const sort = SORTS[sortKey] ? sortKey : 'seat';
  const rows = [...store.all].sort((a, b) => {
    const av = SORTS[sort].by(a);
    const bv = SORTS[sort].by(b);
    return av < bv ? -1 : av > bv ? 1 : a.constituency.number - b.constituency.number;
  });

  const tabs = Object.entries(SORTS).map(([key, { label }]) =>
    `<a href="${store.href(`mlas/${key}`)}" class="sort-tab${key === sort ? ' on' : ''}"
        ${key === sort ? 'aria-current="true"' : ''}>${escapeHtml(label)}</a>`).join('');

  el.innerHTML = `
    <a class="back" href="${store.href()}">← Map</a>
    <h1>${escapeHtml(store.state.name)}'s MLAs</h1>
    <p class="sub">${rows.length} of ${store.state.assembly_size} seats · sorted by ${escapeHtml(SORTS[sort].label.toLowerCase())}</p>
    <nav class="sort-tabs" aria-label="Sort by">${tabs}</nav>
    <ul class="ac-list">
      ${rows.map((c) => {
    const rep = c.representative;
    const cases = formatDeclaredCases(rep.declared_cases);
    const sev = severityOf(rep.declared_cases);
    const assets = rep.assets.total == null ? '' : formatRupeesCompact(rep.assets.total);
    return `
        <li>
          <a href="${store.href(`c/${c.constituency.number}`)}">
            ${thumb(rep)}
            <span class="sev-dot sev-${sev}"></span>
            <span class="ac-info">
              <b>${escapeHtml(c.constituency.name)}</b>
              <span>${escapeHtml(rep.name)} ${partyChip(rep.current_party)}</span>
              <small>${cases.headline}${assets ? ` · ${escapeHtml(assets)} declared` : ''}</small>
            </span>
          </a>
        </li>`;
  }).join('')}
    </ul>`;
}

export function renderDistricts(el) {
  const byName = new Map();
  for (const c of store.all) {
    const name = c.constituency.district;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(c);
  }
  const districts = [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  el.innerHTML = `
    <a class="back" href="${store.href()}">← Map</a>
    <h1>Districts of ${escapeHtml(store.state.name)}</h1>
    <p class="sub">${districts.length} districts · ${store.all.length} constituencies</p>
    <ul class="district-index">
      ${districts.map(([name, list]) => {
    const flagged = list.filter((c) => severityOf(c.representative.declared_cases) >= 2).length;
    return `
        <li>
          <a href="${store.href(`d/${store.slugify(name)}`)}">
            <b>${escapeHtml(name)}</b>
            <small>${list.length} ${list.length === 1 ? 'constituency' : 'constituencies'}${
  flagged ? ` · ${flagged} with a serious case declared` : ''}</small>
          </a>
        </li>`;
  }).join('')}
    </ul>`;
}
