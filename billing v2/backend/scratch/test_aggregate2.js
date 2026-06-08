import 'dotenv/config';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const companyId = '6a17cc126d56153b9c70f77c';
    const topSelling = await Invoice.aggregate([
        {
            $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                status: { $ne: 'Draft' }
            }
        },
        {
            $unwind: '$lineItems'
        },
        {
            $group: {
                _id: '$lineItems.itemId',
                name: { $first: '$lineItems.name' },
                totalQuantity: { $sum: '$lineItems.quantity' },
                totalSales: { $sum: { $multiply: ['$lineItems.quantity', '$lineItems.rate'] } }
            }
        },
        {
            $sort: { totalQuantity: -1 }
        },
        {
            $limit: 10
        }
    ]);
    console.log('Top Selling for company 6a17cc126d56153b9c70f77c:', topSelling);
    await mongoose.connection.close();
}
test();
