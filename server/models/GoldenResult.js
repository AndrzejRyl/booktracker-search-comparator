import mongoose from 'mongoose';

const goldenBookSchema = new mongoose.Schema({
  rank: { type: Number, required: true, min: 1, max: 9 },
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
}, { _id: false });

const goldenResultSchema = new mongoose.Schema({
  queryIndex: { type: Number, required: true, unique: true, min: 1, max: 50 },
  books: [goldenBookSchema],
}, {
  timestamps: true,
});

export default mongoose.model('GoldenResult', goldenResultSchema);
