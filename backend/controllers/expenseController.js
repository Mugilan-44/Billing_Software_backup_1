import Expense from '../models/Expense.js';
import Invoice from '../models/Invoice.js';
import { findDocument } from '../utils/tenant.utils.js';

export const createExpense = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (req.user.role !== 'SUPER_ADMIN') {
            payload.companyId = req.user.companyId;
            payload.branchId = req.user.branchId;
        }
        // Clean empty string vendorId and customerId fields to avoid cast issues
        if (payload.vendorId === '') delete payload.vendorId;
        if (payload.customerId === '') delete payload.customerId;

        const expense = await Expense.create(payload);
        res.status(201).json({ success: true, data: expense });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getExpenses = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        }
        const expenses = await Expense.find(query)
            .populate('vendorId', 'companyName')
            .populate('customerId', 'companyName name')
            .sort({ date: -1 });
        res.json({ success: true, count: expenses.length, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteExpense = async (req, res) => {
    try {
        const expense = await findDocument(Expense, req.params.id, req.user);
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
        await expense.deleteOne();
        res.json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getVehicleAggregations = async (req, res) => {
    try {
        const companyFilter = req.user.role !== 'SUPER_ADMIN' ? { companyId: req.user.companyId } : {};

        // Aggregate income from non-draft invoices per vehicle
        const incomeAgg = await Invoice.aggregate([
            { $match: { ...companyFilter, "transportDetails.vehicleNumber": { $exists: true, $ne: "" }, status: { $nin: ['Draft', 'Cancelled'] } } },
            { $group: { _id: "$transportDetails.vehicleNumber", totalIncome: { $sum: "$grandTotal" } } }
        ]);

        // Aggregate expenses per vehicle (company-scoped)
        const expenseAgg = await Expense.aggregate([
            { $match: { ...companyFilter, vehicleNumber: { $exists: true, $ne: "" } } },
            { $group: { _id: "$vehicleNumber", totalExpense: { $sum: "$amount" } } }
        ]);

        // Merge them
        const vehicles = {};

        incomeAgg.forEach(i => {
            vehicles[i._id] = { vehicleNumber: i._id, totalIncome: i.totalIncome, totalExpense: 0, profit: i.totalIncome };
        });

        expenseAgg.forEach(e => {
            if (vehicles[e._id]) {
                vehicles[e._id].totalExpense = e.totalExpense;
                vehicles[e._id].profit = vehicles[e._id].totalIncome - e.totalExpense;
            } else {
                vehicles[e._id] = { vehicleNumber: e._id, totalIncome: 0, totalExpense: e.totalExpense, profit: -e.totalExpense };
            }
        });

        res.json({ success: true, data: Object.values(vehicles) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getExpense = async (req, res) => {
    try {
        const expense = await findDocument(Expense, req.params.id, req.user);
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
        res.json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateExpense = async (req, res) => {
    try {
        const expense = await findDocument(Expense, req.params.id, req.user);
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
        
        const payload = { ...req.body };
        if (payload.vendorId === '') payload.vendorId = null;
        if (payload.customerId === '') payload.customerId = null;

        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            { $set: payload },
            { new: true, runValidators: true }
        );
        res.json({ success: true, data: updatedExpense });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
