const MOCK_QUERIES = [
  { _id: 'q1', index: 1, text: 'the hunger games', description: 'Popular fiction — title-only baseline', category: 'baseline', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q2', index: 2, text: 'pride and prejudice', description: 'Classic fiction — title-only baseline', category: 'baseline', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q3', index: 3, text: 'colleen hoover', description: 'Bestselling author — author-only baseline', category: 'baseline', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q4', index: 4, text: 'dune frank herbert', description: 'Title + author combo baseline', category: 'baseline', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q5', index: 5, text: 'gone girl', description: 'Trad thriller baseline', category: 'baseline', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q6', index: 6, text: 'sapiens', description: 'Non-fiction baseline', category: 'baseline', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q7', index: 7, text: 'harry poter', description: 'Misspelled famous title — fuzzy matching baseline', category: 'typo', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q8', index: 8, text: 'collen hoover', description: 'Misspelled famous author — fuzzy matching baseline', category: 'typo', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q9', index: 9, text: 'frenkenstein', description: 'Misspelled classic — fuzzy matching baseline', category: 'typo', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q10', index: 10, text: 'fourth wign', description: 'Misspelled recent bestseller (Fourth Wing) — fuzzy on newer titles', category: 'typo', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q11', index: 11, text: 'icebreacker hannah grace', description: 'Misspelled indie romance — fuzzy matching on indie title', category: 'typo', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q12', index: 12, text: 'the housemade', description: 'Misspelled Kindle-first thriller (The Housemaid) — fuzzy on self-pub', category: 'typo', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q13', index: 13, text: 'lord of the', description: 'Partial famous title — truncated mid-phrase', category: 'partial', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q14', index: 14, text: 'game of', description: 'Partial famous title — truncated mid-phrase', category: 'partial', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q15', index: 15, text: 'catcher in', description: 'Partial famous title — truncated mid-phrase', category: 'partial', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q16', index: 16, text: 'wheel of time', description: 'Famous fantasy series — multi-book disambiguation', category: 'series', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q17', index: 17, text: 'twisted ana huang', description: 'Indie romance series + author — series disambiguation', category: 'series', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q18', index: 18, text: 'cradle will wight', description: 'Self-published progression fantasy series — niche series handling', category: 'series', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q19', index: 19, text: 'it ends with us', description: 'Contemporary romance — trad-published bestseller', category: 'romance-trad', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q20', index: 20, text: 'the love hypothesis', description: 'Contemporary romance — trad-published bestseller', category: 'romance-trad', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q21', index: 21, text: 'icebreaker hannah grace', description: 'Sports romance — indie / Kindle-first', category: 'romance-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q22', index: 22, text: 'things we never got over', description: 'Small-town romance — indie breakout', category: 'romance-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q23', index: 23, text: 'behind the net', description: 'Sports romance — indie title', category: 'romance-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q24', index: 24, text: 'the wall of winnipeg', description: 'Sports romance — indie title', category: 'romance-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q25', index: 25, text: 'king of wrath ana huang', description: 'Indie romance — BookTok-driven', category: 'romance-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q26', index: 26, text: 'binding 13 chloe walsh', description: 'Sports romance — indie / self-published', category: 'romance-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q27', index: 27, text: 'bloom ej blaise', description: 'Romance — KU-only (2024–2025)', category: 'romance-recent', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q28', index: 28, text: 'bourbon and lies victoria wilder', description: 'Romance — KU-only (2024–2025)', category: 'romance-recent', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q29', index: 29, text: 'rare blend michelle mosley', description: 'Romance — KU-only (2024–2025)', category: 'romance-recent', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q30', index: 30, text: 'mile high liz tomforde', description: 'Indie sports romance — self-published', category: 'romance-recent', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q31', index: 31, text: 'haunting adeline hd carlton', description: 'Dark romance — self-published, BookTok phenomenon', category: 'romance-recent', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q32', index: 32, text: 'the housemaid freida mcfadden', description: 'Thriller — Kindle-first / self-published breakout', category: 'thriller-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q33', index: 33, text: 'never lie', description: 'Thriller — Kindle-first title', category: 'thriller-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q34', index: 34, text: 'the inmate', description: 'Thriller — Kindle-first title', category: 'thriller-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q35', index: 35, text: 'just the nicest couple mary kubica', description: 'Thriller — mid-tier trad, not a mega-bestseller', category: 'thriller-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q36', index: 36, text: 'julie chan is dead', description: 'Thriller — recent lesser-known (2025)', category: 'thriller-recent', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q37', index: 37, text: 'imaginary strangers minka kent', description: 'Thriller — recent indie (2025)', category: 'thriller-recent', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q38', index: 38, text: 'dungeon crawler carl', description: 'Self-published LitRPG — tests niche genre indexing', category: 'fantasy-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q39', index: 39, text: 'legends and lattes travis baldree', description: 'Cozy fantasy — indie-to-trad crossover', category: 'fantasy-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q40', index: 40, text: 'zodiac academy jaymin eve', description: 'Indie fantasy academy romance — self-published series', category: 'fantasy-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q41', index: 41, text: 'he who fights with monsters', description: 'Self-published progression fantasy — web serial origin', category: 'fantasy-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q42', index: 42, text: 'the atlas six olivie blake', description: 'Started self-published, later picked up by trad', category: 'fantasy-indie', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q43', index: 43, text: '百年孤独', description: 'Non-English title — Chinese (One Hundred Years of Solitude)', category: 'non-english', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q44', index: 44, text: 'les misérables', description: 'Non-English title — French with accented characters', category: 'non-english', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q45', index: 45, text: 'one hundred years of solitude', description: 'Translated title in English', category: 'translated', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q46', index: 46, text: 'the little prince', description: 'Translated title in English', category: 'translated', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q47', index: 47, text: 'percy jackson', description: 'Children / YA series', category: 'edge-case', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q48', index: 48, text: '978-0-06-112008-4', description: 'ISBN — exact identifier lookup', category: 'edge-case', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q49', index: 49, text: 'house of leaves danielewski', description: 'Niche / obscure — cult classic, long-tail coverage', category: 'edge-case', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
  { _id: 'q50', index: 50, text: 'the road', description: 'Ambiguous / generic title — disambiguation test', category: 'edge-case', createdAt: '2026-02-07T00:00:00Z', updatedAt: '2026-02-07T00:00:00Z' },
];

export function getQueries(category = null) {
  if (category) {
    return MOCK_QUERIES.filter((q) => q.category === category);
  }
  return [...MOCK_QUERIES];
}

export function getQueryByIndex(index) {
  return MOCK_QUERIES.find((q) => q.index === Number(index)) || null;
}
