const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let data = null;

export const store = {
  async load() {
    if (!data) data = await fetch('/data.json').then((r) => r.json());
    return data;
  },
  get state() { return data.state; },
  get stats() { return data.stats; },
  get pages() { return data.pages; },
  get all() { return data.constituencies; },
  byNumber(n) {
    return data.constituencies.find((c) => c.constituency.number === Number(n)) ?? null;
  },
  byDistrict(slug) {
    return data.constituencies.filter((c) => slugify(c.constituency.district) === slug);
  },
  slugify
};
