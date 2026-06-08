import 'dotenv/config';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const payments = await Payment.find({ customerId: '6a191cbcfc7fbb9f87b115a8' }).sort({ createdAt: 1 });
    console.log(`Total payments for customer: ${payments.length}`);
    payments.forEach(p => {
        console.log(`Payment Ref: ${p.paymentNumber} | InvoiceId: ${p.invoiceId} | Amount: ${p.amount}`);
    });
    await mongoose.connection.close();
}
check();
