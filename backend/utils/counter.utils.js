import Counter from '../models/Counter.model.js';

export async function getNextSequenceValue(sequenceName, prefix) {
  const counter = await Counter.findOneAndUpdate(
    { id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(6, '0')}`;
}
