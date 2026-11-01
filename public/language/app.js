/** /language/: the language taxonomy, with the polities that ruled in each language. */
renderTaxonomyPage({
  type: 'language',
  heading: 'Language',
  lede: 'Languages nested by family and branch. Polities are counted under the language recorded as their language of rule.',
  what: 'The list of languages',
  polityValue: p => p.cultural_language,
  subName: 'sub-branches',
  subOne: 'sub-branch',
  directHeading: 'Polities that ruled in this language',
});
