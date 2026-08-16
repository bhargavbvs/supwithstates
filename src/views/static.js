const PAGES = {
  methodology: () => `
    <a class="back" href="#/">← Map</a>
    <h1>Methodology</h1>
    <div class="prose">
      <p>Every figure on this site is self-declared by the candidate in a sworn
      affidavit filed with the Election Commission of India ahead of the 2024
      Andhra Pradesh Assembly election. We don't independently verify these
      numbers — we republish what each candidate legally attested to under
      oath, sourced from <a href="https://www.myneta.info/">MyNeta</a> (run by
      the Association for Democratic Reforms) and cross-checked against ADR's
      official published analysis and the Election Commission's own affidavit
      archive. Where ECI and ADR figures differ, ECI is authoritative.</p>

      <h2>What "declared cases" means</h2>
      <p>A <b>declared case</b> is any case the candidate listed on their
      affidavit — most are still pending in court. <b>Pending cases are
      allegations, not convictions.</b> We only report the declared case
      count, never a label for the person.</p>

      <h2>What "serious" means</h2>
      <p>We classify a declared case as <b>serious</b> if at least one of its
      IPC or law sections carries a maximum sentence of five years or more —
      the standard threshold used to define serious/heinous offences in
      Indian election-disclosure law. This is worked out case-by-case from the
      sections listed on the candidate's own affidavit page, not from any
      single official "serious count" field (different sources count
      differently — we show our exact reasoning in each profile's assets/cases
      section where relevant).</p>

      <h2>What "convicted" means</h2>
      <p>A candidate is only marked as having a <b>conviction</b> if their
      affidavit explicitly states a court found them guilty — separate from,
      and much rarer than, a pending case.</p>

      <h2>Assets</h2>
      <p>Movable, immovable, and liability figures are exactly as declared.
      Some candidates' declared liabilities exceed their declared assets —
      that's not an error, it reflects real declared debt (for example,
      personal guarantees on business loans).</p>

      <h2>Spotted an error?</h2>
      <p>Every profile has a "Report a correction" link. We'll check it
      against the source affidavit and fix it if the site is wrong.</p>
    </div>
  `,
  about: () => `
    <a class="back" href="#/">← Map</a>
    <h1>About</h1>
    <div class="prose">
      <p><b>ssup with Andhra Pradesh</b> is a fast, sourced way to find out who
      represents you in the Andhra Pradesh Legislative Assembly, and what
      they've legally declared about their criminal cases and assets — in
      under 10 seconds, from a map you can actually read.</p>

      <p>Election data is public, but it's usually buried in PDFs and
      government portals nobody opens. We think knowing who your MLA is,
      and what's on their public record, shouldn't take more effort than
      checking the weather.</p>

      <p>Everything here comes from candidates' own sworn affidavits — see
      <a href="#/methodology">Methodology</a> for exactly how we source and
      classify it.</p>

      <p>Questions, corrections, or want this built for another state?
      Use the "Report a correction" link on any profile page.</p>
    </div>
  `
};

export function renderStatic(el, page) {
  el.innerHTML = (PAGES[page] ?? PAGES.about)();
}
