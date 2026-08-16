const norm = (s) => String(s ?? '').toLowerCase().trim();

export function searchConstituencies(query, records, limit = 8) {
  const q = norm(query);
  if (!q) return [];

  const scored = [];
  for (const r of records) {
    const fields = [
      norm(r.constituency.name),
      norm(r.constituency.district),
      norm(r.representative.name)
    ];
    let best = Infinity;
    for (const f of fields) {
      const i = f.indexOf(q);
      if (i === 0) best = Math.min(best, 0);
      else if (i > 0) best = Math.min(best, 1);
    }
    if (best < Infinity) scored.push({ r, best });
  }

  return scored
    .sort((a, b) => a.best - b.best || a.r.constituency.number - b.r.constituency.number)
    .slice(0, limit)
    .map((s) => s.r);
}
