import mongoose from 'mongoose';
import PurchaseBill from '../models/PurchaseBill.js';
import Vendor from '../models/Vendor.js';
import Item from '../models/Item.js';
import StockHistory from '../models/StockHistory.js';
import VendorLedgerEntry from '../models/VendorLedgerEntry.js';
import CompanySettings from '../models/CompanySettings.js';

export const createPurchaseBill = async (req, res) => {
    try {
        const { vendorId, items, discount = 0, notes } = req.body;

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) throw new Error('Vendor not found');

        let subTotal = 0;
        let taxTotal = 0;
        const processedItems = [];

        for (const i of items) {
            const dbItem = await Item.findById(i.itemId);
            if (!dbItem) throw new Error(`Item not found: ${i.itemId}`);

            const amount = i.quantity * i.rate;
            const taxAmount = amount * (dbItem.gstPercentage / 100);

            subTotal += amount;
            taxTotal += taxAmount;

            processedItems.push({
                itemId: dbItem._id,
                name: dbItem.name,
                quantity: i.quantity,
                rate: i.rate,
                gstPercentage: dbItem.gstPercentage
            });
        }

        const grandTotal = Math.round(subTotal + taxTotal - discount);

        const count = await PurchaseBill.countDocuments();
        const billNumber = `PB-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

        const purchaseBillPayload = {
            billNumber,
            vendorId,
            items: processedItems,
            discount,
            subTotal,
            taxTotal,
            grandTotal,
            notes
        };

        if (req.user.role === 'ADMIN') {
            purchaseBillPayload.companyId = req.user.companyId;
            purchaseBillPayload.branchId = req.user.branchId;
        }

        const purchaseBill = new PurchaseBill(purchaseBillPayload);
        await purchaseBill.save();

        // 2. Process Stock & Stock History
        for (const i of processedItems) {
            const dbItem = await Item.findById(i.itemId);
            if (dbItem.type === 'Goods') {
                const prevStock = dbItem.stockQuantity;
                dbItem.stockQuantity += i.quantity;
                await dbItem.save();

                const stockHistory = new StockHistory({
                    itemId: dbItem._id,
                    action: 'IN',
                    quantity: i.quantity,
                    previousStock: prevStock,
                    currentStock: dbItem.stockQuantity,
                    referenceId: purchaseBill._id,
                    referenceType: 'PurchaseBill',
                    notes: `Purchase Bill ${billNumber}`
                });
                await stockHistory.save();
            }
        }

        // 3. Update Vendor Outstanding (Payable)
        vendor.openingBalance += grandTotal;
        await vendor.save();

        // 4. Create Vendor Ledger Entry
        const ledgerEntry = new VendorLedgerEntry({
            vendorId,
            type: 'PurchaseBill',
            referenceId: purchaseBill._id,
            description: `Purchase Bill ${billNumber}`,
            credit: grandTotal, // Crediting payable
            balance: vendor.openingBalance
        });
        await ledgerEntry.save();

        res.status(201).json({ success: true, data: purchaseBill });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getPurchaseBills = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        }
        const bills = await PurchaseBill.find(query).populate('vendorId', 'companyName email').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: bills.length, data: bills });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const getPurchaseBillById = async (req, res) => {
    try {
        const bill = await PurchaseBill.findById(req.params.id).populate('vendorId');
        if (!bill) return res.status(404).json({ success: false, message: 'Purchase Bill not found' });
        res.status(200).json({ success: true, data: bill });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updatePurchaseBillStatus = async (req, res) => {
    try {
        const bill = await PurchaseBill.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        if (!bill) return res.status(404).json({ success: false, message: 'Purchase Bill not found' });
        res.status(200).json({ success: true, data: bill });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
