import mongoose from 'mongoose';

const querySchema = new mongoose.Schema({
  index: { type: Number, required: true, unique: true, min: 1, max: 50 },
  text: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
}, {
  timestamps: true,
});

querySchema.index({ category: 1 });

export default mongoose.model('Query', querySchema);
