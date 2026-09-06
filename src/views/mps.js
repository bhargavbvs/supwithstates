import { store } from '../store.js';
import { mountMapHero } from './map-hero.js';
import {
  formatDeclaredCases, severityOf, initials, escapeHtml, formatRupeesCompact, CASE_DISCLAIMER,
} from '../format.js';
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
    <a class="back" href="${store.href('mps')}">← Lok Sabha map</a>
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

/** The seats of one state, drawn.
 *
 *  The shapes come from the national parliamentary file — a PC is its
 *  assembly segments dissolved together — so this map and the state's
 *  assembly map can never disagree about where a boundary runs.
 */
function renderMpMap(el, mps) {
  el.innerHTML = '<div id="map"></div><p class="loading">Loading the map…</p>';
  fetch(`/geo/${store.slug}-pc-map.json`).then((r) => {
    if (!r.ok) throw new Error('no parliamentary map for this state');
    return r.json();
  }).then((mapData) => {
    const withCases = mps.filter((m) => (m.representative.declared_cases?.total ?? 0) > 0).length;
    const assets = mps.reduce((a, m) => a + (m.representative.assets?.total ?? 0), 0);
    const byNo = new Map(mps.map((m) => [m.constituency.number, m]));
    const nameOf = new Map(mapData.constituencies.map((c) => [c.ac_no, c.name]));

    mountMapHero(el, {
      mapData,
      records: mps,
      seats: mapData.constituencies.length,
      title: `${store.state.name} in the Lok Sabha`,
      stats: [
        { value: mapData.constituencies.length, label: 'Lok Sabha seats' },
        { value: `${Math.round((withCases / mps.length) * 100)}%`, label: 'with declared criminal cases' },
        { value: formatRupeesCompact(assets), label: 'total declared assets' },
      ],
      hrefFor: (id) => (byNo.has(id) ? store.href(`mps/${id}`) : null),
      missingText: (id) => `${nameOf.get(id) ?? 'That seat'}: no member's record has been read yet.`,
      note: `${CASE_DISCLAIMER}
        <a href="${store.href('mps/all')}">See them as a list</a>.`,
      search: {
        placeholder: 'Find an MP or a Lok Sabha seat',
        run: (q) => {
          const t = q.toLowerCase();
          return mps.filter((m) => m.representative.name.toLowerCase().includes(t)
            || m.constituency.name.toLowerCase().includes(t))
            .slice(0, 12)
            .map((m) => ({
              href: store.href(`mps/${m.constituency.number}`),
              title: m.constituency.name,
              sub: m.representative.name,
            }));
        },
      },
    });
  }).catch(() => renderMpList(el, mps));
}

function renderMpList(el, mps) {
  const withCases = mps.filter((m) => m.representative.declared_cases.total > 0).length;
  el.innerHTML = `
    <a class="back" href="${store.href('mps')}">← Lok Sabha map</a>
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

export function renderMps(el, param) {
  const mps = store.mps;

  if (!mps.length) {
    el.innerHTML = `<p class="empty">No members of parliament are profiled for
      ${escapeHtml(store.state.name)} yet. <a href="${store.href()}">Back to map</a></p>`;
    return;
  }

  // "all" is the list; a number is one seat; nothing is the map. A seat
  // number can never be the word "all", so the two cannot collide.
  if (param === 'all') { renderMpList(el, mps); return; }

  if (param) {
    const one = mps.find((m) => String(m.constituency.number) === String(param));
    el.innerHTML = one
      ? profile(one)
      : `<p class="empty">No such seat. <a href="${store.href('mps')}">All MPs</a></p>`;
    return;
  }

  renderMpMap(el, mps);
}
