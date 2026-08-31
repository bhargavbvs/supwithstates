// What the state plans to spend, and on what.
//
// Every figure is copied from PRS Legislative Research's analysis of the
// state's own budget documents — see scripts/parse-prs-budget.mjs for how,
// and for why the named schemes are listed on their own rather than filed
// under a sector. Nothing here is derived except the shares, which are
// each sector against the total of the sectors shown.
import { store } from '../store.js';
import { escapeHtml } from '../format.js';
import { treemap, shares } from '../treemap.js';

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

  // Everything the plan spends that the sector table does not name. Shown,
  // not dropped: without it the tiles would claim to be the whole.
  const rest = Math.max(0, h.netExpenditure - sectorTotal);

  // Every ₹100: the four kinds of receipt, then borrowing — which closes
  // the sum exactly, because net expenditure = net receipts + fiscal
  // deficit in the budget's own arithmetic. Integer rupees that reach 100.
  const r100src = [
    ...b.receipts.map((r) => ({ name: r.name, value: r.budgeted, cls: 'own' })),
    { name: 'Borrowed', value: h.fiscalDeficit, cls: 'borrowed' },
  ];
  r100src[2].cls = 'centre';
  r100src[3].cls = 'centre';
  const r100shares = shares(r100src.map((p) => p.value), 100);
  const r100 = r100src.map((p, i) => ({ ...p, share: r100shares[i] }));



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
      <h2>Where every ₹100 comes from</h2>
      <p class="sub">Of every ₹100 the state plans to spend this year:</p>
      <div class="r100" role="img" aria-label="${escapeHtml(r100.map((p) => `₹${p.share} ${p.name}`).join(', '))}">
        ${r100.map((p) => `<span class="r100-seg ${p.cls}" style="width:${p.share}%"></span>`).join('')}
      </div>
      <ul class="r100-key">
        ${r100.map((p) => `
          <li>
            <i class="swatch ${p.cls}"></i>
            <span class="r100-share">₹${p.share}</span>
            <span class="r100-name">${escapeHtml(p.name)}</span>
            <span class="r100-amt">${crore(p.value)}</span>
          </li>`).join('')}
      </ul>
    </section>

    <section>
      <h2>Where it goes</h2>
      <p class="sub">Every tile is a head of spending, drawn to scale — twice the money is twice the
        area. The ${b.sectors.length} largest are named in the budget's own sector table; the grey tile
        is everything else the state spends on.</p>
      <div id="treemap" role="img"
        aria-label="${escapeHtml(b.sectors.map((s) => `${s.name} ${crore(s.budgeted)}`).join(', '))}, everything else ${crore(rest)}"></div>
      <p class="sub" style="margin-top:0.9rem">The same figures, with the change against last year's
        revised estimate:</p>
      ${sectorRows}
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

  // The treemap is geometry against the box it lives in, so it is painted
  // after layout and repainted when its width changes — a rotated phone is
  // a different box, not a scaled one.
  const box = el.querySelector('#treemap');
  const items = [
    ...b.sectors.map((s, i) => ({ value: s.budgeted, name: s.name, rank: i, other: false })),
    { value: rest, name: 'Everything else', rank: -1, other: true },
  ];

  function paint() {
    const w = box.clientWidth;
    if (!w) return;
    const hgt = Math.max(300, Math.min(460, Math.round(w * 0.62)));
    box.style.height = `${hgt}px`;
    box.innerHTML = treemap(items, w, hgt).map(({ x, y, w: tw, h: th, item }) => {
      const big = tw > 110 && th > 56;
      const mid = tw > 72 && th > 34;
      const label = item.other ? 'Everything else' : item.name;
      return `<div class="tm-tile ${item.other ? 'tm-other' : `tm-${item.rank % 3}`}"
        style="left:${x.toFixed(2)}px;top:${y.toFixed(2)}px;width:${tw.toFixed(2)}px;height:${th.toFixed(2)}px"
        title="${escapeHtml(`${label} — ${crore(item.value)}`)}">
        ${mid ? `<span class="tm-name">${escapeHtml(label)}</span>` : ''}
        ${big ? `<span class="tm-amt">${crore(item.value)}</span>` : ''}
      </div>`;
    }).join('');
  }

  paint();
  new ResizeObserver(paint).observe(box);
}
