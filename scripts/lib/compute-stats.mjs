export function computeStats(records) {
  const profiled = records.length;
  let withDeclaredCases = 0;
  let withSeriousCases = 0;
  let totalAssets = 0;

  for (const r of records) {
    const dc = r.representative.declared_cases;
    if (dc.total > 0) withDeclaredCases++;
    if (dc.serious > 0) withSeriousCases++;
    totalAssets += r.representative.assets.total;
  }

  return {
    profiled,
    withDeclaredCases,
    withSeriousCases,
    totalAssets,
    pctWithDeclaredCases: profiled === 0 ? 0 : Math.round((withDeclaredCases / profiled) * 100)
  };
}
