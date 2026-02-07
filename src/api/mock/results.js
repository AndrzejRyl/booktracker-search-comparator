let nextId = 8;

let MOCK_RESULTS = [
  {
    _id: 'res1',
    appId: 'app1',
    queryIndex: 1,
    screenshots: ['/uploads/results/mock-goodreads-q1.png'],
    books: [
      { rank: 1, title: 'The Hunger Games', author: 'Suzanne Collins' },
      { rank: 2, title: 'Catching Fire', author: 'Suzanne Collins' },
      { rank: 3, title: 'Mockingjay', author: 'Suzanne Collins' },
    ],
    createdAt: '2026-02-07T10:00:00Z',
    updatedAt: '2026-02-07T10:00:00Z',
  },
  {
    _id: 'res2',
    appId: 'app1',
    queryIndex: 2,
    screenshots: ['/uploads/results/mock-goodreads-q2.png'],
    books: [
      { rank: 1, title: 'Pride and Prejudice', author: 'Jane Austen' },
      { rank: 2, title: 'Pride and Prejudice and Zombies', author: 'Seth Grahame-Smith' },
    ],
    createdAt: '2026-02-07T10:05:00Z',
    updatedAt: '2026-02-07T10:05:00Z',
  },
  {
    _id: 'res3',
    appId: 'app1',
    queryIndex: 5,
    screenshots: ['/uploads/results/mock-goodreads-q5.png'],
    books: [
      { rank: 1, title: 'Gone Girl', author: 'Gillian Flynn' },
      { rank: 2, title: 'Dark Places', author: 'Gillian Flynn' },
      { rank: 3, title: 'Sharp Objects', author: 'Gillian Flynn' },
    ],
    createdAt: '2026-02-07T10:10:00Z',
    updatedAt: '2026-02-07T10:10:00Z',
  },
  {
    _id: 'res4',
    appId: 'app2',
    queryIndex: 1,
    screenshots: [
      '/uploads/results/mock-hardcover-q1-1.png',
      '/uploads/results/mock-hardcover-q1-2.png',
    ],
    books: [
      { rank: 1, title: 'The Hunger Games', author: 'Suzanne Collins' },
      { rank: 2, title: 'Catching Fire', author: 'Suzanne Collins' },
    ],
    createdAt: '2026-02-07T11:00:00Z',
    updatedAt: '2026-02-07T11:00:00Z',
  },
  {
    _id: 'res5',
    appId: 'app2',
    queryIndex: 7,
    screenshots: [],
    books: [
      { rank: 1, title: "Harry Potter and the Sorcerer's Stone", author: 'J.K. Rowling' },
      { rank: 2, title: 'Harry Potter and the Chamber of Secrets', author: 'J.K. Rowling' },
      { rank: 3, title: 'Harry Potter and the Prisoner of Azkaban', author: 'J.K. Rowling' },
    ],
    createdAt: '2026-02-07T11:05:00Z',
    updatedAt: '2026-02-07T11:05:00Z',
  },
  {
    _id: 'res6',
    appId: 'app3',
    queryIndex: 1,
    screenshots: ['/uploads/results/mock-storygraph-q1.png'],
    books: [
      { rank: 1, title: 'The Hunger Games', author: 'Suzanne Collins' },
    ],
    createdAt: '2026-02-07T12:00:00Z',
    updatedAt: '2026-02-07T12:00:00Z',
  },
  {
    _id: 'res7',
    appId: 'app1',
    queryIndex: 21,
    screenshots: ['/uploads/results/mock-goodreads-q21.png'],
    books: [
      { rank: 1, title: 'It Ends with Us', author: 'Colleen Hoover' },
      { rank: 2, title: 'It Starts with Us', author: 'Colleen Hoover' },
      { rank: 3, title: 'Ugly Love', author: 'Colleen Hoover' },
      { rank: 4, title: 'November 9', author: 'Colleen Hoover' },
    ],
    createdAt: '2026-02-07T10:15:00Z',
    updatedAt: '2026-02-07T10:15:00Z',
  },
];

export function getResults(appId = null, queryIndex = null) {
  let filtered = [...MOCK_RESULTS];
  if (appId) {
    filtered = filtered.filter((r) => r.appId === appId);
  }
  if (queryIndex) {
    filtered = filtered.filter((r) => r.queryIndex === Number(queryIndex));
  }
  return filtered.sort((a, b) => a.queryIndex - b.queryIndex);
}

export function getResultById(id) {
  return MOCK_RESULTS.find((r) => r._id === id) || null;
}

export function saveResult(body) {
  const appId = body.get ? body.get('appId') : body.appId;
  const queryIndex = Number(body.get ? body.get('queryIndex') : body.queryIndex);

  if (!appId) throw new Error('appId is required');
  if (!queryIndex || queryIndex < 1 || queryIndex > 50) {
    throw new Error('queryIndex must be between 1 and 50');
  }

  let parsedBooks = [];
  const booksStr = body.get ? body.get('books') : body.books;
  if (booksStr) {
    try {
      parsedBooks = JSON.parse(booksStr);
    } catch {
      throw new Error('books must be a valid JSON array');
    }
    if (parsedBooks.length > 9) {
      throw new Error('Maximum 9 books allowed');
    }
  }

  // Parse existing screenshots to keep
  let keepScreenshots = [];
  const existingStr = body.get ? body.get('existingScreenshots') : body.existingScreenshots;
  if (existingStr) {
    try {
      keepScreenshots = JSON.parse(existingStr);
    } catch {
      keepScreenshots = [];
    }
  }

  // In mock mode, no actual file upload — generate fake screenshot paths
  const newScreenshotCount = body.get ? (body.getAll?.('screenshots') || []).length : 0;
  const newScreenshots = Array.from({ length: newScreenshotCount }, (_, i) =>
    `/uploads/results/mock-${appId}-q${queryIndex}-${Date.now()}-${i}.png`
  );
  const allScreenshots = [...keepScreenshots, ...newScreenshots].slice(0, 5);

  const now = new Date().toISOString();
  const existing = MOCK_RESULTS.find(
    (r) => r.appId === appId && r.queryIndex === queryIndex
  );

  if (existing) {
    existing.books = parsedBooks;
    existing.screenshots = allScreenshots;
    existing.updatedAt = now;
    return { ...existing };
  }

  const id = nextId++;
  const newResult = {
    _id: `res${id}`,
    appId,
    queryIndex,
    screenshots: allScreenshots,
    books: parsedBooks,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_RESULTS.push(newResult);
  return { ...newResult };
}

export function deleteResultById(id) {
  const index = MOCK_RESULTS.findIndex((r) => r._id === id);
  if (index === -1) throw new Error('Result not found');
  MOCK_RESULTS.splice(index, 1);
  return { message: 'Result deleted' };
}

export function deleteResultsByAppId(appId) {
  MOCK_RESULTS = MOCK_RESULTS.filter((r) => r.appId !== appId);
}
