// What the state plans to spend, and on what.
//
// Every figure is copied from PRS Legislative Research's analysis of the
// state's own budget documents — see scripts/parse-prs-budget.mjs for how,
// and for why the named schemes are listed on their own rather than filed
// under a sector. Nothing here is derived except the shares, which are
// each sector against the total of the sectors shown.
import { store } from '../store.js';
import { escapeHtml } from '../format.js';

/** Crore, as the budget itself states them: "₹52,047 crore". Lakh crore
 *  for the totals, where a five-figure crore number stops being a size a
 *  reader can feel. */
function crore(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} lakh crore`;
  return `₹${n.toLocaleString('en-IN')} crore`;
}

const pct = (n, of) => (of > 0 ? (n / of) * 100 : 0);

export function renderBudget(el) {
  const b = store.budget;
  if (!b) {
    el.innerHTML = `<p class="empty">No budget has been read for ${escapeHtml(store.state.name)} yet.
      <a href="${store.href()}">Back to map</a></p>`;
    return;
  }

  const h = b.headline;
  const sectorTotal = b.sectors.reduce((a, s) => a + s.budgeted, 0);
  const widest = Math.max(...b.sectors.map((s) => s.budgeted), 1);
  const receiptTotal = b.receipts.reduce((a, r) => a + r.budgeted, 0);
  const allocations = [...b.namedAllocations].sort((x, y) => y.amount - x.amount);

  const sectorRows = b.sectors.map((s) => {
    const up = s.changePct != null && s.changePct > 0;
    const change = s.changePct == null ? ''
      : `<span class="chg ${up ? 'up' : 'down'}">${up ? '+' : ''}${s.changePct}%</span>`;
    return `
      <div class="spend-row">
        <div class="spend-head">
          <span class="spend-name">${escapeHtml(s.name)}</span>
          <span class="spend-amt">${crore(s.budgeted)} ${change}</span>
        </div>
        <div class="spend-track">
          <span class="spend-fill" style="width:${pct(s.budgeted, widest).toFixed(1)}%"></span>
        </div>
        <p class="spend-share">${pct(s.budgeted, sectorTotal).toFixed(0)}% of the spending shown here</p>
      </div>`;
  }).join('');

  const receiptRows = b.receipts.map((r) => `
    <div class="spend-row compact">
      <div class="spend-head">
        <span class="spend-name">${escapeHtml(r.name)}</span>
        <span class="spend-amt">${crore(r.budgeted)}</span>
      </div>
      <div class="spend-track">
        <span class="spend-fill in" style="width:${pct(r.budgeted, receiptTotal).toFixed(1)}%"></span>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <a class="back" href="${store.href()}">← Map</a>
    <h1>${escapeHtml(store.state.name)}'s budget</h1>
    <p class="sub">${escapeHtml(b.year)} · every figure as the state budgeted it</p>

    <section>
      <h2>The year in three numbers</h2>
      <div class="budget-heads">
        <div class="budget-head">
          <span class="budget-head-value">${crore(h.netExpenditure)}</span>
          <span class="budget-head-label">to spend, once debt repayment is set aside</span>
        </div>
        <div class="budget-head">
          <span class="budget-head-value">${crore(h.netReceipts)}</span>
          <span class="budget-head-label">to receive, before borrowing</span>
        </div>
        <div class="budget-head short">
          <span class="budget-head-value gap">${crore(h.fiscalDeficit)}</span>
          <span class="budget-head-label">the gap between them, to be borrowed</span>
        </div>
      </div>
    </section>

    <section>
      <h2>Where it goes</h2>
      <p class="sub">The ${b.sectors.length} largest heads of spending, ${crore(sectorTotal)} between them
        — ${pct(sectorTotal, h.netExpenditure).toFixed(0)}% of everything the state plans to spend.
        Bars are drawn against the largest of them. The change is against last year's revised estimate.</p>
      ${sectorRows}
    </section>

    <section>
      <h2>Where it comes from</h2>
      ${receiptRows}
    </section>

    <section>
      <h2>What it pays for</h2>
      <p class="sub">Schemes and projects the budget names with a figure of their own. This is not the
        whole of the spending above — it is the part the budget speaks about by name.</p>
      <ul class="alloc-list">
        ${allocations.map((a) => `
          <li>
            <span class="alloc-amt">${crore(a.amount)}</span>
            <span class="alloc-text">${escapeHtml(a.text)}</span>
          </li>`).join('')}
      </ul>
    </section>

    <section class="sources">
      <h2>Sources</h2>
      <p>Compiled by ${escapeHtml(b.source.name)} from the state's own Annual Financial Statement and
         budget documents. Figures are budget estimates for ${escapeHtml(b.year)} — what the state plans
         to spend, not what it has spent.</p>
      <ul>
        <li><a href="${escapeHtml(b.source.analysis)}">${escapeHtml(b.source.name)}: budget analysis</a></li>
        <li><a href="${escapeHtml(b.source.pdf)}">The analysis as published (PDF)</a></li>
      </ul>
      <p class="retrieved">Retrieved ${escapeHtml(b.source.retrieved)}</p>
    </section>`;
}
