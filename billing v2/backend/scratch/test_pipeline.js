import 'dotenv/config';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const companyId = '6a19141cfc7fbb9f87b115a4';
    const companyObjId = new mongoose.Types.ObjectId(companyId);

    const invoiceTaxMatch = { companyId: companyObjId };

    const result = await Invoice.aggregate([
        { $match: { companyId: companyObjId, status: { $nin: ['Paid', 'Cancelled'] }, ...invoiceTaxMatch } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } } } }
    ]);
    console.log('Result:', result);
    await mongoose.connection.close();
}
run();
