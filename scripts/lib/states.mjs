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
  },
  assam: {
    name: 'Assam', code: 'as', election: 'Assam2026', myNetaState: 'ASSAM',
    geoState: 'ASSAM', districtState: 'ASSAM', year: 2026, seats: 126,
    blocked: true,
    note: 'Assam was redelimited in 2023 and the 2026 election used the new '
      + 'constituencies. The map layer here is the old set: 36 of 126 winners '
      + 'name a seat it does not contain. Needs post-2023 boundaries.',
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
  },
  goa: {
    name: 'Goa', code: 'ga', election: 'goa2022', myNetaState: 'GOA',
    geoState: 'GOA', districtState: 'GOA', year: 2022, seats: 40,
  },
  gujarat: {
    name: 'Gujarat', code: 'gj', election: 'Gujarat2022', myNetaState: 'GUJARAT',
    geoState: 'GUJARAT', districtState: 'GUJARAT', year: 2022, seats: 182,
    blocked: true,
    note: 'The map layer holds 172 of Gujarat\'s 182 constituencies; 21 winners '
      + 'name a seat it does not contain. Needs a complete assembly layer.',
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
    geoState: 'JAMMU & KASHMIR', districtState: null, year: 2024, seats: 87,
    blocked: true,
    note: 'Delimited in 2022 from 87 seats to 90, and the district shapefile '
      + 'files the territory under a name the assembly layer does not use. '
      + 'Needs post-2022 boundaries and a district layer that matches.',
  },
  jharkhand: {
    name: 'Jharkhand', code: 'jh', election: 'Jharkhand2024', myNetaState: 'JHARKHAND',
    geoState: 'JHARKHAND', districtState: 'JHARKHAND', year: 2024, seats: 81,
  },
  karnataka: {
    name: 'Karnataka', code: 'ka', election: 'Karnataka2023', myNetaState: 'KARNATAKA',
    geoState: 'KARNATAKA', districtState: 'KARNATAKA', year: 2023, seats: 224,
  },
  kerala: {
    name: 'Kerala', code: 'kl', election: 'Kerala2026', myNetaState: 'KERALA',
    geoState: 'KERALA', districtState: 'KERALA', year: 2026, seats: 140,
  },
  'madhya-pradesh': {
    name: 'Madhya Pradesh', code: 'mp', election: 'MadhyaPradesh2023', myNetaState: 'MADHYA PRADESH',
    geoState: 'MADHYA PRADESH', districtState: 'MADHYA PRADESH', year: 2023, seats: 230,
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
  },
  puducherry: {
    name: 'Puducherry', code: 'py', election: 'Puducherry2026', myNetaState: 'PUDUCHERRY',
    geoState: 'PUDUCHERRY', districtState: 'PUDUCHERRY', year: 2026, seats: 30,
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
