import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Customer from '../models/Customer.js';
import PurchaseBill from '../models/PurchaseBill.js';
import Payment from '../models/Payment.js';

// @desc    Sales report
// @route   GET /api/reports/sales?from=&to=
// @access  Private
export const getSalesReport = async (req, res) => {
  try {
    const from = new Date(req.query.from || req.query.startDate || '2000-01-01');
    const to   = new Date(req.query.to   || req.query.endDate   || Date.now());
    to.setHours(23, 59, 59, 999);

    const query = {
      date:   { $gte: from, $lte: to },
      status: { $nin: ['Draft', 'Cancelled'] },
    };

    if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.companyId) {
      query.companyId = req.user.companyId;
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'companyName name gstNumber gstin stateCode')
      .sort({ date: -1 })
      .lean();

    const summary = invoices.reduce((acc, inv) => {
      acc.totalRevenue  = Math.round((acc.totalRevenue  + (inv.grandTotal || 0))  * 100) / 100;
      acc.totalTax      = Math.round((acc.totalTax      + (inv.taxAmount || 0))   * 100) / 100;
      acc.totalReceived = Math.round((acc.totalReceived + (inv.amountPaid || 0))  * 100) / 100;
      acc.totalPending  = Math.round((acc.totalPending  + (inv.balanceDue || 0))  * 100) / 100;
      return acc;
    }, { totalRevenue: 0, totalTax: 0, totalReceived: 0, totalPending: 0 });

    const reportData = invoices.map(inv => ({
      date:          new Date(inv.date || inv.createdAt).toISOString().split('T')[0],
      invoiceNumber: inv.invoiceNumber,
      customer:      inv.customerId?.companyName || inv.customerId?.name,
      gstin:         inv.customerId?.gstNumber || inv.customerId?.gstin || 'URD',
      subTotal:      inv.subtotal || inv.subTotal || 0,
      taxTotal:      (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0) || inv.taxTotal?.totalTax || 0,
      discount:      inv.discount || 0,
      grandTotal:    inv.grandTotal,
      amountPaid:    inv.amountPaid,
      balanceDue:    inv.balanceDue ?? (inv.grandTotal - inv.amountPaid),
      status:        inv.status,
    }));

    res.json({ success: true, data: { summary, invoices: reportData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    GST report
// @route   GET /api/reports/gst?from=&to=
// @access  Private
export const getGSTReport = async (req, res) => {
  try {
    const from = new Date(req.query.from || req.query.startDate || '2000-01-01');
    const to   = new Date(req.query.to   || req.query.endDate   || Date.now());
    to.setHours(23, 59, 59, 999);

    const companyFilter = {};
    if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.companyId) {
      companyFilter.companyId = req.user.companyId;
    }

    const [outputTxns, inputTxns] = await Promise.all([
      Invoice.find({ ...companyFilter, date: { $gte: from, $lte: to }, status: { $nin: ['Draft', 'Cancelled'] } })
        .populate('customerId', 'companyName name gstNumber gstin stateCode')
        .lean(),
      PurchaseBill.find({ ...companyFilter, $or: [{ date: { $gte: from, $lte: to } }, { billDate: { $gte: from, $lte: to } }] })
        .populate('vendorId', 'companyName name gstNumber gstin')
        .lean(),
    ]);

    let totalOutputCgst = 0, totalOutputSgst = 0, totalOutputIgst = 0, totalOutputLegacy = 0;
    const outputGstData = outputTxns.map(inv => {
      const cgst = inv.cgst || inv.taxTotal?.cgst || 0;
      const sgst = inv.sgst || inv.taxTotal?.sgst || 0;
      const igst = inv.igst || inv.taxTotal?.igst || 0;
      const legacy = inv.taxTotal?.totalTax || 0;
      totalOutputCgst   += cgst;
      totalOutputSgst   += sgst;
      totalOutputIgst   += igst;
      totalOutputLegacy += legacy;
      return {
        id: inv._id,
        date:              new Date(inv.date || inv.createdAt).toISOString().split('T')[0],
        transactionNumber: inv.invoiceNumber,
        partyName:         inv.customerId?.companyName || inv.customerId?.name,
        gstin:             inv.customerId?.gstNumber || inv.customerId?.gstin || 'URD',
        taxableValue:      inv.subtotal || inv.subTotal || inv.taxableAmount || 0,
        cgst, sgst, igst,
        totalTax:          cgst + sgst + igst || legacy,
        taxAmount:         cgst + sgst + igst || legacy, // Map for frontend
        type: 'Output',
      };
    });

    let totalInputGst = 0;
    const inputGstData = inputTxns.map(bill => {
      const tax = bill.taxAmount || bill.taxTotal || 0;
      totalInputGst += tax;
      return {
        id: bill._id,
        date:              new Date(bill.date || bill.billDate || bill.createdAt).toISOString().split('T')[0],
        transactionNumber: bill.billNumber,
        partyName:         bill.vendorId?.companyName || bill.vendorId?.name,
        gstin:             bill.vendorId?.gstNumber   || bill.vendorId?.gstin || 'URD',
        taxableValue:      bill.subtotal || bill.subTotal || 0,
        taxAmount:         tax,
        type: 'Input',
      };
    });

    const totalOutput = totalOutputCgst + totalOutputSgst + totalOutputIgst || totalOutputLegacy;

    const totalOutputGST = totalOutput;
    const totalInputGST = totalInputGst;
    const totalTaxableVal = outputGstData.reduce((acc, curr) => acc + (curr.taxableValue || 0), 0);

    res.json({
      success: true,
      data: {
        totalOutputGST:     Math.round(totalOutputGST * 100) / 100,
        totalInputGST:      Math.round(totalInputGST * 100) / 100,
        totalOutputGst:     Math.round(totalOutputGST * 100) / 100, // Frontend alias
        totalInputGst:      Math.round(totalInputGST * 100) / 100,  // Frontend alias
        netLiability:       Math.round((totalOutputGST - totalInputGST) * 100) / 100,
        netGstPayable:      Math.round((totalOutputGST - totalInputGST) * 100) / 100, // Frontend alias
        taxCredit:          totalInputGST > totalOutputGST ? Math.round((totalInputGST - totalOutputGST) * 100) / 100 : 0,
        totalTaxableValue:  Math.round(totalTaxableVal * 100) / 100,
        cgstCollected:      Math.round(totalOutputCgst * 100) / 100,
        sgstCollected:      Math.round(totalOutputSgst * 100) / 100,
        igstCollected:      Math.round(totalOutputIgst * 100) / 100,
        outputTransactions: outputGstData,
        inputTransactions:  inputGstData,
        transactions:       [...outputGstData, ...inputGstData].sort((a, b) => new Date(b.date) - new Date(a.date)),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Receivables aging report
// @route   GET /api/reports/aging
// @access  Private
export const getOutstandingAgingReport = async (req, res) => {
  try {
    const now = new Date();
    const companyFilter = {};
    if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.companyId) {
      companyFilter.companyId = req.user.companyId;
    }

    const invoices = await Invoice.find({
      ...companyFilter,
      status: { $nin: ['Draft', 'Paid', 'Cancelled'] },
      balanceDue: { $gt: 0 },
    })
      .populate('customerId', 'companyName name email phone')
      .lean();

    const customerMap = {};
    invoices.forEach(inv => {
      const custId = inv.customerId?._id?.toString() || 'unknown';
      if (!customerMap[custId]) {
        customerMap[custId] = {
          customer: inv.customerId?.companyName || inv.customerId?.name || 'Unknown',
          current: 0,
          '1_to_15_days': 0,
          '16_to_30_days': 0,
          '31_to_45_days': 0,
          'above_45_days': 0,
          totalOutstanding: 0
        };
      }
      const daysOverdue = Math.floor((now - new Date(inv.dueDate || inv.date)) / 86400000);
      const pendingAmount = inv.balanceDue ?? (inv.grandTotal - inv.amountPaid);
      
      if (daysOverdue <= 0) {
        customerMap[custId].current += pendingAmount;
      } else if (daysOverdue <= 15) {
        customerMap[custId]['1_to_15_days'] += pendingAmount;
      } else if (daysOverdue <= 30) {
        customerMap[custId]['16_to_30_days'] += pendingAmount;
      } else if (daysOverdue <= 45) {
        customerMap[custId]['31_to_45_days'] += pendingAmount;
      } else {
        customerMap[custId]['above_45_days'] += pendingAmount;
      }
      customerMap[custId].totalOutstanding += pendingAmount;
    });

    const reportData = Object.values(customerMap).map(row => {
      return {
        customer: row.customer,
        current: Math.round(row.current * 100) / 100,
        '1_to_15_days': Math.round(row['1_to_15_days'] * 100) / 100,
        '16_to_30_days': Math.round(row['16_to_30_days'] * 100) / 100,
        '31_to_45_days': Math.round(row['31_to_45_days'] * 100) / 100,
        'above_45_days': Math.round(row['above_45_days'] * 100) / 100,
        totalOutstanding: Math.round(row.totalOutstanding * 100) / 100
      };
    });

    res.json({ success: true, data: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    GST summary (combined output + input)
// @route   GET /api/reports/gst-summary
// @access  Private
export const getGstSummary = async (req, res) => {
  // Delegate to getGSTReport for combined logic
  return getGSTReport(req, res);
};

// @desc    Dynamic Reports Engine
// @route   GET /api/reports/dynamic/:type
// @access  Private
export const getDynamicReport = async (req, res) => {
  try {
    const { type } = req.params;
    const from = new Date(req.query.from || req.query.startDate || '2000-01-01');
    const to   = new Date(req.query.to   || req.query.endDate   || Date.now());
    to.setHours(23, 59, 59, 999);

    const matchQuery = {
      date: { $gte: from, $lte: to }
    };
    if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.companyId) {
      matchQuery.companyId = new mongoose.Types.ObjectId(req.user.companyId);
    }

    if (type === 'sales_by_customer') {
      const data = await Invoice.aggregate([
        { $match: { ...matchQuery, status: { $nin: ['Draft', 'Cancelled'] } } },
        { $group: {
            _id: "$customerId",
            totalSales: { $sum: "$grandTotal" },
            subTotal: { $sum: { $ifNull: ["$subtotal", "$subTotal", 0] } },
            taxAmount: { $sum: "$taxAmount" },
            invoiceCount: { $sum: 1 }
          }
        },
        { $lookup: {
            from: "customers",
            localField: "_id",
            foreignField: "_id",
            as: "customer"
          }
        },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        { $project: {
            customerName: { $ifNull: ["$customer.companyName", "$customer.name", "Unknown"] },
            totalSales: 1,
            subTotal: 1,
            taxAmount: 1,
            invoiceCount: 1
          }
        },
        { $sort: { totalSales: -1 } }
      ]);
      return res.json({ success: true, data });
    }

    if (type === 'sales_by_items') {
      const data = await Invoice.aggregate([
        { $match: { ...matchQuery, status: { $nin: ['Draft', 'Cancelled'] } } },
        { $unwind: "$lineItems" },
        { $group: {
            _id: "$lineItems.name",
            quantitySold: { $sum: "$lineItems.quantity" },
            totalSales: { $sum: "$lineItems.amount" },
            invoiceCount: { $sum: 1 }
          }
        },
        { $project: {
            itemName: "$_id",
            quantitySold: 1,
            totalSales: 1,
            invoiceCount: 1
          }
        },
        { $sort: { totalSales: -1 } }
      ]);
      return res.json({ success: true, data });
    }

    if (type === 'sales_by_salesperson') {
      const data = await Invoice.aggregate([
        { $match: { ...matchQuery, status: { $nin: ['Draft', 'Cancelled'] } } },
        { $group: {
            _id: { $ifNull: ["$salesPerson", "Unassigned"] },
            totalSales: { $sum: "$grandTotal" },
            subTotal: { $sum: { $ifNull: ["$subtotal", "$subTotal", 0] } },
            invoiceCount: { $sum: 1 }
          }
        },
        { $project: {
            salesPerson: "$_id",
            totalSales: 1,
            subTotal: 1,
            invoiceCount: 1
          }
        },
        { $sort: { totalSales: -1 } }
      ]);
      return res.json({ success: true, data });
    }

    if (type === 'payments_received') {
      const payQuery = {
        date: { $gte: from, $lte: to }
      };
      if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.companyId) {
        payQuery.companyId = req.user.companyId;
      }
      const rawData = await Payment.find(payQuery)
        .populate('customerId', 'companyName name')
        .populate('invoiceId', 'invoiceNumber')
        .sort({ date: -1 })
        .lean();

      const normalized = rawData.map(p => ({
        paymentNumber: p.paymentNumber,
        customerName: p.customerId?.companyName || p.customerId?.name || '-',
        invoiceNumber: p.invoiceId?.invoiceNumber || 'General Credit',
        amount: p.amount,
        date: p.date || p.paymentDate,
        mode: p.mode || p.paymentMode || 'Cash',
        reference: p.reference || p.referenceNumber || '-',
      }));
      return res.json({ success: true, data: normalized });
    }

    if (type === 'expenses_details') {
      const expQuery = {
        date: { $gte: from, $lte: to }
      };
      if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.companyId) {
        expQuery.companyId = req.user.companyId;
      }
      const rawData = await Expense.find(expQuery)
        .populate('vendorId', 'companyName')
        .populate('customerId', 'companyName name')
        .sort({ date: -1 })
        .lean();

      const normalized = rawData.map(e => ({
        date: e.date,
        category: e.category,
        vendorName: e.vendorId?.companyName || '-',
        customerName: e.customerId?.companyName || e.customerId?.name || '-',
        reference: e.reference || '-',
        notes: e.notes || '',
        amount: e.amount,
        paymentMethod: e.paymentMethod || 'Cash'
      }));
      return res.json({ success: true, data: normalized });
    }

    if (type === 'expenses_by_category') {
      const data = await Expense.aggregate([
        { $match: { ...matchQuery } },
        { $group: {
            _id: "$category",
            totalExpense: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $project: {
            category: "$_id",
            totalExpense: 1,
            count: 1
          }
        },
        { $sort: { totalExpense: -1 } }
      ]);
      return res.json({ success: true, data });
    }

    if (type === 'expenses_by_customer') {
      const data = await Expense.aggregate([
        { $match: { ...matchQuery, customerId: { $exists: true, $ne: null } } },
        { $group: {
            _id: "$customerId",
            totalExpense: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $lookup: {
            from: "customers",
            localField: "_id",
            foreignField: "_id",
            as: "customer"
          }
        },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        { $project: {
            customerName: { $ifNull: ["$customer.companyName", "$customer.name", "Unknown"] },
            totalExpense: 1,
            count: 1
          }
        },
        { $sort: { totalExpense: -1 } }
      ]);
      return res.json({ success: true, data });
    }

    if (type === 'tax') {
      const data = await Invoice.aggregate([
        { $match: { ...matchQuery, status: { $nin: ['Draft', 'Cancelled'] } } },
        { $group: {
            _id: null,
            cgst: { $sum: "$cgst" },
            sgst: { $sum: "$sgst" },
            igst: { $sum: "$igst" },
            taxAmount: { $sum: "$taxAmount" },
            taxableAmount: { $sum: "$taxableAmount" }
          }
        }
      ]);
      const result = data[0] ? [
        { name: 'CGST (Central Tax)', amount: data[0].cgst },
        { name: 'SGST (State Tax)', amount: data[0].sgst },
        { name: 'IGST (Integrated Tax)', amount: data[0].igst },
        { name: 'Total GST Collected', amount: data[0].taxAmount }
      ] : [
        { name: 'CGST (Central Tax)', amount: 0 },
        { name: 'SGST (State Tax)', amount: 0 },
        { name: 'IGST (Integrated Tax)', amount: 0 },
        { name: 'Total GST Collected', amount: 0 }
      ];
      return res.json({ success: true, data: result });
    }

    return res.status(400).json({ success: false, message: 'Invalid report type' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
