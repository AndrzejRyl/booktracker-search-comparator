import { Router } from 'express';
import App from '../models/App.js';
import { logoUpload } from '../middleware/upload.js';
import Result from '../models/Result.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/apps
router.get('/', asyncHandler(async (req, res) => {
  const apps = await App.find().sort({ name: 1 });
  res.json(apps);
}));

// GET /api/apps/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const app = await App.findById(req.params.id);
  if (!app) {
    const err = new Error('App not found');
    err.status = 404;
    throw err;
  }
  res.json(app);
}));

// POST /api/apps
router.post('/', logoUpload, asyncHandler(async (req, res) => {
  const { name, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'App name is required' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Logo is required' });
  }

  const appData = {
    name: name.trim(),
    notes: notes?.trim() || '',
    logo: `/uploads/logos/${req.file.filename}`,
  };

  const app = await App.create(appData);
  res.status(201).json(app);
}));

// PUT /api/apps/:id
router.put('/:id', logoUpload, asyncHandler(async (req, res) => {
  const app = await App.findById(req.params.id);
  if (!app) {
    const err = new Error('App not found');
    err.status = 404;
    throw err;
  }

  const { name, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'App name is required' });
  }

  app.name = name.trim();
  app.notes = notes?.trim() || '';
  if (req.file) {
    app.logo = `/uploads/logos/${req.file.filename}`;
  }

  await app.save();
  res.json(app);
}));

// DELETE /api/apps/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const app = await App.findByIdAndDelete(req.params.id);
  if (!app) {
    const err = new Error('App not found');
    err.status = 404;
    throw err;
  }
  await Result.deleteMany({ appId: req.params.id });
  res.json({ message: 'App deleted' });
}));

export default router;
