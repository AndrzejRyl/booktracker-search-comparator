import mongoose from 'mongoose';

const appSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logo: { type: String, required: true },
  notes: { type: String, default: '', trim: true },
}, {
  timestamps: true,
});

export default mongoose.model('App', appSchema);
