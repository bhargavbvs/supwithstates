import { store } from '../store.js';
import { formatRupees, formatDeclaredCases, severityOf, SEVERITY_LABEL, partyColor, initials, escapeHtml } from '../format.js';

function partyChip(party) {
  if (!party) return '';
  const { bg, text } = partyColor(party);
  return `<span class="party-chip" style="background:${bg};color:${text}">${escapeHtml(party)}</span>`;
}

export function renderConstituency(el, param) {
  const rec = store.byNumber(param);
  if (!rec) {
    el.innerHTML = `<p class="empty">Constituency not found. <a href="#/">Back to map</a></p>`;
    return;
  }

  const { constituency: ac, representative: rep, result, source } = rec;
  const cases = formatDeclaredCases(rep.declared_cases);
  const sev = severityOf(rep.declared_cases);
  const districtSlug = store.slugify(ac.district);

  // --- Assets ---
  const netWorth = rep.assets.total - rep.assets.liabilities;
  const maxAsset = Math.max(rep.assets.movable, rep.assets.immovable, rep.assets.liabilities, 1);
  const barWidth = (v) => `${Math.min(100, (v / maxAsset) * 100).toFixed(1)}%`;

  // --- Election result ---
  const totalVotes = result.votes + (result.votes - result.margin);
  const runnerUpVotes = result.votes - result.margin;
  const winnerShare = totalVotes > 0 ? ((result.votes / totalVotes) * 100).toFixed(1) : null;
  const runnerShare = totalVotes > 0 ? ((runnerUpVotes / totalVotes) * 100).toFixed(1) : null;
  const maxResultVotes = Math.max(result.votes, runnerUpVotes, 1);
  const resultBarWidth = (v) => `${Math.min(100, (v / maxResultVotes) * 100).toFixed(1)}%`;

  // --- Party ring color ---
  const { bg: partyBg } = partyColor(rep.current_party);

  // --- Photo / avatar ---
  const photo = rep.photo
    ? `<div class="photo-wrap">
         <img class="photo" src="${escapeHtml(rep.photo.url)}" alt="${escapeHtml(rep.name)}"
              style="box-shadow: 0 0 0 3px ${escapeHtml(partyBg)}, 0 0 0 5px var(--panel)" />
         <small class="credit">${escapeHtml(rep.photo.credit)} · ${escapeHtml(rep.photo.license)}</small>
       </div>`
    : `<div class="photo avatar" style="box-shadow: 0 0 0 3px ${escapeHtml(partyBg)}, 0 0 0 5px var(--panel)">${escapeHtml(initials(rep.name))}</div>`;

  // --- Party defection notice ---
  const defected = rep.party_changed
    ? `<p class="defection">Elected on <b>${escapeHtml(rep.elected_party)}</b>, now <b>${escapeHtml(rep.current_party)}</b>
       (${escapeHtml(rep.party_changed.date)}) — <a href="${escapeHtml(rep.party_changed.source_url)}">source</a></p>`
    : '';

  // --- Cases section content ---
  const dc = rep.declared_cases;
  const casesContent = dc.total === 0
    ? `<p class="cases-zero">✓ No declared criminal cases in this candidate's affidavit.</p>`
    : `<p class="big">${escapeHtml(cases.headline)}</p>
       <div class="case-chips">
         <span class="case-chip ${dc.serious > 0 ? 'chip-serious' : 'chip-ok'}">${dc.serious} serious</span>
         <span class="case-chip ${dc.convicted > 0 ? 'chip-convicted' : 'chip-ok'}">${dc.convicted} convicted</span>
         <span class="case-chip chip-neutral">${dc.total} total</span>
       </div>
       ${dc.note ? `<div class="case-note">
         <p class="case-note-label">How this was classified</p>
         <p class="case-note-text">${escapeHtml(dc.note)}</p>
       </div>` : ''}`;

  el.innerHTML = `
    <a class="back" href="#/d/${districtSlug}">← ${escapeHtml(ac.district)}</a>

    <header class="profile-head">
      ${photo}
      <div class="profile-id">
        <h1>${escapeHtml(rep.name)}</h1>
        <p class="sub">${escapeHtml(ac.name)} (AC ${ac.number})${ac.reserved ? ` · ${escapeHtml(ac.reserved)}` : ''}
           ${rep.profession ? ` · ${escapeHtml(rep.profession)}` : ''}</p>
        ${partyChip(rep.current_party)}
      </div>
    </header>

    <span class="sev-badge sev-${sev}">${escapeHtml(SEVERITY_LABEL[sev])}</span>
    ${defected}

    <p class="disclaimer">${cases.disclaimer}</p>

    <section>
      <h2>Declared criminal cases</h2>
      ${casesContent}
    </section>

    <section>
      <h2>Declared assets</h2>
      <div class="net-worth-headline">
        <span class="net-worth-label">Net worth</span>
        <span class="net-worth-value">${formatRupees(netWorth)}</span>
      </div>
      <div class="asset-bars">
        <div class="asset-bar">
          <span>Movable</span>
          <span class="track"><span class="fill" style="width:${barWidth(rep.assets.movable)}"></span></span>
          <span>${formatRupees(rep.assets.movable)}</span>
        </div>
        <div class="asset-bar">
          <span>Immovable</span>
          <span class="track"><span class="fill" style="width:${barWidth(rep.assets.immovable)}"></span></span>
          <span>${formatRupees(rep.assets.immovable)}</span>
        </div>
        <div class="asset-bar liabilities">
          <span>Liabilities</span>
          <span class="track"><span class="fill" style="width:${barWidth(rep.assets.liabilities)}"></span></span>
          <span>${formatRupees(rep.assets.liabilities)}</span>
        </div>
      </div>
      <dl style="margin-top: 0.9rem">
        <dt>Total assets</dt><dd>${formatRupees(rep.assets.total)}</dd>
      </dl>
    </section>

    <section>
      <h2>Education</h2>
      <p>${rep.education.level != null ? escapeHtml(rep.education.level) : 'Not declared'}</p>
      ${rep.education.detail ? `<p class="detail">${escapeHtml(rep.education.detail)}</p>` : ''}
    </section>

    <section>
      <h2>2024 election result</h2>
      <div class="result-bars">
        <div class="result-bar winner">
          <div class="result-label">
            <span>${escapeHtml(rep.name)} ${partyChip(rep.current_party)}</span>
            <span class="result-votes">${escapeHtml(result.votes.toLocaleString('en-IN'))}${winnerShare ? ` <span class="vote-share">${winnerShare}%</span>` : ''}</span>
          </div>
          <span class="track"><span class="fill" style="width:${resultBarWidth(result.votes)}"></span></span>
        </div>
        ${result.runner_up ? `
        <div class="result-bar runner-up">
          <div class="result-label">
            <span>${escapeHtml(result.runner_up)} ${partyChip(result.runner_up_party)}</span>
            <span class="result-votes">${escapeHtml(runnerUpVotes.toLocaleString('en-IN'))}${runnerShare ? ` <span class="vote-share">${runnerShare}%</span>` : ''}</span>
          </div>
          <span class="track"><span class="fill" style="width:${resultBarWidth(runnerUpVotes)}"></span></span>
        </div>` : ''}
      </div>
      <p class="margin-note">Won by <b>${escapeHtml(result.margin.toLocaleString('en-IN'))}</b> votes</p>
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
