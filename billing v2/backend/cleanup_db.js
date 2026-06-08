import mongoose from 'mongoose';
import 'dotenv/config';
import Customer from './models/Customer.js';
import LedgerEntry from './models/LedgerEntry.js';
import Invoice from './models/Invoice.js';

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected!');

    const customers = await Customer.find({});
    console.log(`Found ${customers.length} customers. Recalculating balances...`);

    for (const customer of customers) {
      console.log(`Processing Customer: ${customer.name || customer.companyName} (${customer._id})`);
      
      // 1. Get all ledger entries sorted by date asc, then createdAt asc
      const entries = await LedgerEntry.find({ customerId: customer._id }).sort({ date: 1, createdAt: 1 });
      console.log(`  Found ${entries.length} ledger entries.`);

      let runningBalance = 0;
      for (const entry of entries) {
        runningBalance = Math.round((runningBalance + (entry.debit || 0) - (entry.credit || 0)) * 100) / 100;
        entry.balance = runningBalance;
        await entry.save();
        console.log(`    Ledger Entry: ${entry.description} | debit: ${entry.debit} | credit: ${entry.credit} | new balance: ${entry.balance}`);
      }

      // 2. Calculate correct outstandingBalance
      const oldOutstanding = customer.outstandingBalance;
      customer.outstandingBalance = runningBalance;

      // 3. Calculate correct totalBusiness: sum of all non-draft, non-cancelled invoices
      const invoices = await Invoice.find({ customerId: customer._id, status: { $nin: ['Draft', 'Cancelled'] } }).lean();
      const calculatedTotalBusiness = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const oldTotalBusiness = customer.totalBusiness;
      customer.totalBusiness = Math.round(calculatedTotalBusiness * 100) / 100;

      await customer.save();
      console.log(`  Updated balances for customer:`);
      console.log(`    Outstanding Balance: ${oldOutstanding} -> ${customer.outstandingBalance}`);
      console.log(`    Total Business: ${oldTotalBusiness} -> ${customer.totalBusiness}`);
    }

    console.log('Database cleanup completed successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error running cleanup:', error);
  }
}

run();
