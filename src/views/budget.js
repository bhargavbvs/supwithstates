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
import { plainSector, plainReceipt } from '../plain-words.mjs';

/** Crore, as the budget itself states them: "₹52,047 crore". Lakh crore
 *  for the totals, where a five-figure crore number stops being a size a
 *  reader can feel. */
/** Figures are written the way an Indian newspaper writes them — "₹52,047
 *  cr" — because "crore" spelled out is three times the width for no more
 *  meaning, and in a treemap that width is the difference between a block
 *  that carries its number and one that does not. The lede says once what
 *  a crore is, for a reader who does not already know. */
function crore(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} lakh cr`;
  return `₹${n.toLocaleString('en-IN')} cr`;
}

const pct = (n, of) => (of > 0 ? (n / of) * 100 : 0);

export function renderBudget(el, param) {
  const all = store.budgets;
  const b = all.find((x) => x.year === param) ?? all[0] ?? null;
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

  // "+35%" on its own says nothing a reader can use: 35% of what, and
  // against when. The figure it is measured from is in the data, so the
  // row says the change in rupees and in words — up ₹13,572 cr from last
  // year — and keeps the percentage after it for anyone who wants it.
  // Everything the plan spends that the sector table does not name. Shown,
  // not dropped: without it the tiles would claim to be the whole.
  const rest = Math.max(0, h.netExpenditure - sectorTotal);

  const splitShares = shares([h.netReceipts, h.fiscalDeficit], 100);

  const lastYear = b.years?.find((y) => y.key === 'revisedPrev')?.label ?? 'last year';

  // One denominator for the whole page: everything the state spends. The
  // rows used to be a share of the ten sectors shown while the treemap
  // included everything else, so the same block was 26% in one place and
  // 17% in the other. Largest-remainder so the eleven shares reach exactly
  // 100 — the treemap draws all of them, and a reader who adds them up
  // should not find a rupee missing.
  const shareOf = [...b.sectors.map((x) => x.budgeted), rest];
  const shareVals = shares(shareOf, 100);
  const sectorShare = new Map(b.sectors.map((x, i) => [x.name, shareVals[i]]));
  const restShare = shareVals[shareVals.length - 1];
  const sectorRows = b.sectors.map((s) => {
    const before = s.revisedPrev;
    const diff = before == null ? null : s.budgeted - before;
    const change = diff == null
      ? ''
      : `<span class="chg ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲ up' : '▼ down'}
           ${crore(Math.abs(diff))} from ${escapeHtml(lastYear)}${
  s.changePct == null ? '' : ` (${s.changePct > 0 ? '+' : ''}${s.changePct}%)`}</span>`;
    return `
      <div class="spend-row">
        <div class="spend-head">
          <span class="spend-name">
            ${escapeHtml(plainSector(s.name) ?? s.name)}
            ${plainSector(s.name) ? `<small>${escapeHtml(s.name)}</small>` : ''}
          </span>
          <span class="spend-amt"><span class="amt-num">${crore(s.budgeted)}</span></span>
        </div>
        <div class="spend-track">
          <span class="spend-fill" style="width:${pct(s.budgeted, widest).toFixed(1)}%"></span>
        </div>
        <p class="spend-share">₹${sectorShare.get(s.name)} of every ₹100 the state spends${
  diff == null ? '' : ` · ${change}`}</p>
      </div>`;
  }).join('');

  // Every ₹100: the four kinds of receipt, then borrowing — which closes
  // the sum exactly, because net expenditure = net receipts + fiscal
  // deficit in the budget's own arithmetic. Integer rupees that reach 100.
  const r100src = [
    ...b.receipts.map((r) => ({ name: r.name, value: r.budgeted, cls: 'own' })),
    // The budget's own word for this is the fiscal deficit; "borrowed" is
    // the plain one, and both are shown like every other row here.
    { name: 'Fiscal Deficit', value: h.fiscalDeficit, cls: 'borrowed' },
  ];
  r100src[2].cls = 'centre';
  r100src[3].cls = 'centre';
  const r100shares = shares(r100src.map((p) => p.value), 100);
  const r100 = r100src.map((p, i) => ({ ...p, share: r100shares[i], plain: plainReceipt(p.name) }));



  el.innerHTML = `
    <a class="back" href="${store.href()}">← Map</a>
    <h1>${escapeHtml(store.state.name)}'s budget</h1>
    <p class="sub">${escapeHtml(b.year)} · every figure as the state budgeted it</p>
    ${all.length < 2 ? '' : `
      <nav class="year-pick" aria-label="Budget year">
        ${all.map((x) => `<a href="${store.href(`budget/${x.year}`)}"
          class="year-tab${x.year === b.year ? ' on' : ''}"${x.year === b.year ? ' aria-current="true"' : ''}>${
  escapeHtml(x.year)}</a>`).join('')}
      </nav>`}
    <p class="lede">A budget is a plan for the year: how much money the state thinks it will get,
      and what it means to spend it on. Everything below is that plan, not what has been spent.
      Money is in crore — one crore is ten million rupees — written <b>cr</b>.</p>

    <section>
      <h2>The year in one line</h2>
      <p class="sub">Everything the state plans to spend is either money it has, or money it borrows.</p>
      <div class="split" role="img"
        aria-label="Of ${crore(h.netExpenditure)} to spend, ${crore(h.netReceipts)} is money it has and ${crore(h.fiscalDeficit)} is borrowed">
        <span class="split-have" style="width:${pct(h.netReceipts, h.netExpenditure).toFixed(1)}%">
          <span class="split-amt">₹${splitShares[0]} of every ₹100</span>
          <span class="split-label">money it has · ${crore(h.netReceipts)}</span>
        </span>
        <span class="split-borrow" style="width:${pct(h.fiscalDeficit, h.netExpenditure).toFixed(1)}%">
          <span class="split-amt">₹${splitShares[1]}</span>
          <span class="split-label">borrowed · ${crore(h.fiscalDeficit)}</span>
        </span>
      </div>
      <p class="split-total">${crore(h.netExpenditure)} to spend in all. The borrowed part is what the
        budget calls the <b>fiscal deficit</b>.</p>
    </section>

    <section>
      <h2>Where every ₹100 comes from</h2>
      <p class="sub">Not all of it is the state's own money. Of every ₹100 it plans to spend:</p>
      <div class="r100" role="img" aria-label="${escapeHtml(r100.map((p) => `₹${p.share} ${p.name}`).join(', '))}">
        ${r100.map((p) => `<span class="r100-seg ${p.cls}" style="width:${p.share}%"></span>`).join('')}
      </div>
      <ul class="r100-key">
        ${r100.map((p) => `
          <li>
            <i class="swatch ${p.cls}"></i>
            <span class="r100-share">₹${p.share}</span>
            <span class="r100-name">
              ${escapeHtml(p.plain ?? p.name)}
              ${p.plain ? `<small>${escapeHtml(p.name)}</small>` : ''}
            </span>
            <span class="r100-amt">${crore(p.value)}</span>
          </li>`).join('')}
      </ul>
    </section>

    <section>
      <h2>Where it goes</h2>
      <p class="sub">Each block is one thing the state spends on, and its size is the money: a block
        twice as big is twice the rupees. The percentage is that block's share of everything the state
        spends, so all eleven add up to 100. The grey block is everything else put together.</p>
      <div id="treemap" role="img"
        aria-label="${escapeHtml(b.sectors.map((s) => `${s.name} ${crore(s.budgeted)}`).join(', '))}, everything else ${crore(rest)}"></div>
      <p class="sub" style="margin-top:0.9rem">The same spending as a list. Beside each one is how much
        more, or less, it is than ${escapeHtml(lastYear)} — comparing this year's plan with what last
        year's spending was finally revised to.</p>
      ${sectorRows}
    </section>

    ${!b.years || !b.overYears ? '' : `
    <section>
      <h2>Year by year</h2>
      <p class="sub">The same three lines across the years the budget reports. They are not the same
        kind of number — ${escapeHtml(b.years.map((y) => `${y.label} is what was ${y.kind}`).join(', '))} —
        so each bar says which it is.</p>
      ${['netExpenditure', 'netReceipts', 'fiscalDeficit'].map((key) => {
    const row = b.overYears[key];
    const label = { netExpenditure: 'Spending', netReceipts: 'Money it has', fiscalDeficit: 'Borrowed' }[key];
    const top = Math.max(...b.years.map((y) => row[y.key] ?? 0), 1);
    return `
      <div class="years-row">
        <h3>${label}</h3>
        ${b.years.map((y) => `
          <div class="years-bar">
            <span class="years-when">${escapeHtml(y.label)}</span>
            <span class="track"><span class="fill ${key === 'fiscalDeficit' ? 'owed' : ''}"
              style="width:${(((row[y.key] ?? 0) / top) * 100).toFixed(1)}%"></span></span>
            <span class="years-amt">${crore(row[y.key])}</span>
            <span class="years-kind">${escapeHtml(y.kind)}</span>
          </div>`).join('')}
      </div>`;
  }).join('')}
    </section>`}

    ${!b.fiscal ? '' : `
    <section>
      <h2>Debt and deficits</h2>
      <p class="sub">The three figures a state's finances are usually judged on, each as a share of
        the size of the state's economy — which is how they are set, compared and capped.</p>
      <dl class="fiscal">
        ${b.fiscal.fiscalDeficit?.budgeted == null ? '' : `
        <div>
          <dt>Fiscal deficit</dt>
          <dd><b>${b.fiscal.fiscalDeficit.budgeted}%</b> of the state's economy</dd>
          <dd class="fiscal-note">Everything it spends beyond what it receives — the borrowing above.
            ${b.fiscal.fiscalDeficitCeilingPctGsdp == null ? ''
    : `The centre's limit for states is ${b.fiscal.fiscalDeficitCeilingPctGsdp}%.`}</dd>
        </div>`}
        ${b.fiscal.revenueDeficit?.budgeted == null ? '' : `
        <div>
          <dt>Revenue deficit</dt>
          <dd><b>${b.fiscal.revenueDeficit.budgeted}%</b> of the state's economy</dd>
          <dd class="fiscal-note">Borrowing that pays for running costs rather than for anything
            built or bought — salaries, pensions, interest.</dd>
        </div>`}
        ${b.fiscal.outstandingDebtPctGsdp == null ? '' : `
        <div>
          <dt>Outstanding debt</dt>
          <dd><b>${b.fiscal.outstandingDebtPctGsdp}%</b> of the state's economy</dd>
          <dd class="fiscal-note">Everything borrowed and not yet repaid, added up over the years.</dd>
        </div>`}
      </dl>
      <p class="sub">"the state's economy" is its GSDP${h.gsdp ? `, ${crore(h.gsdp)} this year` : ''} —
        the value of everything produced in the state in a year.</p>
    </section>`}

    <section>
      <h2>What it pays for</h2>
      <p class="sub">Things the budget names one by one, with a figure beside each. This is not all
        the spending above — it is the part the budget talks about by name.</p>
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
      <p>The plain wording on this page is ours, to make the budget readable. The official name of
         every heading is printed underneath it, so any figure here can be found in the source
         document by the name it uses there.</p>
      <p class="retrieved">Retrieved ${escapeHtml(b.source.retrieved)}</p>
    </section>`;

  // The treemap is geometry against the box it lives in, so it is painted
  // after layout and repainted when its width changes — a rotated phone is
  // a different box, not a scaled one.
  const box = el.querySelector('#treemap');
  const items = [
    ...b.sectors.map((s, i) => ({
      value: s.budgeted, name: plainSector(s.name) ?? s.name, official: s.name,
      share: sectorShare.get(s.name), rank: i, other: false,
    })),
    { value: rest, name: 'Everything else', share: restShare, rank: -1, other: true },
  ];

  function paint() {
    const w = box.clientWidth;
    if (!w) return;
    // A phone is narrow, not short. At a landscape aspect ratio eleven
    // tiles in 358px left four of them too small to carry even a figure,
    // so on a narrow screen the treemap gets taller instead — the same
    // areas, in a shape that has room for the labels.
    const hgt = w < 520
      ? Math.max(460, Math.min(700, Math.round(w * 1.8)))
      : Math.max(300, Math.min(460, Math.round(w * 0.62)));
    box.style.height = `${hgt}px`;
    // The figure comes first and the name yields to it.
    //
    // Deciding both from the tile's size dropped the rupees from three
    // blocks: they were large enough to qualify, but a four-line name had
    // already eaten the room the number needed. And guessing the width of
    // a figure from its character count was no better — seven pixels a
    // character clipped the longest ones, seven and a half refused two
    // that would have fitted.
    //
    // So the figures are laid out and then measured, and each steps down
    // through the forms it can take until one fits: the full "₹8,055
    // crore", the short "₹8,055", the same turned on its side for a tile
    // that is tall and narrow, and only then nothing. Measuring is not an
    // estimate.
    const shortCrore = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L cr` : `₹${n.toLocaleString('en-IN')}`);

    box.innerHTML = treemap(items, w, hgt).map(({ x, y, w: tw, h: th, item }) => `
      <div class="tm-tile ${item.other ? 'tm-other' : `tm-${Math.min(item.rank, 9)}`}"
        style="left:${x.toFixed(2)}px;top:${y.toFixed(2)}px;width:${tw.toFixed(2)}px;height:${th.toFixed(2)}px"
        title="${escapeHtml(`${item.official ?? item.name} — ${crore(item.value)}`)}">
        ${tw > 70 ? `<span class="tm-name">${escapeHtml(item.name)}</span>` : ''}
        <span class="tm-amt" data-value="${item.value}" data-share="${item.share}">${crore(item.value)}</span>
      </div>`).join('');

    for (const tile of box.children) {
      const amt = tile.querySelector('.tm-amt');
      const value = Number(amt.dataset.value);
      const cs = getComputedStyle(tile);
      const innerW = tile.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const innerH = tile.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);

      // The span shrinks to its text, so its own box is the figure's real
      // size — scrollWidth on a stretched flex child measured the tile
      // rather than the number and sent almost every label to the
      // vertical fallback.
      const fits = () => {
        const r = amt.getBoundingClientRect();
        return r.width <= innerW + 0.5 && r.height <= innerH + 0.5;
      };

      // The share is the last thing to go, not the first. Area already
      // encodes it, so the percentage is what makes the area readable —
      // and a share is what a reader carries away from a page like this,
      // where a five-figure rupee number is not. The rupees give way
      // first: every one of them is in the list directly below, and none
      // of the shares is.
      const share = amt.dataset.share;
      let placed = false;
      for (const [text, tight] of [
        [`${crore(value)} · ${share}%`, false],
        [`${shortCrore(value)} · ${share}%`, true],
        [`${share}%`, false],
      ]) {
        amt.textContent = text;
        amt.classList.toggle('tight', tight);
        if (fits()) { placed = true; break; }
      }
      if (!placed) {
        amt.classList.add('upright', 'tight');
        amt.textContent = `${share}%`;
        const name = tile.querySelector('.tm-name');
        if (name) name.remove();
        placed = fits();
      }
      if (!placed) amt.remove();

      // Then the name takes the lines actually left over. Estimating this
      // from a nominal line height ran "Food, and help for people who need
      // it" straight into its own figure — the clamp allowed three lines
      // where two fitted. The line height and the figure's height are both
      // measurable, so they are measured.
      const name = tile.querySelector('.tm-name');
      if (!name) continue;
      const lineHeight = parseFloat(getComputedStyle(name).lineHeight) || 15;
      const used = amt.isConnected ? amt.getBoundingClientRect().height : 0;
      const lines = Math.floor((innerH - used) / lineHeight);
      if (lines < 1) name.remove();
      else name.style.webkitLineClamp = String(lines);
    }
  }

  paint();
  new ResizeObserver(paint).observe(box);
}
