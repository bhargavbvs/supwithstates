import { store } from '../store.js';
import { formatDeclaredCases, severityOf, partyColor, initials, escapeHtml } from '../format.js';

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

export function renderDistrict(el, slug) {
  const list = store.byDistrict(slug);

  if (!list.length) {
    el.innerHTML = `<p class="empty">No constituencies found. <a href="#/">Back to map</a></p>`;
    return;
  }

  const districtName = list[0].constituency.district;

  el.innerHTML = `
    <a class="back" href="#/">← Map</a>
    <h1>${escapeHtml(districtName)}</h1>
    <p class="sub">${list.length} constituencies</p>
    <ul class="ac-list">
      ${list.map((c) => {
        const cases = formatDeclaredCases(c.representative.declared_cases);
        const sev = severityOf(c.representative.declared_cases);
        return `
          <li>
            <a href="#/c/${c.constituency.number}">
              ${thumb(c.representative)}
              <span class="sev-dot sev-${sev}"></span>
              <span class="ac-info">
                <b>${escapeHtml(c.constituency.name)}</b>
                <span>${escapeHtml(c.representative.name)} ${partyChip(c.representative.current_party)}</span>
                <small>${cases.headline}</small>
              </span>
            </a>
          </li>`;
      }).join('')}
    </ul>
  `;
}
