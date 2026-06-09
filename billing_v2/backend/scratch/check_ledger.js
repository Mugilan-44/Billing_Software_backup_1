import 'dotenv/config';
import mongoose from 'mongoose';
import LedgerEntry from '../models/LedgerEntry.js';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const entries = await LedgerEntry.find({ customerId: '6a191cbcfc7fbb9f87b115a8' }).sort({ date: 1, createdAt: 1 });
    console.log(`Total ledger entries: ${entries.length}`);
    entries.forEach(e => {
        console.log(`Entry: Date=${e.date}, Type=${e.type}, Desc=${e.description}, Debit=${e.debit}, Credit=${e.credit}, Balance=${e.balance}`);
    });
    await mongoose.connection.close();
}
check();
