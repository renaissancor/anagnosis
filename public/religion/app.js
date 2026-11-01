/** /religion/: the religion taxonomy, with the polities that held each as state religion. */
renderTaxonomyPage({
  type: 'religion',
  heading: 'Religion',
  lede: 'Religions nested by tradition and branch. Polities are counted under the religion recorded as their state religion.',
  what: 'The list of religions',
  polityValue: p => p.ideology?.religion,
  subName: 'branches',
  subOne: 'branch',
  directHeading: 'Polities with this state religion',
});
