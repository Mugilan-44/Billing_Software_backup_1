import 'dotenv/config';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const companyId = '6a17cc126d56153b9c70f77c';
    const companyObjId = new mongoose.Types.ObjectId(companyId);

    const invoiceTaxMatch = { companyId: companyObjId };

    const result = await Invoice.aggregate([
        { $match: { companyId: companyObjId, status: { $nin: ['Paid', 'Cancelled'] }, ...invoiceTaxMatch } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } } } }
    ]);
    console.log('Result with simple subtract:', result);

    const resultFixed = await Invoice.aggregate([
        { $match: { companyId: companyObjId, status: { $nin: ['Paid', 'Cancelled'] }, ...invoiceTaxMatch } },
        { $group: { _id: null, total: { $sum: { $subtract: [{ $ifNull: ['$grandTotal', 0] }, { $ifNull: ['$amountPaid', 0] }] } } } }
    ]);
    console.log('Result with fixed ifNull subtract:', resultFixed);

    const resultFixedBalance = await Invoice.aggregate([
        { $match: { companyId: companyObjId, status: { $nin: ['Paid', 'Cancelled'] }, ...invoiceTaxMatch } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$balanceDue', { $subtract: ['$grandTotal', '$amountPaid'] }] } } } }
    ]);
    console.log('Result with balanceDue sum:', resultFixedBalance);

    await mongoose.connection.close();
}
run();
