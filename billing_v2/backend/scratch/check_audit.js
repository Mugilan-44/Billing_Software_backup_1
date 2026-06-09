import 'dotenv/config';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(20).lean();
    console.log('Recent Audit Logs:', JSON.stringify(logs, null, 2));
    await mongoose.connection.close();
}
check();
