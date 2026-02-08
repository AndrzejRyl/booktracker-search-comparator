import { Router } from 'express';
import Result from '../models/Result.js';
import { screenshotUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateQueryIndex } from '../utils/validators.js';

const router = Router();

// GET /api/results?appId=X&queryIndex=Y
router.get('/', asyncHandler(async (req, res) => {
  const { appId, queryIndex } = req.query;
  if (!appId && !queryIndex) {
    return res.status(400).json({ message: 'appId or queryIndex query parameter is required' });
  }

  const filter = {};
  if (appId) {
    filter.appId = appId;
  }
  if (queryIndex) {
    filter.queryIndex = Number(queryIndex);
  }

  const results = await Result.find(filter).sort({ queryIndex: 1 });
  res.json(results);
}));

// GET /api/results/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id);
  if (!result) {
    const err = new Error('Result not found');
    err.status = 404;
    throw err;
  }
  res.json(result);
}));

// POST /api/results (upsert)
router.post('/', screenshotUpload, asyncHandler(async (req, res) => {
  const { appId, queryIndex, books, existingScreenshots } = req.body;

  if (!appId) {
    return res.status(400).json({ message: 'appId is required' });
  }
  const qIndex = validateQueryIndex(queryIndex);
  if (qIndex === null) {
    return res.status(400).json({ message: 'queryIndex must be between 1 and 50' });
  }

  // Parse books JSON
  let parsedBooks = [];
  if (books) {
    try {
      parsedBooks = JSON.parse(books);
    } catch {
      return res.status(400).json({ message: 'books must be a valid JSON array' });
    }
    if (!Array.isArray(parsedBooks)) {
      return res.status(400).json({ message: 'books must be a valid JSON array' });
    }
    if (parsedBooks.length > 9) {
      return res.status(400).json({ message: 'Maximum 9 books allowed' });
    }
  }

  // Build screenshots array
  let keepScreenshots = [];
  if (existingScreenshots) {
    try {
      keepScreenshots = JSON.parse(existingScreenshots);
    } catch {
      keepScreenshots = [];
    }
  }
  const newScreenshots = (req.files || []).map(
    (f) => `/uploads/results/${f.filename}`
  );
  const allScreenshots = [...keepScreenshots, ...newScreenshots].slice(0, 5);

  // Upsert: find by appId + queryIndex, create if not found
  const existing = await Result.findOne({ appId, queryIndex: qIndex });

  if (existing) {
    existing.books = parsedBooks;
    existing.screenshots = allScreenshots;
    await existing.save();
    return res.json(existing);
  }

  const result = await Result.create({
    appId,
    queryIndex: qIndex,
    books: parsedBooks,
    screenshots: allScreenshots,
  });
  res.status(201).json(result);
}));

// DELETE /api/results/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await Result.findByIdAndDelete(req.params.id);
  if (!result) {
    const err = new Error('Result not found');
    err.status = 404;
    throw err;
  }
  res.json({ message: 'Result deleted' });
}));

export default router;
