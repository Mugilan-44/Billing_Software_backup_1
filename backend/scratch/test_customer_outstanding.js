import 'dotenv/config';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import { calculateCustomerOutstanding } from '../services/outstandingService.js';
import { toRupees } from '../utils/rounding.js';

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const customers = await Customer.find({}).lean();
    console.log(`Total customers: ${customers.length}`);
    for (const cus of customers) {
        const stats = await calculateCustomerOutstanding(cus._id);
        const storedOutstanding = cus.outstandingBalance;
        const calculatedOutstanding = stats.totalOutstanding;
        const controllerValue = toRupees(stats.totalOutstanding).toNumber();
        console.log(`Customer ${cus.companyName}:`);
        console.log(`  Stored Outstanding (DB): ${storedOutstanding}`);
        console.log(`  Calculated Outstanding (Paise?): ${calculatedOutstanding}`);
        console.log(`  Controller value (toRupees): ${controllerValue}`);
    }
    await mongoose.connection.close();
}
test();
