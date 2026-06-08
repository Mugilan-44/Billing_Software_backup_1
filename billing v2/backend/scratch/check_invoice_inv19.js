import 'dotenv/config';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const invoice = await Invoice.findOne({ invoiceNumber: 'INV-000019' }).lean();
    console.log(JSON.stringify(invoice, null, 2));
    await mongoose.connection.close();
}
check();
