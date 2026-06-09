import 'dotenv/config';
import mongoose from 'mongoose';
import Customer from './models/Customer.js';
import Invoice from './models/Invoice.js';
import Payment from './models/Payment.js';
import LedgerEntry from './models/LedgerEntry.js';

async function testConn() {
    try {
        const uri = process.env.MONGODB_URI;
        const conn = await mongoose.connect(uri);
        console.log('Connected to DB:', conn.connection.name);
        
        const customers = await Customer.find({});
        console.log('=== ALL CUSTOMERS ===');
        customers.forEach(c => {
            console.log(`Customer: ${c.companyName} | _id: ${c._id} | balance: ${c.outstandingBalance} (${typeof c.outstandingBalance}) | totalBusiness: ${c.totalBusiness} (${typeof c.totalBusiness})`);
        });

        const invoices = await Invoice.find({});
        console.log('=== ALL INVOICES ===');
        invoices.forEach(i => {
            console.log(`Invoice: ${i.invoiceNumber} | status: ${i.status} | grandTotal: ${i.grandTotal} (${typeof i.grandTotal}) | balanceDue: ${i.balanceDue} (${typeof i.balanceDue}) | amountPaid: ${i.amountPaid}`);
        });

        const payments = await Payment.find({});
        console.log('=== ALL PAYMENTS ===');
        payments.forEach(p => {
            console.log(`Payment: amount: ${p.amount} | unusedAmount: ${p.unusedAmount}`);
        });

        const ledgers = await LedgerEntry.find({});
        console.log('=== ALL LEDGERS ===');
        ledgers.forEach(l => {
            console.log(`Ledger: type: ${l.type} | ref: ${l.referenceId} | debit: ${l.debit} | credit: ${l.credit} | balance: ${l.balance}`);
        });

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Test Connection Error:', err);
        process.exit(1);
    }
}

testConn();
