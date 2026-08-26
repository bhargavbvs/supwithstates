import { store } from '../store.js';
import { formatRupees, formatDeclaredCases, severityOf, SEVERITY_LABEL,
  partyColor, initials, escapeHtml } from '../format.js';

function partyChip(party) {
  if (!party) return '';
  const { bg, text } = partyColor(party);
  return `<span class="party-chip small" style="background:${bg};color:${text}">${escapeHtml(party)}</span>`;
}

/** One member of parliament, in full.
 *
 *  The same fields as a member of the assembly and from the same
 *  affidavits — a reader should not have to learn a second page to read
 *  about the other house. */
function profile(rec) {
  const { constituency: pc, representative: rep, source } = rec;
  const cases = formatDeclaredCases(rep.declared_cases);
  const sev = severityOf(rep.declared_cases);
  const dc = rep.declared_cases;

  return `
    <a class="back" href="${store.href('mps')}">← All MPs</a>
    <header class="profile-head">
      ${rep.photo
    ? `<div class="photo-wrap">
         <img class="photo" src="${escapeHtml(rep.photo.url)}" alt="${escapeHtml(rep.name)}"
              loading="lazy" />
         <small class="credit">${escapeHtml(rep.photo.credit)} · ${escapeHtml(rep.photo.license)}</small>
       </div>`
    : `<div class="photo avatar">${escapeHtml(initials(rep.name))}</div>`}
      <div class="profile-id">
        <h1>${escapeHtml(rep.name)}</h1>
        <p class="sub">${escapeHtml(pc.name)} (PC ${pc.number})${pc.reserved ? ` · ${escapeHtml(pc.reserved)}` : ''}
          ${rep.profession ? ` · ${escapeHtml(rep.profession)}` : ''}</p>
        ${partyChip(rep.current_party)}
      </div>
    </header>

    <span class="sev-badge sev-${sev}">${escapeHtml(SEVERITY_LABEL[sev])}</span>
    <p class="disclaimer">${cases.disclaimer}</p>

    <section>
      <h2>Declared criminal cases</h2>
      ${dc.total === 0
    ? `<p class="cases-zero">✓ No declared criminal cases in this candidate's affidavit.</p>`
    : `<p class="big">${escapeHtml(cases.headline)}</p>
         <div class="case-chips">
           <span class="case-chip ${sev >= 2 ? 'chip-serious' : 'chip-ok'}">${escapeHtml(cases.serious)}</span>
           <span class="case-chip ${dc.convicted > 0 ? 'chip-convicted' : 'chip-ok'}">${dc.convicted} convicted</span>
           <span class="case-chip chip-neutral">${dc.total} total</span>
         </div>
         ${dc.note ? `<div class="case-note">
           <p class="case-note-label">How this was classified</p>
           <p class="case-note-text">${escapeHtml(dc.note)}</p>
         </div>` : ''}`}
    </section>

    <section>
      <h2>Declared assets</h2>
      <dl>
        <dt>Movable</dt><dd>${formatRupees(rep.assets.movable)}</dd>
        <dt>Immovable</dt><dd>${formatRupees(rep.assets.immovable)}</dd>
        <dt>Total assets</dt><dd>${formatRupees(rep.assets.total)}</dd>
        <dt>Liabilities</dt><dd>${formatRupees(rep.assets.liabilities)}</dd>
      </dl>
    </section>

    <section>
      <h2>Education</h2>
      <p>${rep.education.level != null ? escapeHtml(rep.education.level) : 'Not declared'}</p>
      ${rep.education.detail ? `<p class="detail">${escapeHtml(rep.education.detail)}</p>` : ''}
    </section>

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
      <ul><li><a href="${escapeHtml(source.myneta_url)}">Affidavit on MyNeta (ADR)</a></li></ul>
      <p class="retrieved">Retrieved ${escapeHtml(source.retrieved)}</p>
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
              <span class="ac-rep">${escapeHtml(rep.name)} ${partyChip(rep.current_party)}</span>
              <span class="ac-cases">${escapeHtml(cases.headline)}</span>
            </span>
          </a>
        </li>`;
  }).join('')}
    </ul>`;
}
