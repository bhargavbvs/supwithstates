import { store } from '../store.js';
import { formatRupees, formatDeclaredCases, severityOf, SEVERITY_LABEL, partyColor, escapeHtml } from '../format.js';

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

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
  const maxAsset = Math.max(rep.assets.movable, rep.assets.immovable, 1);
  const barWidth = (v) => `${Math.min(100, (v / maxAsset) * 100).toFixed(1)}%`;

  const runnerUpVotes = result.votes - result.margin;
  const maxResultVotes = Math.max(result.votes, runnerUpVotes, 1);
  const resultBarWidth = (v) => `${Math.min(100, (v / maxResultVotes) * 100).toFixed(1)}%`;

  const photo = rep.photo
    ? `<div class="photo-wrap">
         <img class="photo" src="${escapeHtml(rep.photo.url)}" alt="${escapeHtml(rep.name)}" />
         <small class="credit">${escapeHtml(rep.photo.credit)} · ${escapeHtml(rep.photo.license)}</small>
       </div>`
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
           ${rep.profession ? ` · ${escapeHtml(rep.profession)}` : ''}</p>
        ${partyChip(rep.current_party)}
      </div>
    </header>
    <span class="sev-badge sev-${sev}">${escapeHtml(SEVERITY_LABEL[sev])}</span>
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
      ${rep.declared_cases.note ? `<p class="case-note">${escapeHtml(rep.declared_cases.note)}</p>` : ''}
    </section>

    <section>
      <h2>Declared assets</h2>
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
        <dt>Total</dt><dd><b>${formatRupees(rep.assets.total)}</b></dd>
      </dl>
    </section>

    <section>
      <h2>2024 result</h2>
      <div class="result-bars">
        <div class="result-bar winner">
          <div class="result-label">
            <span>${escapeHtml(rep.name)} ${partyChip(rep.current_party)}</span>
            <span>${escapeHtml(result.votes.toLocaleString('en-IN'))}</span>
          </div>
          <span class="track"><span class="fill" style="width:${resultBarWidth(result.votes)}"></span></span>
        </div>
        ${result.runner_up ? `
        <div class="result-bar runner-up">
          <div class="result-label">
            <span>${escapeHtml(result.runner_up)} ${partyChip(result.runner_up_party)}</span>
            <span>${escapeHtml(runnerUpVotes.toLocaleString('en-IN'))}</span>
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
