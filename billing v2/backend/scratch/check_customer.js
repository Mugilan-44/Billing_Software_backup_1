import 'dotenv/config';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const customer = await Customer.findById('6a191cbcfc7fbb9f87b115a8').lean();
    console.log(JSON.stringify(customer, null, 2));
    await mongoose.connection.close();
}
check();
