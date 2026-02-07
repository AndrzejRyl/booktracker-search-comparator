import { Router } from 'express';
import App from '../models/App.js';
import { logoUpload } from '../middleware/upload.js';
import Result from '../models/Result.js';

const router = Router();

// GET /api/apps
router.get('/', async (req, res) => {
  try {
    const apps = await App.find().sort({ name: 1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/apps/:id
router.get('/:id', async (req, res) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/apps
router.post('/', logoUpload, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/apps/:id
router.put('/:id', logoUpload, async (req, res) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/apps/:id
router.delete('/:id', async (req, res) => {
  try {
    const app = await App.findByIdAndDelete(req.params.id);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }
    await Result.deleteMany({ appId: req.params.id });
    res.json({ message: 'App deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
