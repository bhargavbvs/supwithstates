// The parts of a member's page that are the same whichever house they sit
// in.
//
// They used to be written out twice, once in constituency.js and once in
// mps.js, and the two drifted: an MP's photograph lost the ring in their
// party's colour, and their assets stayed a plain list while an MLA's grew
// a net-worth line and bars. Nobody decided that — the second copy simply
// stopped being updated. A reader should not have to learn a second page
// to read about the other house, so there is one copy now and both views
// call it.
import {
  formatRupees, formatDeclaredCases, severityOf, SEVERITY_LABEL, partyColor, initials, escapeHtml,
} from '../format.js';

export function partyChip(party, { small = false } = {}) {
  if (!party) return '';
  const { bg, text } = partyColor(party);
  return `<span class="party-chip${small ? ' small' : ''}" style="background:${bg};color:${text}">${escapeHtml(party)}</span>`;
}

/** Photograph, name, seat and party.
 *
 *  `seatLine` is the one thing that differs — "Ichchapuram (AC 1)" against
 *  "Kadapa (PC 21)" — so the caller passes it and everything else is here. */
export function profileHead(rep, seatLine) {
  const { bg: ring } = partyColor(rep.current_party);
  const photo = rep.photo
    ? `<img class="photo" src="${escapeHtml(rep.photo.url)}" alt="${escapeHtml(rep.name)}"
            style="box-shadow: 0 0 0 3px ${escapeHtml(ring)}, 0 0 0 5px var(--panel)" />`
    : `<div class="photo avatar" style="box-shadow: 0 0 0 3px ${escapeHtml(ring)}, 0 0 0 5px var(--panel)">${
  escapeHtml(initials(rep.name))}</div>`;

  // The credit sits on its own line under the header rather than in the
  // photograph's column, which is 96px wide and broke it across five.
  // Naming the photographer is a condition of the licence on the
  // Wikimedia ones, so it has to stay legible.
  const credit = rep.photo
    ? `<p class="photo-credit">Photo: ${escapeHtml(rep.photo.credit)} · ${escapeHtml(rep.photo.license)}</p>`
    : '';

  return `
    <header class="profile-head">
      <div class="photo-wrap">${photo}</div>
      <div class="profile-id">
        <h1>${escapeHtml(rep.name)}</h1>
        <p class="sub">${seatLine}</p>
        ${partyChip(rep.current_party)}
      </div>
    </header>
    ${credit}`;
}

export function severityBadge(rep) {
  const sev = severityOf(rep.declared_cases);
  return `<span class="sev-badge sev-${sev}">${escapeHtml(SEVERITY_LABEL[sev])}</span>`;
}

export function casesSection(rep) {
  const dc = rep.declared_cases;
  const cases = formatDeclaredCases(dc);
  // Serious is a claim about the affidavit, so the chip turns only on what
  // the affidavit says: a count above zero, or ADR's own listing where it
  // publishes membership and not a number.
  const isSerious = dc.serious > 0 || dc.serious_declared === true;

  return `
    <section>
      <h2>Declared criminal cases</h2>
      ${dc.total === 0
    ? '<p class="cases-zero">✓ No declared criminal cases in this candidate\'s affidavit.</p>'
    : `<p class="big">${escapeHtml(cases.headline)}</p>
       <div class="case-chips">
         <span class="case-chip ${isSerious ? 'chip-serious' : 'chip-ok'}">${escapeHtml(cases.serious)}</span>
         <span class="case-chip ${dc.convicted > 0 ? 'chip-convicted' : 'chip-ok'}">${dc.convicted} convicted</span>
         <span class="case-chip chip-neutral">${dc.total} total</span>
       </div>
       ${dc.note ? `<div class="case-note">
         <p class="case-note-label">How this was classified</p>
         <p class="case-note-text">${escapeHtml(dc.note)}</p>
       </div>` : ''}`}
    </section>`;
}

export function assetsSection(rep) {
  const a = rep.assets;
  const netWorth = (a.total ?? 0) - (a.liabilities ?? 0);
  const scale = Math.max(a.movable ?? 0, a.immovable ?? 0, a.liabilities ?? 0, 1);
  const width = (v) => `${Math.min(100, ((v ?? 0) / scale) * 100).toFixed(1)}%`;
  const bar = (label, value, cls = '') => `
    <div class="asset-bar${cls}">
      <span>${label}</span>
      <span class="track"><span class="fill" style="width:${width(value)}"></span></span>
      <span>${formatRupees(value)}</span>
    </div>`;

  return `
    <section>
      <h2>Declared assets</h2>
      <div class="net-worth-headline">
        <span class="net-worth-label">Net worth</span>
        <span class="net-worth-value">${formatRupees(netWorth)}</span>
      </div>
      <div class="asset-bars">
        ${bar('Movable', a.movable)}
        ${bar('Immovable', a.immovable)}
        ${bar('Liabilities', a.liabilities, ' liabilities')}
      </div>
      <dl style="margin-top: 0.9rem">
        <dt>Total assets</dt><dd>${formatRupees(a.total)}</dd>
      </dl>
    </section>`;
}

export function educationSection(rep) {
  return `
    <section>
      <h2>Education</h2>
      <p>${rep.education.level != null ? escapeHtml(rep.education.level) : 'Not declared'}</p>
      ${rep.education.detail ? `<p class="detail">${escapeHtml(rep.education.detail)}</p>` : ''}
    </section>`;
}
