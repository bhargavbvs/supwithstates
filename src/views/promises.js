import { store } from '../store.js';
import { escapeHtml } from '../format.js';

function getStatusLabel(status) {
  const map = {
    not_started: 'Not Started',
    announced: 'Announced',
    in_progress: 'In Progress',
    delivered: 'Delivered',
    diluted: 'Diluted',
    stalled: 'Stalled'
  };
  return map[status] || status;
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(isoDate));
}

export function renderPromises(el) {
  const { promiseSets, promises } = store;
  
  if (!promiseSets.length || !promises.length) {
    el.innerHTML = `
      <div class="promises-container">
        <h1>Promise Tracker</h1>
        <p class="empty">No promise data loaded.</p>
      </div>
    `;
    return;
  }

  const pSet = promiseSets[0]; // For now, assuming one set

  const cards = promises.map(p => {
    const evidenceList = p.evidence.map(ev => `
      <li class="evidence-item">
        <span class="ev-date">${formatDate(ev.date)}</span>
        <span class="ev-label"><a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener">${escapeHtml(ev.label)}</a></span>
        <span class="ev-type tag">${escapeHtml(ev.type)}</span>
      </li>
    `).join('');

    return `
      <article class="promise-card status-${p.status}">
        <header class="promise-head">
          <div class="promise-headline">
            <h3>${escapeHtml(p.headline)}</h3>
            <span class="status-chip ${p.status}">${getStatusLabel(p.status)}</span>
          </div>
        </header>
        <div class="promise-body">
          <p class="explainer">${escapeHtml(p.explainer)}</p>
          <div class="original-text">
            <strong>Original promise:</strong> 
            <blockquote>${escapeHtml(p.original_text)}</blockquote>
          </div>
          <div class="status-reason">
            <strong>Current status:</strong> ${escapeHtml(p.status_reason)}
            <small class="since">Since ${formatDate(p.status_since)}</small>
          </div>
        </div>
        <footer class="promise-evidence">
          <h4>Evidence & Updates</h4>
          <ul>${evidenceList}</ul>
        </footer>
      </article>
    `;
  }).join('');

  el.innerHTML = `
    <div class="promises-container">
      <header class="tracker-header">
        <h1>Promise Tracker</h1>
        <p class="sub">${escapeHtml(pSet.title)} · Tracking ${promises.length} promises</p>
      </header>
      <div class="promises-list">
        ${cards}
      </div>
    </div>
  `;
}
