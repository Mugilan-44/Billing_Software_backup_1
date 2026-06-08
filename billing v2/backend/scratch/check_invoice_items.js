import 'dotenv/config';
import mongoose from 'mongoose';
import InvoiceItem from '../models/InvoiceItem.js';
import Invoice from '../models/Invoice.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await InvoiceItem.countDocuments({});
    console.log('InvoiceItem Count:', count);
    const sample = await InvoiceItem.findOne({});
    console.log('Sample InvoiceItem:', sample);
    const sampleInvoice = await Invoice.findOne({});
    console.log('Sample Invoice lineItems:', sampleInvoice?.lineItems);
    await mongoose.connection.close();
}
check();
