// Which states this site can build, and the three names each one goes by.
//
// A state is named differently by each source we hold, and none of them is
// wrong — they are just different vintages. MyNeta files Odisha's election
// under ODISHA; the assembly shapefile still says ORISSA; the district
// shapefile says ODISHA again. Rather than alias them at every call site,
// each state names all three here, once.
//
// `seats` is the highest assembly number in the map layer, which is the
// only count that matters for a record: constituency numbers come from the
// map, so a record can never carry a number the map does not have.
//
// `note` is set where the geometry and the election do not describe the
// same ground. Those states are excluded from a build until the boundary
// question is settled, because a seat filed under a neighbour's outline is
// worse than a seat that is missing.

export const STATES = {
  andhra: {
    name: 'Andhra Pradesh', code: 'ap', election: 'AndhraPradesh2024', myNetaState: 'ANDHRA PRADESH',
    geoState: 'ANDHRA PRADESH', districtState: 'ANDHRA PRADESH', year: 2024, seats: 175,
    // Built from a state-specific source, not the national one — see
    // scripts/simplify-geo.mjs. Numbered 1-175 rather than 120-294.
    geoSource: 'ap-ac',
  },
  'arunachal-pradesh': {
    name: 'Arunachal Pradesh', code: 'ar', election: 'ArunachalPradesh2024', myNetaState: 'ARUNACHAL PRADESH',
    geoState: 'ARUNACHAL PRADESH', districtState: 'ARUNACHAL PRADESH', year: 2024, seats: 60,
    // The map spells the gazetted "Dumporijo" as "Damporijo", and the
    // state also has a real, separate "Daporijo" two seats away — so the
    // name alone reaches two candidates and the join refuses. The
    // Arunachal CEO's gazette of 30 March 2024 lists this seat as
    // "26-Dumporijo(ST)" with Rode Bui among its candidates.
    // ceoarunachal.nic.in/componenthelper/getcomponentfile/19
    aliases: { 'DUMPORIJO (ST)': 26 },
  },
  assam: {
    name: 'Assam', code: 'as', election: 'Assam2026', myNetaState: 'ASSAM',
    geoState: 'ASSAM', districtState: 'ASSAM', year: 2026, seats: 126,
    // Assam was redelimited in 2023 and the 2026 election used the new
    // constituencies, which the national layer predates — only 90 of the
    // 126 winners could be placed in it. These boundaries come instead
    // from the Election Commission's own results portal, which serves the
    // layer it used to draw that election's map, so the vintage cannot be
    // wrong. Checked on arrival: 126 features, numbered 1-126 with no gap
    // or duplicate, inside Assam's bounding box, and carrying every one of
    // the 126 winners' constituency names.
    //
    //   curl --http1.1 https://results.eci.gov.in/ResultAcGenMay2026/ac/S03.js
    //
    // What it does not carry is PC_NO/PC_NAME, so Assam has no link from
    // an MLA to their MP until that comes from somewhere else.
    acFile: '.geo-src/assam-ac-2023.geojson',
  },
  bihar: {
    name: 'Bihar', code: 'br', election: 'Bihar2025', myNetaState: 'BIHAR',
    geoState: 'BIHAR', districtState: 'BIHAR', year: 2025, seats: 243,
  },
  chhattisgarh: {
    name: 'Chhattisgarh', code: 'cg', election: 'Chhattisgarh2023', myNetaState: 'CHHATTISGARH',
    geoState: 'CHHATTISGARH', districtState: 'CHHATTISGARH', year: 2023, seats: 90,
  },
  delhi: {
    name: 'Delhi', code: 'dl', election: 'Delhi2025', myNetaState: 'DELHI',
    geoState: 'DELHI', districtState: 'DELHI', year: 2025, seats: 70,
    // The assembly is filed under DELHI and the Lok Sabha under
    // "DELHI (NCT" — an unclosed bracket in the source, not a typo here.
    lokSabhaState: 'DELHI (NCT',
  },
  goa: {
    name: 'Goa', code: 'ga', election: 'goa2022', myNetaState: 'GOA',
    geoState: 'GOA', districtState: 'GOA', year: 2022, seats: 40,
  },
  gujarat: {
    name: 'Gujarat', code: 'gj', election: 'Gujarat2022', myNetaState: 'GUJARAT',
    geoState: 'GUJARAT', districtState: 'GUJARAT', year: 2022, seats: 182,
    // The national layer holds only 172 of Gujarat's 182 seats, so 21
    // winners had nowhere to go. This layer has all 182, numbered 1-182
    // with no gap, inside Gujarat's bounding box, with AC 1 Abdasa and
    // AC 182 Umbergaon as they should be. Six junk polygons with ac_no 0
    // were dropped before it was saved.
    //
    //   gist.github.com/shreshthmohan/d3b4870d99d0d9609a812f2b09b7550c
    //
    // The Election Commission's results portal — the source Assam and
    // Jammu & Kashmir use — did not publish a boundary layer for Gujarat's
    // December 2022 election; the portal gained that feature later. This
    // was checked against the Internet Archive rather than assumed.
    acFile: '.geo-src/gujarat-ac.geojson',
    acFields: { ac_no: 'AC_NO', ac_name: 'AC_NAME', pc_no: 'PC_NO', pc_name: 'PC_NAME' },
    // Kalol is two different seats — one in Gandhinagar, one in
    // Panchmahals — and the layer names both simply "Kalol".
    aliases: {
      'KALOL-GANDHINAGAR': { number: 38, name: 'Kalol (Gandhinagar)' },
      'KALOL-PANCHMAHALS': { number: 127, name: 'Kalol (Panchmahals)' },
    },
  },
  haryana: {
    name: 'Haryana', code: 'hr', election: 'Haryana2024', myNetaState: 'HARYANA',
    geoState: 'HARYANA', districtState: 'HARYANA', year: 2024, seats: 90,
  },
  'himachal-pradesh': {
    name: 'Himachal Pradesh', code: 'hp', election: 'HimachalPradesh2022', myNetaState: 'HIMACHAL PRADESH',
    geoState: 'HIMACHAL PRADESH', districtState: 'HIMACHAL PRADESH', year: 2022, seats: 68,
  },
  'jammu-kashmir': {
    name: 'Jammu & Kashmir', code: 'jk', election: 'JammuKashmir2024', myNetaState: 'JAMMU & KASHMIR',
    geoState: 'JAMMU & KASHMIR', districtState: 'JAMMU AND KASHMIR', year: 2024, seats: 90,
    lokSabhaState: 'JAMMU AND KASHMIR',
    // Delimited in 2022 from 87 seats to 90, which the national layer
    // predates. These are the Election Commission's own boundaries for
    // the October 2024 election, recovered from the Internet Archive
    // because the portal serves only the current cycle:
    //
    //   results.eci.gov.in/AcResultGenOct2024/ac/U08.js
    //
    // Checked on arrival: 90 features numbered 1-90, AC 1 Karnah and AC 90
    // Mendhar (ST) as the delimitation order has them, inside Indian-
    // administered Jammu & Kashmir with no Ladakh in the box. Four junk
    // polygons named "NA" were dropped before it was saved.
    //
    // The district layer files the territory as JAMMU AND KASHMIR, spelled
    // out, which is why nothing matched before. Two of its 22 districts,
    // Mirpur and Muzaffarabad, are Pakistan-administered; no constituency
    // falls inside either, so they never reach the map.
    acFile: '.geo-src/jk-ac-2022.geojson',
  },
  jharkhand: {
    name: 'Jharkhand', code: 'jh', election: 'Jharkhand2024', myNetaState: 'JHARKHAND',
    geoState: 'JHARKHAND', districtState: 'JHARKHAND', year: 2024, seats: 81,
  },
  karnataka: {
    name: 'Karnataka', code: 'ka', election: 'Karnataka2023', myNetaState: 'KARNATAKA',
    geoState: 'KARNATAKA', districtState: 'KARNATAKA', year: 2023, seats: 224,
    // Two seats a spelling apart and three hundred kilometres apart:
    // Vijay Nagar in Bengaluru (167) and Vijayanagara in the district of
    // that name (90). MyNeta files this one under B.B.M.P (South) —
    // Bruhat Bengaluru Mahanagara Palike — which the map's own corrupted
    // district string cannot be matched against. ECI Form 20 for the 2023
    // election gives "167 Vijayanagar", won by M. Krishnappa, which is
    // the member this row carries.
    // data.opencity.in — Karnataka Assembly Elections 2023 Form 20s
    aliases: { VIJAYANAGAR: 167 },
  },
  kerala: {
    name: 'Kerala', code: 'kl', election: 'Kerala2026', myNetaState: 'KERALA',
    geoState: 'KERALA', districtState: 'KERALA', year: 2026, seats: 140,
  },
  'madhya-pradesh': {
    name: 'Madhya Pradesh', code: 'mp', election: 'MadhyaPradesh2023', myNetaState: 'MADHYA PRADESH',
    geoState: 'MADHYA PRADESH', districtState: 'MADHYA PRADESH', year: 2023, seats: 230,
    // Joura in Morena (4) against Jaora in Ratlam (222) — a spelling
    // apart, two hundred kilometres apart. The winner's own sworn
    // affidavit reads "Jaura 04 constituency ... Dist. Morena", and the
    // Morena district administration numbers it 04.
    // morena.nic.in/en/byelectionen/
    aliases: { JAURA: 4 },
    note: 'The map layer holds 226 of the 230 constituencies. Three winners '
      + 'name a seat it does not contain.',
  },
  maharashtra: {
    name: 'Maharashtra', code: 'mh', election: 'Maharashtra2024', myNetaState: 'MAHARASHTRA',
    geoState: 'MAHARASHTRA', districtState: 'MAHARASHTRA', year: 2024, seats: 288,
  },
  manipur: {
    name: 'Manipur', code: 'mn', election: 'manipur2022', myNetaState: 'MANIPUR',
    geoState: 'MANIPUR', districtState: 'MANIPUR', year: 2022, seats: 60,
  },
  meghalaya: {
    name: 'Meghalaya', code: 'ml', election: 'Meghalaya2023', myNetaState: 'MEGHALAYA',
    geoState: 'MEGHALAYA', districtState: 'MEGHALAYA', year: 2023, seats: 60,
  },
  mizoram: {
    name: 'Mizoram', code: 'mz', election: 'Mizoram2023', myNetaState: 'MIZORAM',
    geoState: 'MIZORAM', districtState: 'MIZORAM', year: 2023, seats: 40,
  },
  nagaland: {
    name: 'Nagaland', code: 'nl', election: 'Nagaland2023', myNetaState: 'NAGALAND',
    geoState: 'NAGALAND', districtState: 'NAGALAND', year: 2023, seats: 60,
  },
  odisha: {
    name: 'Odisha', code: 'od', election: 'Odisha2024', myNetaState: 'ODISHA',
    geoState: 'ORISSA', districtState: 'ODISHA', year: 2024, seats: 147,
    // Madhya and Uttar are Central and North; MyNeta prints both the
    // English and the Odia, the map prints only the Odia. The Odisha
    // CEO's own constituency maps are titled "112-bhubaneswar central
    // (madhya)" and "113-bhubaneswar north (uttar)".
    // ceoodisha.nic.in/acmaps/AC112.pdf and AC113.pdf
    aliases: {
      'BHUBANESWAR CENTRAL (MADHYA)': 112,
      'BHUBANESWAR NORTH (UTTAR)': 113,
    },
  },
  puducherry: {
    name: 'Puducherry', code: 'py', election: 'Puducherry2026', myNetaState: 'PUDUCHERRY',
    geoState: 'PUDUCHERRY', districtState: 'PUDUCHERRY', year: 2026, seats: 30,
    // The map still calls the parliamentary seat Pondicherry.
    pcAliases: { PUDUCHERRY: 'PONDICHERRY' },
  },
  punjab: {
    name: 'Punjab', code: 'pb', election: 'punjab2022', myNetaState: 'PUNJAB',
    geoState: 'PUNJAB', districtState: 'PUNJAB', year: 2022, seats: 117,
  },
  rajasthan: {
    name: 'Rajasthan', code: 'rj', election: 'Rajasthan2023', myNetaState: 'RAJASTHAN',
    geoState: 'RAJASTHAN', districtState: 'RAJASTHAN', year: 2023, seats: 200,
  },
  sikkim: {
    name: 'Sikkim', code: 'sk', election: 'Sikkim2024', myNetaState: 'SIKKIM',
    geoState: 'SIKKIM', districtState: 'SIKKIM', year: 2024, seats: 31,
    note: 'Sikkim elects 32 members. The thirty-second, Sangha, is the '
      + 'monastery seat: its electorate is the sangha rather than a place, so '
      + 'it has no boundary on any map and no record is built for it.',
  },
  'tamil-nadu': {
    name: 'Tamil Nadu', code: 'tn', election: 'TamilNadu2026', myNetaState: 'TAMILNADU',
    geoState: 'TAMIL NADU', districtState: 'TAMIL NADU', year: 2026, seats: 234,
    lokSabhaState: 'TAMIL NADU',
    // Three the map cannot answer for itself.
    //
    // Tiruchirappalli West and East are both filed as plain
    // "Tiruchirappalli", so nothing in the name can separate 140 from
    // 141. The Tiruchirappalli district administration numbers them —
    // tiruchirappalli.nic.in/140-trichy-west/ and /141-trichy-east/ —
    // and the winner's own affidavit says "Tiruchirapalli West 140".
    //
    // Gingee is worse than a spelling difference: the shapefile gives
    // AC 70 the name "Vandavasi (SC)", which is AC 69's name copied
    // onto it. The polygon itself is right — spatially joined it lands
    // in Viluppuram, and its centre is at Gingee town — but no amount
    // of name matching can find a seat labelled as its neighbour.
    // viluppuram.nic.in/70-gingee-assembly-constituency-ssr-2025/
    aliases: {
      'TIRUCHIRAPPALLI (WEST)': 140,
      'TIRUCHIRAPPALLI (EAST)': 141,
      GINGEE: { number: 70, name: 'Gingee' },
    },
  },
  telangana: {
    name: 'Telangana', code: 'tg', election: 'Telangana2023', myNetaState: 'TELANGANA',
    geoState: 'ANDHRA PRADESH', districtState: 'TELANGANA', year: 2023, seats: 119,
    // Filed inside undivided Andhra's 1-294; the first 119 are Telangana's.
    geoSource: 'undivided-andhra',
  },
  tripura: {
    name: 'Tripura', code: 'tr', election: 'Tripura2023', myNetaState: 'TRIPURA',
    geoState: 'TRIPURA', districtState: 'TRIPURA', year: 2023, seats: 60,
  },
  'uttar-pradesh': {
    name: 'Uttar Pradesh', code: 'up', election: 'uttarpradesh2022', myNetaState: 'UTTAR PRADESH',
    geoState: 'UTTAR PRADESH', districtState: 'UTTAR PRADESH', year: 2022, seats: 403,
  },
  uttarakhand: {
    name: 'Uttarakhand', code: 'uk', election: 'uttarakhand2022', myNetaState: 'UTTARAKHAND',
    geoState: 'UTTARKHAND', districtState: 'UTTARAKHAND', year: 2022, seats: 70,
    // Cantonment against Cantt., and Manglore against Manglaur.
    // dehradun.nic.in numbers the first 21; haridwar.nic.in numbers the
    // second 33. Manglaur matters twice over: its sitting member won a
    // by-election in July 2024, and that row could not place until this.
    aliases: { 'DEHRADUN CANTONMENT': 21, MANGLORE: 33 },
  },
  'west-bengal': {
    name: 'West Bengal', code: 'wb', election: 'WestBengal2026', myNetaState: 'WEST BENGAL',
    geoState: 'WEST BENGAL', districtState: 'WEST BENGAL', year: 2026, seats: 294,
  },
};

/** The states a build may attempt.
 *
 *  `blocked` marks the ones whose geometry and election do not describe the
 *  same ground — a seat filed under a neighbour's outline is worse than a
 *  seat that is missing, so those wait for better boundaries. A `note`
 *  without `blocked` is a known gap the state ships with, the way Andhra
 *  ships 174 of its 175. */
export const buildable = () => Object.entries(STATES)
  .filter(([, s]) => !s.blocked)
  .map(([slug]) => slug);

export function stateConfig(slug) {
  const s = STATES[slug];
  if (!s) throw new Error(`no state configured for "${slug}" — see scripts/lib/states.mjs`);
  return { slug, ...s };
}
