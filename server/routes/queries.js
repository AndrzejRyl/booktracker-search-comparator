import { Router } from 'express';
import Query from '../models/Query.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/queries
router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) {
    filter.category = req.query.category;
  }
  const queries = await Query.find(filter).sort({ index: 1 });
  res.json(queries);
}));

// GET /api/queries/:index
router.get('/:index', asyncHandler(async (req, res) => {
  const query = await Query.findOne({ index: Number(req.params.index) });
  if (!query) {
    const err = new Error('Query not found');
    err.status = 404;
    throw err;
  }
  res.json(query);
}));

export default router;
