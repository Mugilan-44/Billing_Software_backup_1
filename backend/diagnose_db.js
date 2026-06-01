import mongoose from 'mongoose';
import 'dotenv/config';
import Customer from './models/Customer.js';
import LedgerEntry from './models/LedgerEntry.js';

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected!');

    const customers = await Customer.find({});
    console.log(`Found ${customers.length} customers.`);
    for (const c of customers) {
      console.log(`Customer: ${c.name || c.companyName} (${c._id})`);
      console.log(`  outstandingBalance: ${c.outstandingBalance} (type: ${typeof c.outstandingBalance})`);
      console.log(`  totalBusiness: ${c.totalBusiness} (type: ${typeof c.totalBusiness})`);
    }

    const ledgers = await LedgerEntry.find({}).sort({ date: -1 }).limit(10);
    console.log('\nLast 10 Ledger Entries:');
    for (const l of ledgers) {
      console.log(`Ledger entry: ${l.description} | debit: ${l.debit} | credit: ${l.credit} | balance: ${l.balance}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error running diagnosis:', error);
  }
}

run();
