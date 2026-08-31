// Plain names for the budget's official ones.
//
// The figures on the budget page are exact and the headings above them
// were not: "Grants-in-aid from Centre" and "Welfare of SC, ST, OBC, and
// Minorities" are the state's own words, and they assume a reader who
// already knows the vocabulary. A page nobody can read is not
// transparent, whatever it discloses.
//
// So each one gets a plain phrase, and the official name stays printed
// underneath it. The plain phrase is ours — an editorial choice, marked as
// such on the page — and the official name is the budget's, so any figure
// here can still be found in the source document by the name it uses
// there. Nothing is renamed away; a name is added.
//
// Keyed on PRS's own headings, which are the same across all thirty-one
// states, so this reads for the country and not just for Andhra.

const SECTORS = {
  'Welfare of SC, ST, OBC, and Minorities': 'Pensions and support for scheduled castes, tribes and other groups',
  'Education, Sports, Arts and Culture': 'Schools, colleges and teachers',
  'Health and Family Welfare': 'Hospitals, clinics and doctors',
  'Rural Development': 'Villages — roads, work schemes, housing',
  'Irrigation and Flood Control': 'Canals, dams and keeping rivers from flooding',
  'Agriculture and Allied Activities': 'Farming, and helping farmers',
  Energy: 'Electricity',
  'Urban Development': 'Towns and cities',
  'Social Welfare and Nutrition': 'Food, and help for people who need it',
  Transport: 'Roads, bridges and buses',
  'Water Supply and Sanitation': 'Drinking water, drains and toilets',
  'Police': 'Police',
  'Housing': 'Housing',
  'Everything else': 'Everything else the state pays for',
};

const RECEIPTS = {
  "State's Own Tax": 'Taxes the state collects itself',
  "State's Own Non-Tax": 'Other money the state earns',
  'Share in Central Taxes': 'Its share of taxes collected for the whole country',
  'Grants-in-aid from Centre': 'Grants sent by the central government',
  'Non-debt Capital Receipts': 'Money from selling things it owns, and loans repaid to it',
  'Fiscal Deficit': 'Borrowed — it has to pay this back later',
};

/** The plain phrase for an official name, or null where none is written.
 *  Null rather than a guess: a sector this file has not seen before keeps
 *  its own name and says nothing it cannot stand behind. */
export const plainSector = (name) => SECTORS[name] ?? null;
export const plainReceipt = (name) => RECEIPTS[name] ?? null;
