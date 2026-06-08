import mongoose from 'mongoose';
const { Schema } = mongoose;

const auditLogSchema = new Schema({
  module:     String,
  action:     String,
  documentId: Schema.Types.ObjectId,
  userId:     { type: Schema.Types.ObjectId, ref: 'User' },
  changes:    Object,
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
