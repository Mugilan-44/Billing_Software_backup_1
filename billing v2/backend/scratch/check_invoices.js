import 'dotenv/config';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const invoices = await Invoice.find({});
    console.log(`Total invoices: ${invoices.length}`);
    invoices.forEach(inv => {
        console.log(`Invoice ${inv.invoiceNumber}: CompanyId=${inv.companyId}, Status=${inv.status}, GrandTotal=${inv.grandTotal}, AmountPaid=${inv.amountPaid}, BalanceDue=${inv.balanceDue}`);
    });
    await mongoose.connection.close();
}
check();
