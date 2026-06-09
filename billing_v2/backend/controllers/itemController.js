import Item from '../models/Item.js';
import { findDocument } from '../utils/tenant.utils.js';

// @desc    Get all items
// @route   GET /api/items
// @access  Private
export const getItems = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
            query.branchId = req.user.branchId;
        }
        const items = await Item.find(query);
        res.json({ success: true, count: items.length, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
export const getItemById = async (req, res) => {
    try {
        const item = await findDocument(Item, req.params.id, req.user);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create an item
// @route   POST /api/items
// @access  Private
export const createItem = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (req.user.role !== 'SUPER_ADMIN') {
            payload.companyId = req.user.companyId;
            payload.branchId = req.user.branchId;
        }

        // Auto-generate SKU if not provided
        if (!payload.sku || payload.sku.trim() === '') {
            const query = req.user.role !== 'SUPER_ADMIN'
                ? { companyId: req.user.companyId }
                : {};
            const count = await Item.countDocuments(query);
            payload.sku = `ITEM-${String(count + 1).padStart(4, '0')}`;
        }

        const item = await Item.create(payload);
        res.status(201).json({ success: true, data: item });
    } catch (error) {
        // If SKU collision (unique constraint), retry with timestamp suffix
        if (error.code === 11000 && error.keyPattern?.sku) {
            try {
                const payload2 = { ...req.body, sku: `ITEM-${Date.now()}` };
                if (req.user.role !== 'SUPER_ADMIN') {
                    payload2.companyId = req.user.companyId;
                    payload2.branchId = req.user.branchId;
                }
                const item = await Item.create(payload2);
                return res.status(201).json({ success: true, data: item });
            } catch (err2) {
                return res.status(400).json({ success: false, message: err2.message });
            }
        }
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update an item
// @route   PUT /api/items/:id
// @access  Private
export const updateItem = async (req, res) => {
    try {
        const item = await findDocument(Item, req.params.id, req.user);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        Object.assign(item, req.body);
        await item.save();
        res.json({ success: true, data: item });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete an item
// @route   DELETE /api/items/:id
// @access  Private
export const deleteItem = async (req, res) => {
    try {
        const item = await findDocument(Item, req.params.id, req.user);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        await item.deleteOne();
        res.json({ success: true, message: 'Item removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
