import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './models/Customer.js';
import Invoice from './models/Invoice.js';

dotenv.config({ path: './.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to DB');
    const invoice = await Invoice.findOne({ invoiceNumber: 'INV-000005' }).populate('customerId');
    if (!invoice) {
      console.log('Invoice not found');
    } else {
      console.log('Invoice details:', {
        invoiceNumber: invoice.invoiceNumber,
        billingAddress: invoice.billingAddress,
        customerId: invoice.customerId?._id,
        customerName: invoice.customerId?.companyName,
        customerBillingAddress: invoice.customerId?.billingAddress
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
