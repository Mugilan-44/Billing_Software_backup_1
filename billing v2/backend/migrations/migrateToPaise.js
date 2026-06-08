import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Invoice from '../models/Invoice.js';
import PurchaseBill from '../models/PurchaseBill.js';
import Customer from '../models/Customer.js';
import Vendor from '../models/Vendor.js';
import Item from '../models/Item.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Payment from '../models/Payment.js';
import { toPaise } from '../utils/rounding.js';

dotenv.config();

/**
 * MIGRATION SCRIPT: Convert all stored float currency values to integer paise.
 * Run this only ONCE.
 */
const migrateToPaise = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prolync');
        console.log('Connected to MongoDB. Starting Paise Migration...');

        // 1. Migrate Invoices
        const invoices = await Invoice.find({});
        for (const inv of invoices) {
            inv.subtotal = toPaise(inv.subtotal || 0);
            inv.subTotal = toPaise(inv.subTotal || 0); // legacy alias
            inv.taxableAmount = toPaise(inv.taxableAmount || 0);
            inv.discountAmount = toPaise(inv.discountAmount || 0);
            inv.cgst = toPaise(inv.cgst || 0);
            inv.sgst = toPaise(inv.sgst || 0);
            inv.igst = toPaise(inv.igst || 0);
            inv.taxAmount = toPaise(inv.taxAmount || 0);
            inv.grandTotal = toPaise(inv.grandTotal || 0);
            inv.balanceDue = toPaise(inv.balanceDue || 0);
            inv.amountPaid = toPaise(inv.amountPaid || 0);

            if (inv.lineItems && inv.lineItems.length > 0) {
                inv.lineItems.forEach(item => {
                    item.rate = toPaise(item.rate || 0);
                    item.taxableAmount = toPaise(item.taxableAmount || 0);
                    item.taxAmount = toPaise(item.taxAmount || 0);
                    item.amount = toPaise(item.amount || 0);
                });
            }
            await inv.save({ validateBeforeSave: false });
        }
        console.log(`Migrated ${invoices.length} Invoices.`);

        // 2. Migrate Purchase Bills
        const bills = await PurchaseBill.find({});
        for (const bill of bills) {
            bill.subtotal = toPaise(bill.subtotal || 0);
            bill.taxableAmount = toPaise(bill.taxableAmount || 0);
            bill.discountAmount = toPaise(bill.discountAmount || 0);
            bill.cgst = toPaise(bill.cgst || 0);
            bill.sgst = toPaise(bill.sgst || 0);
            bill.igst = toPaise(bill.igst || 0);
            bill.taxAmount = toPaise(bill.taxAmount || 0);
            bill.grandTotal = toPaise(bill.grandTotal || 0);
            bill.balanceDue = toPaise(bill.balanceDue || 0);
            bill.amountPaid = toPaise(bill.amountPaid || 0);

            if (bill.lineItems && bill.lineItems.length > 0) {
                bill.lineItems.forEach(item => {
                    item.rate = toPaise(item.rate || 0);
                    item.taxableAmount = toPaise(item.taxableAmount || 0);
                    item.taxAmount = toPaise(item.taxAmount || 0);
                    item.amount = toPaise(item.amount || 0);
                });
            }
            await bill.save({ validateBeforeSave: false });
        }
        console.log(`Migrated ${bills.length} Purchase Bills.`);

        // 3. Migrate Customers
        const customers = await Customer.find({});
        for (const cus of customers) {
            cus.outstandingBalance = toPaise(cus.outstandingBalance || 0);
            cus.totalBusiness = toPaise(cus.totalBusiness || 0);
            cus.openingBalance = toPaise(cus.openingBalance || 0);
            await cus.save({ validateBeforeSave: false });
        }
        console.log(`Migrated ${customers.length} Customers.`);

        // 4. Migrate Vendors
        const vendors = await Vendor.find({});
        for (const ven of vendors) {
            ven.outstandingBalance = toPaise(ven.outstandingBalance || 0);
            ven.totalBusiness = toPaise(ven.totalBusiness || 0);
            ven.openingBalance = toPaise(ven.openingBalance || 0);
            await ven.save({ validateBeforeSave: false });
        }
        console.log(`Migrated ${vendors.length} Vendors.`);

        // 5. Migrate Items (Stock)
        const items = await Item.find({});
        for (const item of items) {
            item.sellingPrice = toPaise(item.sellingPrice || 0);
            item.purchasePrice = toPaise(item.purchasePrice || 0);
            await item.save({ validateBeforeSave: false });
        }
        console.log(`Migrated ${items.length} Items.`);

        // 6. Migrate Ledger Entries
        const ledgers = await LedgerEntry.find({});
        for (const entry of ledgers) {
            entry.debit = toPaise(entry.debit || 0);
            entry.credit = toPaise(entry.credit || 0);
            entry.balance = toPaise(entry.balance || 0);
            await entry.save({ validateBeforeSave: false });
        }
        console.log(`Migrated ${ledgers.length} Ledger Entries.`);

        // 7. Migrate Payments
        const payments = await Payment.find({});
        for (const pmt of payments) {
            pmt.amount = toPaise(pmt.amount || 0);
            pmt.unusedAmount = toPaise(pmt.unusedAmount || 0);
            if (pmt.allocations && pmt.allocations.length > 0) {
                pmt.allocations.forEach(alloc => {
                    alloc.amount = toPaise(alloc.amount || 0);
                });
            }
            await pmt.save({ validateBeforeSave: false });
        }
        console.log(`Migrated ${payments.length} Payments.`);

        console.log('Migration Complete! All amounts are now strictly stored as integer paise.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateToPaise();
