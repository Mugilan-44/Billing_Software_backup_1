import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config();

const collectionsToClear = [
  'invoices',
  'invoiceitems',
  'payments',
  'customers',
  'vendors',
  'items',
  'purchasebills',
  'challans',
  'expenses',
  'creditnotes',
  'quotations',
  'salesorders',
  'stockhistories',
  'ledgerentries',
  'vendorledgerentries',
  'auditlogs',
  'counters'
];

const cleanDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in env');
    }
    console.log('Connecting to database...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to: ${conn.connection.host}/${conn.connection.name}`);

    const collections = await conn.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    for (const name of collectionsToClear) {
      if (collectionNames.includes(name)) {
        console.log(`Clearing collection: ${name}`);
        await conn.connection.db.collection(name).deleteMany({});
      } else {
        console.log(`Collection ${name} does not exist, skipping.`);
      }
    }

    console.log('Database cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
};

cleanDB();
