let nextId = 6;

let MOCK_APPS = [
  {
    _id: 'app1',
    name: 'Goodreads',
    logo: '/uploads/logos/mock-goodreads.png',
    notes: 'Most popular platform, owned by Amazon. Largest catalog of user reviews.',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-07T00:00:00Z',
  },
  {
    _id: 'app2',
    name: 'Hardcover',
    logo: '/uploads/logos/mock-hardcover.png',
    notes: 'Modern interface, community-driven. Newer entrant with growing catalog.',
    createdAt: '2026-02-02T00:00:00Z',
    updatedAt: '2026-02-06T00:00:00Z',
  },
  {
    _id: 'app3',
    name: 'StoryGraph',
    logo: '/uploads/logos/mock-storygraph.png',
    notes: 'Focus on mood and pacing. Independent alternative to Goodreads.',
    createdAt: '2026-02-03T00:00:00Z',
    updatedAt: '2026-02-05T00:00:00Z',
  },
  {
    _id: 'app4',
    name: 'LibraryThing',
    logo: '/uploads/logos/mock-librarything.png',
    notes: 'Cataloging-focused with deep metadata. Older but feature-rich.',
    createdAt: '2026-02-04T00:00:00Z',
    updatedAt: '2026-02-04T00:00:00Z',
  },
  {
    _id: 'app5',
    name: 'Uncover',
    logo: '/uploads/logos/mock-uncover.png',
    notes: 'Book tracker for mood readers. Great for reading challenges.',
    createdAt: '2026-02-05T00:00:00Z',
    updatedAt: '2026-02-05T00:00:00Z',
  },
];

export function getApps() {
  return [...MOCK_APPS].sort((a, b) => a.name.localeCompare(b.name));
}

export function getAppById(id) {
  return MOCK_APPS.find((a) => a._id === id) || null;
}

export function createApp(body) {
  const now = new Date().toISOString();
  const name = body.get ? body.get('name') : body.name;
  if (!name || !name.trim()) {
    throw new Error('App name is required');
  }
  const id = nextId++;
  const newApp = {
    _id: `app${id}`,
    name: name.trim(),
    logo: `/uploads/logos/mock-app${id}.png`,
    notes: ((body.get ? body.get('notes') : body.notes) || '').trim(),
    createdAt: now,
    updatedAt: now,
  };
  MOCK_APPS.push(newApp);
  return { ...newApp };
}

export function updateApp(id, body) {
  const app = MOCK_APPS.find((a) => a._id === id);
  if (!app) throw new Error('App not found');

  const name = body.get ? body.get('name') : body.name;
  if (!name || !name.trim()) {
    throw new Error('App name is required');
  }
  app.name = name.trim();
  app.notes = ((body.get ? body.get('notes') : body.notes) || '').trim();
  app.updatedAt = new Date().toISOString();
  return { ...app };
}

export function deleteAppById(id) {
  const index = MOCK_APPS.findIndex((a) => a._id === id);
  if (index === -1) throw new Error('App not found');
  MOCK_APPS.splice(index, 1);
  return { message: 'App deleted' };
}
