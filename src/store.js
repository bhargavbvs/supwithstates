const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let states = null;
let data = null;
let current = null;

const REMEMBERED = 'ssup.state';

export const store = {
  /** The states this site holds, for the switcher. Fetched once. */
  async loadStates() {
    if (!states) states = await fetch('/data/states.json').then((r) => r.json());
    return states;
  },
  get states() { return states ?? []; },
  has(slug) { return (states ?? []).some((s) => s.slug === slug); },

  /** The state to open when the address does not name one: the last one
   *  this reader looked at, or the first we have. */
  preferred() {
    let stored = null;
    try { stored = localStorage.getItem(REMEMBERED); } catch { /* private mode */ }
    return this.has(stored) ? stored : (states?.[0]?.slug ?? null);
  },
  remember(slug) {
    try { localStorage.setItem(REMEMBERED, slug); } catch { /* private mode */ }
  },

  async load(slug) {
    if (current === slug && data) return data;
    data = await fetch(`/data/${slug}.json`).then((r) => r.json());
    current = slug;
    return data;
  },

  get slug() { return current; },
  get state() { return data.state; },
  get stats() { return data.stats; },
  get pages() { return data.pages; },
  get all() { return data.constituencies; },
  get mps() { return data.mps ?? []; },
  get promises() { return data.promises ?? []; },
  get promiseSets() { return data.promiseSets ?? []; },
  get budget() { return data.budget ?? null; },
  get budgets() { return data.budgets ?? (data.budget ? [data.budget] : []); },

  /** The member of parliament for the seat a constituency sits in.
   *
   *  The map carries the parliamentary number on every constituency, so
   *  this is a lookup rather than a guess about which seats overlap. */
  mpFor(acNumber) {
    const pc = data.pcOf?.[Number(acNumber)];
    if (pc == null) return null;
    return (data.mps ?? []).find((m) => m.constituency.number === pc) ?? null;
  },

  byNumber(n) {
    return data.constituencies.find((c) => c.constituency.number === Number(n)) ?? null;
  },
  byDistrict(slug) {
    return data.constituencies.filter((c) => slugify(c.constituency.district) === slug);
  },

  /** Every link carries the state it belongs to, so a shared address
   *  opens the map the sender was looking at. */
  href(path = '') {
    const rest = String(path).replace(/^#?\/?/, '');
    return `#/${current}${rest ? `/${rest}` : ''}`;
  },

  slugify,
};
