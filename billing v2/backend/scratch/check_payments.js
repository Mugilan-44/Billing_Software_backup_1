import 'dotenv/config';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const invoice = await Invoice.findOne({ invoiceNumber: 'INV-000019' });
    if (!invoice) {
        console.log('Invoice INV-000019 not found');
        await mongoose.connection.close();
        return;
    }
    console.log(`Invoice INV-000019: ID=${invoice._id}, GrandTotal=${invoice.grandTotal}, AmountPaid=${invoice.amountPaid}, BalanceDue=${invoice.balanceDue}, Status=${invoice.status}`);
    const payments = await Payment.find({ invoiceId: invoice._id });
    console.log(`Total payments for INV-000019: ${payments.length}`);
    payments.forEach(p => {
        console.log(`Payment: Amount=${p.amount}, Date=${p.paymentDate}, Mode=${p.paymentMode || p.mode}`);
    });
    await mongoose.connection.close();
}
check();
