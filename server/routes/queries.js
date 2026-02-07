import { Router } from 'express';
import Query from '../models/Query.js';

const router = Router();

// GET /api/queries
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const queries = await Query.find(filter).sort({ index: 1 });
    res.json(queries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/queries/:index
router.get('/:index', async (req, res) => {
  try {
    const query = await Query.findOne({ index: Number(req.params.index) });
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    res.json(query);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
