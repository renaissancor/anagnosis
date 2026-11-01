/** /ethnicity/: the peoples taxonomy, with the polities each people ruled. */
renderTaxonomyPage({
  type: 'ethnicity',
  heading: 'Peoples',
  lede: 'Peoples and ethnic groupings, nested by the taxonomy. Polities are counted under the people recorded as their rulers.',
  what: 'The list of peoples',
  polityValue: p => p.ruling_ethnicity,
  subName: 'sub-groups',
  subOne: 'sub-group',
  directHeading: 'Polities ruled by this people',
});
