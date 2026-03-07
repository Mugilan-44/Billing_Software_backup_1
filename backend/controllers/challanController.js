import mongoose from 'mongoose';
import Challan from '../models/Challan.js';
import Item from '../models/Item.js';

export const createChallan = async (req, res) => {
    try {
        const count = await Challan.countDocuments();
        const challanNumber = `CHL-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

        req.body.challanNumber = challanNumber;

        // Inject branch/company for data isolation
        if (req.user.role === 'ADMIN') {
            req.body.companyId = req.user.companyId;
            req.body.branchId = req.user.branchId;
        }

        // Deduct Stock
        for (const i of req.body.items) {
            const dbItem = await Item.findById(i.itemId);
            if (dbItem && dbItem.type === 'Goods') {
                dbItem.stockQuantity -= i.quantity;
                await dbItem.save();
            }
        }

        const challan = new Challan(req.body);
        await challan.save();

        res.status(201).json({ success: true, data: challan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getChallans = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        }
        const challans = await Challan.find(query).populate('customerId', 'companyName');
        res.json({ success: true, count: challans.length, data: challans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getChallanById = async (req, res) => {
    try {
        const challan = await Challan.findById(req.params.id).populate('customerId');
        if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });

        res.json({ success: true, data: challan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateChallanStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const challan = await Challan.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!challan) return res.status(404).json({ success: false, message: 'Challan not found' });

        res.json({ success: true, data: challan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
