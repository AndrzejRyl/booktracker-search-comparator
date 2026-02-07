import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import queriesRouter from './routes/queries.js';
import appsRouter from './routes/apps.js';
import resultsRouter from './routes/results.js';

dotenv.config({ path: './server/.env' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve uploaded files as static assets
const uploadsDir = process.env.UPLOADS_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(__dirname, uploadsDir)));

app.use('/api/queries', queriesRouter);
app.use('/api/apps', appsRouter);
app.use('/api/results', resultsRouter);

// Connect to MongoDB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
