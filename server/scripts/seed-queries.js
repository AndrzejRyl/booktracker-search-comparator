import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import { connectDB } from '../config/db.js';
import Query from '../models/Query.js';

dotenv.config({ path: './server/.env' });

async function seed() {
  await connectDB();

  const data = JSON.parse(
    await readFile(new URL('../data/queries.json', import.meta.url), 'utf-8')
  );

  await Query.deleteMany({});
  const result = await Query.insertMany(data);
  console.log(`Seeded ${result.length} queries`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
