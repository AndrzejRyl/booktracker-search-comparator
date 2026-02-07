import { Router } from 'express';
import GoldenResult from '../models/GoldenResult.js';

const router = Router();

// GET /api/golden
router.get('/', async (req, res) => {
  try {
    const results = await GoldenResult.find({ 'books.0': { $exists: true } })
      .sort({ queryIndex: 1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/golden/:queryIndex
router.get('/:queryIndex', async (req, res) => {
  try {
    const qIndex = Number(req.params.queryIndex);
    if (isNaN(qIndex) || qIndex < 1 || qIndex > 50) {
      return res.status(400).json({ message: 'queryIndex must be between 1 and 50' });
    }
    const result = await GoldenResult.findOne({ queryIndex: qIndex });
    if (!result) {
      return res.status(404).json({ message: 'Golden result not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/golden/:queryIndex (upsert)
router.put('/:queryIndex', async (req, res) => {
  try {
    const qIndex = Number(req.params.queryIndex);
    if (isNaN(qIndex) || qIndex < 1 || qIndex > 50) {
      return res.status(400).json({ message: 'queryIndex must be between 1 and 50' });
    }

    const { books } = req.body;
    if (!Array.isArray(books)) {
      return res.status(400).json({ message: 'books must be an array' });
    }
    if (books.length > 9) {
      return res.status(400).json({ message: 'Maximum 9 books allowed' });
    }

    for (const book of books) {
      if (!book.title?.trim() || !book.author?.trim()) {
        return res.status(400).json({ message: 'Each book must have a title and author' });
      }
    }

    const rankedBooks = books.map((b, i) => ({
      rank: b.rank || i + 1,
      title: b.title.trim(),
      author: b.author.trim(),
    }));

    const result = await GoldenResult.findOneAndUpdate(
      { queryIndex: qIndex },
      { queryIndex: qIndex, books: rankedBooks },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
