import 'dotenv/config';
import mongoose from 'mongoose';
import PaymentAllocation from '../models/PaymentAllocation.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await PaymentAllocation.countDocuments({});
    console.log(`Total PaymentAllocation records: ${count}`);
    const allocs = await PaymentAllocation.find({}).limit(10).lean();
    console.log('Sample Allocations:', JSON.stringify(allocs, null, 2));
    await mongoose.connection.close();
}
check();
