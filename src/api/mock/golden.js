let nextId = 6;

let MOCK_GOLDEN_RESULTS = [
  {
    _id: 'golden1',
    queryIndex: 1,
    books: [
      { rank: 1, title: 'The Hunger Games', author: 'Suzanne Collins' },
      { rank: 2, title: 'Catching Fire', author: 'Suzanne Collins' },
      { rank: 3, title: 'Mockingjay', author: 'Suzanne Collins' },
      { rank: 4, title: 'The Ballad of Songbirds and Snakes', author: 'Suzanne Collins' },
    ],
    createdAt: '2026-02-07T14:00:00Z',
    updatedAt: '2026-02-07T14:00:00Z',
  },
  {
    _id: 'golden2',
    queryIndex: 2,
    books: [
      { rank: 1, title: 'Pride and Prejudice', author: 'Jane Austen' },
      { rank: 2, title: 'Pride and Prejudice and Zombies', author: 'Seth Grahame-Smith' },
    ],
    createdAt: '2026-02-07T14:05:00Z',
    updatedAt: '2026-02-07T14:05:00Z',
  },
  {
    _id: 'golden3',
    queryIndex: 5,
    books: [
      { rank: 1, title: 'Gone Girl', author: 'Gillian Flynn' },
      { rank: 2, title: 'Gone Girl: A Novel', author: 'Gillian Flynn' },
    ],
    createdAt: '2026-02-07T14:10:00Z',
    updatedAt: '2026-02-07T14:10:00Z',
  },
  {
    _id: 'golden4',
    queryIndex: 7,
    books: [
      { rank: 1, title: "Harry Potter and the Sorcerer's Stone", author: 'J.K. Rowling' },
      { rank: 2, title: 'Harry Potter and the Chamber of Secrets', author: 'J.K. Rowling' },
      { rank: 3, title: 'Harry Potter and the Prisoner of Azkaban', author: 'J.K. Rowling' },
      { rank: 4, title: 'Harry Potter and the Goblet of Fire', author: 'J.K. Rowling' },
      { rank: 5, title: 'Harry Potter and the Order of the Phoenix', author: 'J.K. Rowling' },
    ],
    createdAt: '2026-02-07T14:15:00Z',
    updatedAt: '2026-02-07T14:15:00Z',
  },
  {
    _id: 'golden5',
    queryIndex: 19,
    books: [
      { rank: 1, title: 'It Ends with Us', author: 'Colleen Hoover' },
      { rank: 2, title: 'It Starts with Us', author: 'Colleen Hoover' },
    ],
    createdAt: '2026-02-07T14:20:00Z',
    updatedAt: '2026-02-07T14:20:00Z',
  },
];

export function getGoldenResults() {
  return MOCK_GOLDEN_RESULTS
    .filter((g) => g.books.length > 0)
    .sort((a, b) => a.queryIndex - b.queryIndex);
}

export function getGoldenResultByQueryIndex(queryIndex) {
  return MOCK_GOLDEN_RESULTS.find((g) => g.queryIndex === Number(queryIndex)) || null;
}

export function saveGoldenResult(queryIndex, body) {
  const qIndex = Number(queryIndex);
  if (isNaN(qIndex) || qIndex < 1 || qIndex > 50) {
    throw new Error('queryIndex must be between 1 and 50');
  }

  const { books } = body;
  if (!Array.isArray(books)) {
    throw new Error('books must be an array');
  }
  if (books.length > 9) {
    throw new Error('Maximum 9 books allowed');
  }

  for (const book of books) {
    if (!book.title?.trim() || !book.author?.trim()) {
      throw new Error('Each book must have a title and author');
    }
  }

  const rankedBooks = books.map((b, i) => ({
    rank: b.rank || i + 1,
    title: b.title.trim(),
    author: b.author.trim(),
  }));

  const now = new Date().toISOString();
  const existing = MOCK_GOLDEN_RESULTS.find((g) => g.queryIndex === qIndex);

  if (existing) {
    existing.books = rankedBooks;
    existing.updatedAt = now;
    return { ...existing };
  }

  const id = nextId++;
  const newResult = {
    _id: `golden${id}`,
    queryIndex: qIndex,
    books: rankedBooks,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_GOLDEN_RESULTS.push(newResult);
  return { ...newResult };
}
