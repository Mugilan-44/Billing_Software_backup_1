import 'dotenv/config';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import { recalculateCustomerLedger } from '../controllers/invoiceController.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const customers = await Customer.find({});
    console.log(`Recalculating ledger for ${customers.length} customers...`);
    for (const cus of customers) {
        await recalculateCustomerLedger(cus._id);
        const updated = await Customer.findById(cus._id).lean();
        console.log(`Customer ${cus.companyName}: Stored outstanding balance updated to ${updated.outstandingBalance}`);
    }
    await mongoose.connection.close();
}
run();
