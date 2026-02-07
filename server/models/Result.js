import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  rank: { type: Number, required: true, min: 1, max: 9 },
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
}, { _id: false });

const resultSchema = new mongoose.Schema({
  appId: { type: mongoose.Schema.Types.ObjectId, ref: 'App', required: true },
  queryIndex: { type: Number, required: true, min: 1, max: 50 },
  screenshots: [{ type: String }],
  books: [bookSchema],
}, {
  timestamps: true,
});

// Compound unique index — one result per app per query
resultSchema.index({ appId: 1, queryIndex: 1 }, { unique: true });

// Index for fetching all results for an app
resultSchema.index({ appId: 1 });

export default mongoose.model('Result', resultSchema);
