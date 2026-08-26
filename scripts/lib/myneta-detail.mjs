// What a MyNeta candidate page says about one person.
//
// The constituency listing gives a name, a party and a case count; the
// affidavit page behind it gives the rest — movable and immovable assets
// separately, liabilities, education, age, profession, and the tables of
// cases where charges were framed and where the person was convicted.
// Those are the fields the Andhra records carry, so they are the fields
// a second state has to carry too.

const digits = (s) => Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;

/** The plain text of a page, with the markup and the entities gone. */
export function textOf(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** The grand total on a MyNeta assets or liabilities table.
 *
 *  Each table ends in a totals row, and the row's last money value is the
 *  sum across self, spouse, HUF and dependants. The label is not one
 *  string: movable says "Totals (Calculated as Sum of Values)", immovable
 *  says "Totals Calculated" under a market-value row that says something
 *  else again. Any row that starts with "Total" is taken, and the last
 *  such row wins — the calculated one always follows the affidavit one. */
export function tableTotal(html, id) {
  const table = String(html ?? '').match(new RegExp(`<table id=${id}[\\s\\S]*?</table>`, 'i'));
  if (!table) return null;
  let found = null;
  for (const row of table[0].match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const text = textOf(row).trim();
    if (!/^totals?\b/i.test(text)) continue;
    const money = text.match(/Rs\s*([\d,]+)/g);
    if (money?.length) found = digits(money[money.length - 1]);
    // A totals row of nothing but "Nil" is a declared zero, not a gap.
    // Reading it as absent reported "not declared" for twelve members
    // whose affidavit says, in as many words, that they have none.
    else if (/\bNil\b/i.test(text)) found = 0;
  }
  return found;
}

/** How many cases the "Cases where Convicted" table lists.
 *
 *  Located by its heading, not by the table's id: the charges-framed
 *  table and this one share `id=cases`, and reading the first of them
 *  reported no convictions for people with convictions — a false "no"
 *  is the worst thing this file could produce. MyNeta prints the table
 *  whether or not it holds anything, with "No Cases" where it does not,
 *  so its emptiness means zero and its absence means the page is not
 *  one of these. */
export function convictedCount(html) {
  const at = String(html ?? '').search(/Cases where Convicted/i);
  if (at === -1) return 0;
  const table = String(html).slice(at).match(/<table[\s\S]*?<\/table>/i);
  if (!table) return 0;
  if (/No Cases/i.test(textOf(table[0]))) return 0;
  return (table[0].match(/<tr[\s\S]*?<\/tr>/gi) ?? [])
    .filter((r) => /^\d+\s/.test(textOf(r).trim())).length;
}

// ADR's own categories, longest first so "Post Graduate" is not read as
// "Post" and "10th Pass" not as "10th".
const EDUCATION = [
  'Graduate Professional', 'Post Graduate', 'Doctorate', 'Graduate',
  '12th Pass', '10th Pass', '8th Pass', '5th Pass', 'Literate', 'Illiterate',
  'Others', 'Not Given',
];

export function parseCandidateDetail(html) {
  const t = textOf(html);
  const one = (re) => t.match(re)?.[1]?.trim() ?? null;

  let movable = tableTotal(html, 'movable_assets');
  const immovable = tableTotal(html, 'immovable_assets');
  const declaredAssets = one(/Assets:\s*Rs\s*([\d,]+)/);
  // MyNeta writes a declared zero as "Nil" in the headline too.
  const liabilitiesLine = t.match(/Liabilities:\s*(?:Rs\s*([\d,]+)|(Nil))/);
  const liabilities = tableTotal(html, 'liabilities')
    ?? (liabilitiesLine ? (liabilitiesLine[2] ? 0 : digits(liabilitiesLine[1])) : null);

  // Where a page carries no movable table at all — MyNeta prints
  // "Movable Assets : No Problems in Reading Affidavit Information" and
  // nothing else — the figure is still published, as the difference
  // between the declared total and the immovable table. That is
  // arithmetic on MyNeta's own numbers, and it reproduces the Andhra
  // records to the rupee.
  const declared = declaredAssets ? digits(declaredAssets) : null;
  if (movable == null && declared != null && immovable != null) movable = declared - immovable;

  const eduAt = t.indexOf('Educational Details Category:');
  const eduText = eduAt === -1 ? '' : t.slice(eduAt + 29, eduAt + 320);
  const educationLevel = EDUCATION.find((lvl) => eduText.trim().startsWith(lvl)) ?? null;
  const educationDetail = educationLevel
    ? (eduText.trim().slice(educationLevel.length).split('Details of PAN')[0].trim() || null)
    : null;

  return {
    cases: one(/Criminal Cases:\s*(\d+)/) ? Number(one(/Criminal Cases:\s*(\d+)/)) : 0,
    convicted: convictedCount(html),
    movable,
    immovable,
    // The parts when both are there — that is how the Andhra records
    // total it — and MyNeta's own headline figure when they are not.
    // MyNeta's own headline figure where it prints one; the two parts
    // added up where it does not.
    assets: declared ?? ((movable != null && immovable != null) ? movable + immovable : null),
    liabilities,
    education: { level: educationLevel, detail: educationDetail || null },
    age: one(/\bAge:\s*(\d+)/) ? Number(one(/\bAge:\s*(\d+)/)) : null,
    profession: one(/\bProfession:\s*([\s\S]{0,80}?)\s*(?:Spouse Profession|Contact|Self Profession|$)/),
  };
}
