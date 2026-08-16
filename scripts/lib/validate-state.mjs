const isUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);

export function validateState(s) {
  const errors = [];
  if (!s || typeof s !== 'object') return ['state.json must be an object'];

  for (const key of ['slug', 'name', 'domain']) {
    if (typeof s[key] !== 'string' || !s[key].trim()) errors.push(`${key} is required`);
  }
  if (!Number.isInteger(s.assembly_size) || s.assembly_size < 1) {
    errors.push('assembly_size must be a positive integer');
  }
  if (!Number.isInteger(s.district_count) || s.district_count < 1) {
    errors.push('district_count must be a positive integer');
  }
  if (!s.term || !/^\d{4}-\d{2}$/.test(s.term.start ?? '')) {
    errors.push('term.start must be YYYY-MM');
  }
  if (!s.sources || !isUrl(s.sources.myneta)) errors.push('sources.myneta is required');
  if (!s.sources || !isUrl(s.sources.go_portal)) errors.push('sources.go_portal is required');

  const c = s.map?.center;
  if (!Array.isArray(c) || c.length !== 2 || !c.every(Number.isFinite)) {
    errors.push('map.center must be [lng, lat]');
  }
  if (!Number.isFinite(s.map?.zoom)) errors.push('map.zoom must be a number');

  return errors;
}
