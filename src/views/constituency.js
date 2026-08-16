import { store } from '../store.js';
import { formatRupees, formatDeclaredCases, escapeHtml } from '../format.js';

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function renderConstituency(el, param) {
  const rec = store.byNumber(param);
  if (!rec) {
    el.innerHTML = `<p class="empty">Constituency not found. <a href="#/">Back to map</a></p>`;
    return;
  }

  const { constituency: ac, representative: rep, result, source } = rec;
  const cases = formatDeclaredCases(rep.declared_cases);
  const districtSlug = store.slugify(ac.district);

  const photo = rep.photo
    ? `<img class="photo" src="${escapeHtml(rep.photo.url)}" alt="${escapeHtml(rep.name)}" />
       <small class="credit">${escapeHtml(rep.photo.credit)} · ${escapeHtml(rep.photo.license)}</small>`
    : `<div class="photo avatar">${escapeHtml(initials(rep.name))}</div>`;

  const defected = rep.party_changed
    ? `<p class="defection">Elected on <b>${escapeHtml(rep.elected_party)}</b>, now <b>${escapeHtml(rep.current_party)}</b>
       (${escapeHtml(rep.party_changed.date)}) — <a href="${escapeHtml(rep.party_changed.source_url)}">source</a></p>`
    : '';

  el.innerHTML = `
    <a class="back" href="#/d/${districtSlug}">← ${escapeHtml(ac.district)}</a>

    <header class="profile-head">
      ${photo}
      <div>
        <h1>${escapeHtml(rep.name)}</h1>
        <p class="sub">${escapeHtml(ac.name)} (AC ${ac.number})${ac.reserved ? ` · ${escapeHtml(ac.reserved)}` : ''}
           · ${escapeHtml(rep.current_party)}${rep.profession ? ` · ${escapeHtml(rep.profession)}` : ''}</p>
      </div>
    </header>
    ${defected}

    <p class="disclaimer">${cases.disclaimer}</p>

    <section>
      <h2>Education</h2>
      <p>${rep.education.level != null ? escapeHtml(rep.education.level) : 'Not declared'}</p>
      ${rep.education.detail ? `<p class="detail">${escapeHtml(rep.education.detail)}</p>` : ''}
    </section>

    <section>
      <h2>Declared criminal cases</h2>
      <p class="big">${cases.headline}</p>
      <ul class="breakdown">
        <li>${cases.serious}</li>
        <li>${cases.convicted}</li>
      </ul>
    </section>

    <section>
      <h2>Declared assets</h2>
      <dl>
        <dt>Movable</dt><dd>${formatRupees(rep.assets.movable)}</dd>
        <dt>Immovable</dt><dd>${formatRupees(rep.assets.immovable)}</dd>
        <dt>Total</dt><dd><b>${formatRupees(rep.assets.total)}</b></dd>
        <dt>Liabilities</dt><dd>${formatRupees(rep.assets.liabilities)}</dd>
      </dl>
    </section>

    <section>
      <h2>2024 result</h2>
      <p>${escapeHtml(result.votes.toLocaleString('en-IN'))} votes ·
         margin ${escapeHtml(result.margin.toLocaleString('en-IN'))}</p>
    </section>

    <section class="sources">
      <h2>Sources</h2>
      <p>All figures self-declared in a sworn affidavit to the Election Commission of India.
         Where ADR and ECI differ, ECI is authoritative.</p>
      <ul>
        <li><a href="${escapeHtml(source.myneta_url)}">Affidavit on MyNeta (ADR)</a></li>
        ${source.eci_url ? `<li><a href="${escapeHtml(source.eci_url)}">ECI affidavit</a></li>` : ''}
      </ul>
      <p class="retrieved">Retrieved ${escapeHtml(source.retrieved)}</p>
      <p class="corrections">Spotted an error?
        <a href="mailto:${escapeHtml(store.state.contact.corrections)}?subject=Correction: ${escapeHtml(ac.name)} (AC ${ac.number})">
        Report a correction</a></p>
    </section>
  `;
}
