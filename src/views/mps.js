import { store } from '../store.js';
import { formatDeclaredCases, severityOf, initials, escapeHtml } from '../format.js';
import {
  profileHead, severityBadge, casesSection, assetsSection, educationSection, partyChip,
} from './profile.js';

/** One member of parliament, in full.
 *
 *  The same fields as a member of the assembly and from the same
 *  affidavits — a reader should not have to learn a second page to read
 *  about the other house. */
function profile(rec) {
  const { constituency: pc, representative: rep } = rec;
  const seatLine = `${escapeHtml(pc.name)} (PC ${pc.number})`
    + `${pc.reserved ? ` · ${escapeHtml(pc.reserved)}` : ''}`
    + `${rep.profession ? ` · ${escapeHtml(rep.profession)}` : ''}`;

  return `
    <a class="back" href="${store.href('mps')}">← All MPs</a>
    ${profileHead(rep, seatLine)}
    ${severityBadge(rep)}
    <p class="disclaimer">${formatDeclaredCases(rep.declared_cases).disclaimer}</p>
    ${casesSection(rep)}
    ${assetsSection(rep)}
    ${educationSection(rep)}

    <section>
      <h2>Assembly segments</h2>
      <p class="sub">The ${escapeHtml(pc.assembly_segments.length)} assembly constituencies inside this seat.</p>
      <ul class="seg-list">${(pc.assembly_segments ?? []).map((name) => {
    const ac = store.all.find((c) => c.constituency.name === name);
    return ac
      ? `<li><a href="${store.href(`c/${ac.constituency.number}`)}">${escapeHtml(name)}</a></li>`
      : `<li>${escapeHtml(name)}</li>`;
  }).join('')}</ul>
    </section>

    <section class="sources">
      <h2>Sources</h2>
      <p>All figures self-declared in a sworn affidavit to the Election Commission of India.
         Where ADR and ECI differ, ECI is authoritative.</p>
      <ul><li><a href="${escapeHtml(rec.source.myneta_url)}">Affidavit on MyNeta (ADR)</a></li></ul>
      <p class="retrieved">Retrieved ${escapeHtml(rec.source.retrieved)}</p>
    </section>`;
}

export function renderMps(el, param) {
  const mps = store.mps;

  if (!mps.length) {
    el.innerHTML = `<p class="empty">No members of parliament are profiled for
      ${escapeHtml(store.state.name)} yet. <a href="${store.href()}">Back to map</a></p>`;
    return;
  }

  if (param) {
    const one = mps.find((m) => String(m.constituency.number) === String(param));
    el.innerHTML = one
      ? profile(one)
      : `<p class="empty">No such seat. <a href="${store.href('mps')}">All MPs</a></p>`;
    return;
  }

  const withCases = mps.filter((m) => m.representative.declared_cases.total > 0).length;
  el.innerHTML = `
    <a class="back" href="${store.href()}">← Map</a>
    <h1>${escapeHtml(store.state.name)} in the Lok Sabha</h1>
    <p class="sub">${mps.length} seats · ${withCases} members with declared criminal cases</p>
    <ul class="ac-list">
      ${mps.map((m) => {
    const rep = m.representative;
    const sev = severityOf(rep.declared_cases);
    const cases = formatDeclaredCases(rep.declared_cases);
    return `
        <li>
          <a href="${store.href(`mps/${m.constituency.number}`)}">
            ${rep.photo
    ? `<img class="ac-thumb" src="${escapeHtml(rep.photo.url)}" alt="" loading="lazy" />`
    : `<div class="ac-thumb avatar">${escapeHtml(initials(rep.name))}</div>`}
            <span class="sev-dot sev-${sev}"></span>
            <span class="ac-info">
              <b>${escapeHtml(m.constituency.name)}</b>
              <span class="ac-rep">${escapeHtml(rep.name)} ${partyChip(rep.current_party, { small: true })}</span>
              <span class="ac-cases">${escapeHtml(cases.headline)}</span>
            </span>
          </a>
        </li>`;
  }).join('')}
    </ul>`;
}
