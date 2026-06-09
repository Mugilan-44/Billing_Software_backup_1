import 'dotenv/config';
import mongoose from 'mongoose';
import { recalculateCustomerLedger } from '../controllers/invoiceController.js';
import Customer from '../models/Customer.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const customerId = '6a191cbcfc7fbb9f87b115a8';
    
    console.log('Before recalculate:');
    let customer = await Customer.findById(customerId).lean();
    console.log(`outstandingBalance=${customer.outstandingBalance}`);

    await recalculateCustomerLedger(customerId);

    console.log('After recalculate:');
    customer = await Customer.findById(customerId).lean();
    console.log(`outstandingBalance=${customer.outstandingBalance}`);

    await mongoose.connection.close();
}
run();
