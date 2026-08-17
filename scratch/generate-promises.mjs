import fs from 'node:fs';
import path from 'node:path';

const andhraDir = 'content/states/andhra';

const promiseSet = {
  id: 'nda-2024',
  title: 'NDA Super Six Manifesto 2024',
  parties: ['TDP', 'JSP', 'BJP'],
  election: '2024',
  source_url: 'https://tdp.com/' // placeholder
};

fs.writeFileSync(path.join(andhraDir, 'promise-sets', 'nda-2024.json'), JSON.stringify(promiseSet, null, 2));

const promises = [
  {
    id: 'free-bus-women',
    promise_set: 'nda-2024',
    parties: ['TDP', 'JSP', 'BJP'],
    headline: 'Free bus travel for women',
    original_text: 'Free travel for women in state-run RTC buses under the Super Six guarantees.',
    original_source: { label: 'NDA Manifesto 2024', url: 'https://ap.gov.in' },
    explainer: 'Women across Andhra Pradesh can travel for free in standard state-run buses.',
    category: 'transport',
    beneficiaries: 'All women in AP',
    status: 'announced',
    status_since: '2024-06-12',
    status_reason: 'The scheme has been officially announced by the Chief Minister, with guidelines being formulated.',
    evidence: [
      { date: '2024-06-12', type: 'news', label: 'News report of announcement', url: 'https://www.thehindu.com/' }
    ]
  },
  {
    id: 'aadabidda-nidhi',
    promise_set: 'nda-2024',
    parties: ['TDP', 'JSP', 'BJP'],
    headline: '₹1,500 monthly for women',
    original_text: 'Aadabidda Nidhi: A monthly grant of ₹1,500 for women aged 19 to 59.',
    original_source: { label: 'NDA Manifesto 2024', url: 'https://ap.gov.in' },
    explainer: 'Financial assistance to women in the specified age group to support household income.',
    category: 'welfare',
    beneficiaries: 'Women aged 19 to 59',
    status: 'not_started',
    status_since: '2024-06-12',
    status_reason: 'Pending rollout and government order.',
    evidence: [
      { date: '2024-06-12', type: 'official', label: 'Manifesto pledge', url: 'https://ap.gov.in' }
    ]
  },
  {
    id: 'thalliki-vandanam',
    promise_set: 'nda-2024',
    parties: ['TDP', 'JSP', 'BJP'],
    headline: '₹15,000 per year for school children',
    original_text: 'Thalliki Vandanam: Financial assistance of ₹15,000 per year to mothers for the education of their school-going children.',
    original_source: { label: 'NDA Manifesto 2024', url: 'https://ap.gov.in' },
    explainer: 'Aimed at reducing dropout rates by supporting mothers of school-going children.',
    category: 'education',
    beneficiaries: 'Mothers of school-going children',
    status: 'not_started',
    status_since: '2024-06-12',
    status_reason: 'Pending rollout.',
    evidence: [
      { date: '2024-06-12', type: 'official', label: 'Manifesto pledge', url: 'https://ap.gov.in' }
    ]
  },
  {
    id: 'annadata-sukhibhava',
    promise_set: 'nda-2024',
    parties: ['TDP', 'JSP', 'BJP'],
    headline: '₹20,000 per year for farmers',
    original_text: 'Annadata Sukhibhava: An annual financial assistance of ₹20,000 to every farmer.',
    original_source: { label: 'NDA Manifesto 2024', url: 'https://ap.gov.in' },
    explainer: 'Direct cash transfer to farmers to help with agricultural input costs.',
    category: 'agriculture',
    beneficiaries: 'Farmers in AP',
    status: 'not_started',
    status_since: '2024-06-12',
    status_reason: 'Pending rollout.',
    evidence: [
      { date: '2024-06-12', type: 'official', label: 'Manifesto pledge', url: 'https://ap.gov.in' }
    ]
  },
  {
    id: 'deepam-cylinders',
    promise_set: 'nda-2024',
    parties: ['TDP', 'JSP', 'BJP'],
    headline: '3 free gas cylinders annually',
    original_text: 'Deepam Scheme: Provision of three free cooking gas cylinders annually to every household.',
    original_source: { label: 'NDA Manifesto 2024', url: 'https://ap.gov.in' },
    explainer: 'Subsidizes cooking gas for all eligible households.',
    category: 'welfare',
    beneficiaries: 'All eligible households',
    status: 'not_started',
    status_since: '2024-06-12',
    status_reason: 'Pending rollout.',
    evidence: [
      { date: '2024-06-12', type: 'official', label: 'Manifesto pledge', url: 'https://ap.gov.in' }
    ]
  },
  {
    id: 'unemployment-allowance',
    promise_set: 'nda-2024',
    parties: ['TDP', 'JSP', 'BJP'],
    headline: '20 lakh jobs & ₹3,000 allowance',
    original_text: 'A commitment to create 20 lakh jobs for youth, or provide a monthly unemployment allowance of ₹3,000 until employment is secured.',
    original_source: { label: 'NDA Manifesto 2024', url: 'https://ap.gov.in' },
    explainer: 'Supports unemployed youth while focusing on job creation and skill development.',
    category: 'employment',
    beneficiaries: 'Unemployed youth',
    status: 'not_started',
    status_since: '2024-06-12',
    status_reason: 'Pending skill census and policy framework.',
    evidence: [
      { date: '2024-06-12', type: 'official', label: 'Manifesto pledge', url: 'https://ap.gov.in' }
    ]
  }
];

promises.forEach(p => {
  fs.writeFileSync(path.join(andhraDir, 'promises', `${p.id}.json`), JSON.stringify(p, null, 2));
});
