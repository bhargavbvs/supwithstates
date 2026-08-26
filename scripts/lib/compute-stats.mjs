export function computeStats(records) {
  const profiled = records.length;
  let withDeclaredCases = 0;
  let withSeriousCases = 0;
  let totalAssets = 0;

  for (const r of records) {
    const dc = r.representative.declared_cases;
    if (dc.total > 0) withDeclaredCases++;
    // Counted the same either way: a member ADR names on its serious
    // list has declared one, whether or not the number is published.
    if (dc.serious > 0 || dc.serious_declared === true) withSeriousCases++;
    totalAssets += r.representative.assets.total ?? 0;
  }

  return {
    profiled,
    withDeclaredCases,
    withSeriousCases,
    totalAssets,
    pctWithDeclaredCases: profiled === 0 ? 0 : Math.round((withDeclaredCases / profiled) * 100)
  };
}
