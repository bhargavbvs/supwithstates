const isUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function validateRepresentative(r, { assemblySize }) {
  const e = [];
  if (!r || typeof r !== 'object') return ['record must be an object'];

  if (typeof r.id !== 'string' || !r.id.trim()) e.push('id is required');

  const c = r.constituency ?? {};
  if (!Number.isInteger(c.number) || c.number < 1 || c.number > assemblySize) {
    e.push(`constituency.number must be between 1 and ${assemblySize}`);
  }
  if (typeof c.name !== 'string' || !c.name.trim()) e.push('constituency.name is required');
  if (typeof c.district !== 'string' || !c.district.trim()) e.push('constituency.district is required');
  if (![null, 'SC', 'ST'].includes(c.reserved ?? null)) e.push('constituency.reserved must be null, "SC" or "ST"');

  const p = r.representative ?? {};
  if (typeof p.name !== 'string' || !p.name.trim()) e.push('representative.name is required');
  if (!/^\d{4}$/.test(p.election ?? '')) e.push('representative.election must be a four-digit year');
  if (typeof p.elected_party !== 'string' || !p.elected_party.trim()) {
    e.push('representative.elected_party is required');
  }
  if (p.current_party !== null && (typeof p.current_party !== 'string' || !p.current_party.trim())) {
    e.push('representative.current_party must be a non-empty string or null');
  }

  if (p.party_changed != null) {
    const pc = p.party_changed;
    if (!isUrl(pc.source_url)) e.push('representative.party_changed.source_url is required');
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(pc.date ?? '')) e.push('representative.party_changed.date must be YYYY-MM or YYYY-MM-DD');
  }

  if (p.photo != null) {
    if (!isUrl(p.photo.url)) e.push('representative.photo.url must be a URL');
    if (typeof p.photo.license !== 'string' || !p.photo.license.trim()) {
      e.push('representative.photo.license is required when a photo is present');
    }
  }

  const dc = p.declared_cases ?? {};
  for (const key of ['total', 'convicted']) {
    if (!isNum(dc[key])) e.push(`representative.declared_cases.${key} must be an explicit number`);
  }
  // `serious` is ADR's count where ADR publishes one. For Telangana and
  // for the Lok Sabha it publishes only the list of who has declared such
  // a case, not how many each has — so a record there says which of the
  // two things is known and never guesses the other. A null with no flag
  // beside it would just be a missing number, and that is still an error.
  if (!isNum(dc.serious) && typeof dc.serious_declared !== 'boolean') {
    e.push('representative.declared_cases.serious must be a number, or null with serious_declared true/false');
  }
  if (dc.serious === null && dc.serious_declared === true && !dc.note) {
    e.push('representative.declared_cases.note must say why the count is absent');
  }
  if (isNum(dc.total) && isNum(dc.serious) && dc.serious > dc.total) {
    e.push('representative.declared_cases.serious cannot exceed total');
  }
  if (isNum(dc.total) && isNum(dc.convicted) && dc.convicted > dc.total) {
    e.push('representative.declared_cases.convicted cannot exceed total');
  }

  const a = p.assets ?? {};
  for (const key of ['movable', 'immovable', 'total', 'liabilities']) {
    if (!isNum(a[key])) e.push(`representative.assets.${key} must be a number`);
  }

  const s = r.source ?? {};
  if (!isUrl(s.myneta_url)) e.push('source.myneta_url is required and must be a URL');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.retrieved ?? '')) e.push('source.retrieved must be YYYY-MM-DD');

  return e;
}
