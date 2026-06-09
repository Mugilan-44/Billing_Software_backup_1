import 'dotenv/config';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';

async function testAggregate() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find all invoices
    const invoices = await Invoice.find({});
    console.log(`Total invoices: ${invoices.length}`);
    invoices.forEach(inv => {
        console.log(`Invoice ID: ${inv._id} | CompanyId: ${inv.companyId} | Status: ${inv.status} | Date: ${inv.date} | lineItems length: ${inv.lineItems?.length}`);
    });

    if (invoices.length > 0) {
        const companyId = invoices[0].companyId;
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5); // go back far enough

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
        console.log('Top Selling for company', companyId, ':', topSelling);
    }
    
    await mongoose.connection.close();
}
testAggregate();
