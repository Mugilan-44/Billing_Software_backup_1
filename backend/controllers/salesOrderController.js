import SalesOrder from '../models/SalesOrder.js';
import Quotation from '../models/Quotation.js';
import Customer from '../models/Customer.js';

export const getSalesOrders = async (req, res) => {
    try {
        let query = req.user.role === 'Sales' ? { 'items.name': { $exists: true } } : {};
        if (req.user.role === 'ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        } else if (req.user.role === 'CUSTOMER') {
            query.customerId = req.user.customerId;
        }
        const salesOrders = await SalesOrder.find(query).populate('customerId', 'companyName email phone').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: salesOrders.length, data: salesOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const getSalesOrderById = async (req, res) => {
    try {
        const salesOrder = await SalesOrder.findById(req.params.id).populate('customerId', 'companyName email phone billingAddress');
        if (!salesOrder) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }
        res.status(200).json({ success: true, data: salesOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const createSalesOrder = async (req, res) => {
    try {
        const { customerId, items, discount, expectedDeliveryDate, notes, quotationId } = req.body;

        let subTotal = 0;
        let taxTotal = 0;

        items.forEach(item => {
            const amount = item.quantity * item.rate;
            const tax = amount * (item.gstPercentage / 100);
            subTotal += amount;
            taxTotal += tax;
        });

        const grandTotal = Math.round(subTotal + taxTotal - (discount || 0));

        const year = new Date().getFullYear();
        const count = await SalesOrder.countDocuments();
        const orderNumber = `SO-${year}-${String(count + 1).padStart(4, '0')}`;

        const salesOrderPayload = {
            orderNumber,
            customerId,
            quotationId,
            items,
            discount: discount || 0,
            subTotal,
            taxTotal,
            grandTotal,
            expectedDeliveryDate,
            notes
        };

        if (req.user.role === 'ADMIN') {
            salesOrderPayload.companyId = req.user.companyId;
            salesOrderPayload.branchId = req.user.branchId;
        }

        const salesOrder = await SalesOrder.create(salesOrderPayload);

        if (quotationId) {
            await Quotation.findByIdAndUpdate(quotationId, { status: 'Converted' });
        }

        res.status(201).json({ success: true, data: salesOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updateSalesOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const salesOrder = await SalesOrder.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });

        if (!salesOrder) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }

        res.status(200).json({ success: true, data: salesOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const deleteSalesOrder = async (req, res) => {
    try {
        const salesOrder = await SalesOrder.findById(req.params.id);
        if (!salesOrder) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }

        await salesOrder.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
