import { store } from '../store.js';
import { formatDeclaredCases, initials, escapeHtml } from '../format.js';
import {
  profileHead, severityBadge, casesSection, assetsSection, educationSection, partyChip,
} from './profile.js';

export function renderConstituency(el, param) {
  const rec = store.byNumber(param);
  if (!rec) {
    el.innerHTML = `<p class="empty">Constituency not found. <a href="${store.href()}">Back to map</a></p>`;
    return;
  }

  const { constituency: ac, representative: rep, result, source } = rec;
  // Not every election has published votes. Telangana 2023 and the 2024
  // Lok Sabha do not, anywhere this project can reach, so those records
  // carry no result block and the section below is left out rather than
  // filled with a margin nobody counted.
  const cases = formatDeclaredCases(rep.declared_cases);
  const districtSlug = store.slugify(ac.district);

  // --- Election result ---
  // Which member of parliament answers for the same ground.
  const mp = store.mpFor(ac.number);

  const totalVotes = result ? result.votes + (result.votes - result.margin) : 0;
  const runnerUpVotes = result ? result.votes - result.margin : 0;
  const winnerShare = totalVotes > 0 ? ((result.votes / totalVotes) * 100).toFixed(1) : null;
  const runnerShare = totalVotes > 0 ? ((runnerUpVotes / totalVotes) * 100).toFixed(1) : null;
  const maxResultVotes = Math.max(result?.votes ?? 0, runnerUpVotes, 1);
  const resultBarWidth = (v) => `${Math.min(100, (v / maxResultVotes) * 100).toFixed(1)}%`;

  // --- Party defection notice ---
  const defected = rep.party_changed
    ? `<p class="defection">Elected on <b>${escapeHtml(rep.elected_party)}</b>, now <b>${escapeHtml(rep.current_party)}</b>
       (${escapeHtml(rep.party_changed.date)}) — <a href="${escapeHtml(rep.party_changed.source_url)}">source</a></p>`
    : '';

  const seatLine = `${escapeHtml(ac.name)} (AC ${ac.number})`
    + `${ac.reserved ? ` · ${escapeHtml(ac.reserved)}` : ''}`
    + `${rep.profession ? ` · ${escapeHtml(rep.profession)}` : ''}`;

  el.innerHTML = `
    <a class="back" href="${store.href(`d/${districtSlug}`)}">← ${escapeHtml(ac.district)}</a>

    ${profileHead(rep, seatLine)}
    ${severityBadge(rep)}
    ${defected}

    <p class="disclaimer">${cases.disclaimer}</p>

    ${casesSection(rep)}

    ${assetsSection(rep)}

    ${educationSection(rep)}

    ${result ? `
    <section>
      <h2>${escapeHtml(rep.election)} election result</h2>
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
    </section>` : ''}

    ${mp ? `
    <section class="also-mp">
      <h2>In Parliament</h2>
      <p class="sub">This constituency is part of the ${escapeHtml(mp.constituency.name)}
         Lok Sabha seat.</p>
      <a class="mp-card" href="${store.href(`mps/${mp.constituency.number}`)}">
        ${mp.representative.photo
    ? `<img class="mp-avatar" src="${escapeHtml(mp.representative.photo.url)}" alt="" loading="lazy" />`
    : `<span class="mp-avatar">${escapeHtml(initials(mp.representative.name))}</span>`}
        <span class="mp-id">
          <b>${escapeHtml(mp.representative.name)}</b>
          ${partyChip(mp.representative.current_party)}
          <span class="mp-meta">${escapeHtml(mp.constituency.name)} · elected ${escapeHtml(mp.representative.election)}</span>
        </span>
      </a>
    </section>` : ''}

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
