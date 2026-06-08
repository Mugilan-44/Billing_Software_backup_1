import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import PurchaseBill from '../models/PurchaseBill.js';
import Vendor from '../models/Vendor.js';
import Expense from '../models/Expense.js';
import InvoiceItem from '../models/InvoiceItem.js';
import mongoose from 'mongoose';

// Helper to determine the company boundary context
const getCompanyId = (req) => {
    return req.user.role === 'SUPER_ADMIN' ? req.query.companyId : req.user.companyId;
};

// @desc    Get dashboard summary metrics
// @route   GET /api/dashboard/summary
// @access  Private
export const getDashboardSummary = async (req, res) => {
    try {
        const { taxFilter = 'overall' } = req.query;
        const companyId = getCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required for dashboard metrics' });
        }
        const companyObjId = new mongoose.Types.ObjectId(companyId);

        const invoiceTaxMatch = { companyId: companyObjId };
        if (taxFilter === 'with_tax') {
            invoiceTaxMatch.isTaxed = true;
        } else if (taxFilter === 'without_tax') {
            invoiceTaxMatch.isTaxed = false;
        }

        const currentDate = new Date();
        // If current month is Jan, Feb, or Mar (0, 1, 2), the FY started last year.
        const startYear = currentDate.getMonth() < 3 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
        const currentYearStart = new Date(startYear, 3, 1); // 1st April of current FY

        // Helper to query payments by looking up matching invoices for tax filter
        const getPaymentsTotalPromise = (matchQuery) => {
            const pipeline = [
                { $match: { ...matchQuery, companyId: companyObjId } },
                { $lookup: { from: 'invoices', localField: 'invoiceId', foreignField: '_id', as: 'invoice' } },
                { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } }
            ];
            if (taxFilter === 'with_tax') {
                pipeline.push({ $match: { 'invoice.isTaxed': true } });
            } else if (taxFilter === 'without_tax') {
                pipeline.push({ $match: { 'invoice.isTaxed': false } });
            }
            pipeline.push({ $group: { _id: null, total: { $sum: '$amount' } } });
            return Payment.aggregate(pipeline).then(res => res.length > 0 ? res[0].total : 0);
        };

        const getSalesPeriodPromise = (startDate, endDate) => {
            const dateMatch = { $gte: startDate };
            if (endDate) {
                dateMatch.$lte = endDate;
            }
            return Invoice.aggregate([
                { $match: { companyId: companyObjId, date: dateMatch, status: { $nin: ['Draft', 'Cancelled'] }, ...invoiceTaxMatch } }, 
                { $group: { _id: null, total: { $sum: '$grandTotal' }, due: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } } } }
            ]).then(res => res.length > 0 ? { total: res[0].total, due: res[0].due } : { total: 0, due: 0 });
        };

        const getReceiptsPeriodPromise = (startDate, endDate) => {
            const paymentMatch = { paymentDate: { $gte: startDate } };
            if (endDate) {
                paymentMatch.paymentDate.$lte = endDate;
            }
            return getPaymentsTotalPromise(paymentMatch);
        };

        // 12 Month Chart Range setup
        const last12MonthsStart = new Date();
        last12MonthsStart.setMonth(last12MonthsStart.getMonth() - 11);
        last12MonthsStart.setDate(1);
        last12MonthsStart.setHours(0, 0, 0, 0);

        // Period definitions for the summary table
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const thisWeekStart = new Date(todayStart); thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        const thisMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        const thisQuarterStart = new Date(todayStart.getFullYear(), Math.floor(todayStart.getMonth() / 3) * 3, 1);
        const thisYearStart = new Date(todayStart.getFullYear(), 0, 1);

        const lastFiscalYearStart = new Date(startYear - 1, 3, 1);
        const lastFiscalYearEnd = new Date(startYear, 2, 31, 23, 59, 59, 999);

        const now = new Date();

        // Fire all queries concurrently
        const [
            salesData,
            totalReceived,
            receivablesData,
            purchasesData,
            vendorsData,
            expensesData,
            outputGstData,
            inputGstData,
            overdueInvoices,
            monthlySalesData,
            monthlyReceiptsData,
            monthlyExpensesData,
            recentInvoices,
            lowStockItemsList,
            lowStockCount,
            topCustomers,
            paymentModeBreakdownData,

            // Period Sales
            todaySales,
            weekSales,
            monthSales,
            quarterSales,
            yearSales,
            fySales,
            lastFySales,

            // Period Receipts
            todayReceipts,
            weekReceipts,
            monthReceipts,
            quarterReceipts,
            yearReceipts,
            fyReceipts,
            lastFyReceipts
        ] = await Promise.all([
            Invoice.aggregate([
                { $match: { companyId: companyObjId, date: { $gte: currentYearStart }, status: { $nin: ['Draft', 'Cancelled'] }, ...invoiceTaxMatch } }, 
                { $group: { _id: null, total: { $sum: '$grandTotal' } } }
            ]),
            getPaymentsTotalPromise({ paymentDate: { $gte: currentYearStart } }),
            Invoice.aggregate([
                { $match: { companyId: companyObjId, status: { $nin: ['Paid', 'Cancelled'] }, ...invoiceTaxMatch } },
                { $group: { _id: null, total: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } } } }
            ]),
            PurchaseBill.aggregate([
                { $match: { companyId: companyObjId, billDate: { $gte: currentYearStart } } }, 
                { $group: { _id: null, total: { $sum: '$grandTotal' } } }
            ]),
            Vendor.aggregate([
                { $match: { companyId: companyObjId } },
                { $group: { _id: null, total: { $sum: '$openingBalance' } } }
            ]),
            Expense.aggregate([
                { $match: { companyId: companyObjId, date: { $gte: currentYearStart } } }, 
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Invoice.aggregate([
                { $match: { companyId: companyObjId, date: { $gte: currentYearStart }, status: { $ne: 'Draft' }, ...invoiceTaxMatch } }, 
                { $group: { _id: null, total: { $sum: { $ifNull: ['$taxAmount', '$taxTotal.totalTax'] } } } }
            ]),
            PurchaseBill.aggregate([
                { $match: { companyId: companyObjId, billDate: { $gte: currentYearStart } } }, 
                { $group: { _id: null, total: { $sum: '$taxTotal' } } }
            ]),
            Invoice.aggregate([
                { $match: { companyId: companyObjId, dueDate: { $lt: now }, status: { $nin: ['Paid', 'Cancelled'] }, ...invoiceTaxMatch } },
                {
                    $project: {
                        pendingAmount: { $subtract: ['$grandTotal', '$amountPaid'] },
                        daysOverdue: { $floor: { $divide: [{ $subtract: [now, '$dueDate'] }, 1000 * 60 * 60 * 24] } }
                    }
                },
                {
                    $group: {
                        _id: null,
                        '1_15': { $sum: { $cond: [{ $lte: ['$daysOverdue', 15] }, '$pendingAmount', 0] } },
                        '16_30': { $sum: { $cond: [{ $and: [{ $gt: ['$daysOverdue', 15] }, { $lte: ['$daysOverdue', 30] }] }, '$pendingAmount', 0] } },
                        '31_45': { $sum: { $cond: [{ $and: [{ $gt: ['$daysOverdue', 30] }, { $lte: ['$daysOverdue', 45] }] }, '$pendingAmount', 0] } },
                        '45_plus': { $sum: { $cond: [{ $gt: ['$daysOverdue', 45] }, '$pendingAmount', 0] } }
                    }
                }
            ]),
            Invoice.aggregate([
                { $match: { companyId: companyObjId, date: { $gte: last12MonthsStart }, status: { $nin: ['Draft', 'Cancelled'] }, ...invoiceTaxMatch } }, 
                { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$grandTotal' } } }
            ]),
            Payment.aggregate([
                { $match: { companyId: companyObjId, paymentDate: { $gte: last12MonthsStart } } },
                { $lookup: { from: 'invoices', localField: 'invoiceId', foreignField: '_id', as: 'invoice' } },
                { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } },
                ...(taxFilter === 'with_tax' ? [{ $match: { 'invoice.isTaxed': true } }] : []),
                ...(taxFilter === 'without_tax' ? [{ $match: { 'invoice.isTaxed': false } }] : []),
                { $group: { _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } }, total: { $sum: '$amount' } } }
            ]),
            Expense.aggregate([
                { $match: { companyId: companyObjId, date: { $gte: last12MonthsStart } } }, 
                { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } }
            ]),
            Invoice.find({ companyId, ...invoiceTaxMatch }).sort({ createdAt: -1 }).limit(5).populate('customerId', 'companyName'),
            Item.find({ companyId, $expr: { $lte: ['$stockQuantity', '$lowStockAlert'] }, type: 'Goods', status: 'Active' })
                .select('name stockQuantity lowStockAlert')
                .sort({ stockQuantity: 1 })
                .limit(10),
            Item.countDocuments({ companyId, $expr: { $lte: ['$stockQuantity', '$lowStockAlert'] }, type: 'Goods', status: 'Active' }),
            Invoice.aggregate([
                { $match: { companyId: companyObjId, status: { $nin: ['Draft', 'Cancelled'] }, ...invoiceTaxMatch } },
                { $group: {
                    _id: '$customerId',
                    totalRevenue: { $sum: '$grandTotal' },
                    unpaidAmount: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } }
                } },
                { $sort: { totalRevenue: -1 } },
                { $limit: 5 },
                { $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerDetails'
                } },
                { $unwind: '$customerDetails' },
                { $project: {
                    _id: 1,
                    totalRevenue: 1,
                    unpaidAmount: 1,
                    name: '$customerDetails.name',
                    companyName: '$customerDetails.companyName',
                    email: '$customerDetails.email'
                } }
            ]),
            Payment.aggregate([
                {
                    $lookup: {
                        from: 'invoices',
                        localField: 'invoiceId',
                        foreignField: '_id',
                        as: 'invoice'
                    }
                },
                {
                    $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true }
                },
                {
                    $match: {
                        companyId: companyObjId,
                        paymentDate: { $gte: currentYearStart },
                        ...(taxFilter === 'with_tax' ? { 'invoice.isTaxed': true } : {}),
                        ...(taxFilter === 'without_tax' ? { 'invoice.isTaxed': false } : {})
                    }
                },
                {
                    $group: {
                        _id: { $ifNull: ['$paymentMode', '$mode'] },
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Period Sales Promises
            getSalesPeriodPromise(todayStart),
            getSalesPeriodPromise(thisWeekStart),
            getSalesPeriodPromise(thisMonthStart),
            getSalesPeriodPromise(thisQuarterStart),
            getSalesPeriodPromise(thisYearStart),
            getSalesPeriodPromise(currentYearStart),
            getSalesPeriodPromise(lastFiscalYearStart, lastFiscalYearEnd),

            // Period Receipts Promises
            getReceiptsPeriodPromise(todayStart),
            getReceiptsPeriodPromise(thisWeekStart),
            getReceiptsPeriodPromise(thisMonthStart),
            getReceiptsPeriodPromise(thisQuarterStart),
            getReceiptsPeriodPromise(thisYearStart),
            getReceiptsPeriodPromise(currentYearStart),
            getReceiptsPeriodPromise(lastFiscalYearStart, lastFiscalYearEnd)
        ]);

        const totalSales = salesData.length > 0 ? salesData[0].total : 0;
        const totalReceivables = receivablesData.length > 0 ? receivablesData[0].total : 0;
        const totalPurchases = purchasesData.length > 0 ? purchasesData[0].total : 0;
        const totalPayables = vendorsData.length > 0 ? vendorsData[0].total : 0;
        const totalExpenses = expensesData.length > 0 ? expensesData[0].total : 0;
        const netGstPayable = (outputGstData[0]?.total || 0) - (inputGstData[0]?.total || 0);

        const overdueBreakdown = overdueInvoices.length > 0 ? {
            '1_15': overdueInvoices[0]['1_15'], '16_30': overdueInvoices[0]['16_30'], '31_45': overdueInvoices[0]['31_45'], '45_plus': overdueInvoices[0]['45_plus']
        } : { '1_15': 0, '16_30': 0, '31_45': 0, '45_plus': 0 };

        // Calculate Current Receivables
        const overdueTotal = overdueBreakdown['1_15'] + overdueBreakdown['16_30'] + overdueBreakdown['31_45'] + overdueBreakdown['45_plus'];
        const currentReceivables = Math.max(0, totalReceivables - overdueTotal);

        // Process monthly chart data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let labels = [], sales12m = [], receipts12m = [], expenses12m = [];
        let currY = last12MonthsStart.getFullYear();
        let currM = last12MonthsStart.getMonth() + 1;

        for (let i = 0; i < 12; i++) {
            labels.push(`${months[currM - 1]} ${currY}`);
            sales12m.push(monthlySalesData.find(d => d._id.year === currY && d._id.month === currM)?.total || 0);
            receipts12m.push(monthlyReceiptsData.find(d => d._id.year === currY && d._id.month === currM)?.total || 0);
            expenses12m.push(monthlyExpensesData.find(d => d._id.year === currY && d._id.month === currM)?.total || 0);
            if (++currM > 12) { currM = 1; currY++; }
        }
        const chartData12Months = { labels, sales: sales12m, receipts: receipts12m, expenses: expenses12m };
        const total12mSales = sales12m.reduce((a, b) => a + b, 0);
        const total12mReceipts = receipts12m.reduce((a, b) => a + b, 0);
        const total12mExpenses = expenses12m.reduce((a, b) => a + b, 0);

        const periodSummary = [
            { label: 'Today', sales: todaySales.total, receipts: todayReceipts, due: todaySales.due },
            { label: 'This Week', sales: weekSales.total, receipts: weekReceipts, due: weekSales.due },
            { label: 'This Month', sales: monthSales.total, receipts: monthReceipts, due: monthSales.due },
            { label: 'This Quarter', sales: quarterSales.total, receipts: quarterReceipts, due: quarterSales.due },
            { label: 'This Year', sales: yearSales.total, receipts: yearReceipts, due: yearSales.due },
            { label: 'This Fiscal Year', sales: fySales.total, receipts: fyReceipts, due: fySales.due },
            { label: 'Last Fiscal Year', sales: lastFySales.total, receipts: lastFyReceipts, due: lastFySales.due },
        ];

        // Payment Mode Breakdown
        const totalModeAmount = paymentModeBreakdownData.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        const paymentModeBreakdown = paymentModeBreakdownData.map(m => ({
            mode: m._id || 'Other',
            amount: m.totalAmount,
            count: m.count,
            percentage: totalModeAmount > 0 ? Math.round((m.totalAmount / totalModeAmount) * 100) : 0
        })).sort((a, b) => b.amount - a.amount);

        res.json({
            success: true,
            data: {
                totalSales, totalPurchases, totalReceivables, currentReceivables, totalPayables, totalExpenses, netGstPayable, totalReceived,
                recentInvoices, lowStockItems: lowStockItemsList, lowStockCount,
                topCustomers,
                overdueBreakdown,
                chartData12Months,
                totals12m: { sales: total12mSales, receipts: total12mReceipts, expenses: total12mExpenses },
                periodSummary,
                paymentModeBreakdown
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get dashboard chart data with Date Range and Granularity (Daily/Weekly/Monthly)
// @route   GET /api/dashboard/chart
// @access  Private
export const getChartData = async (req, res) => {
    try {
        const { period, startDate: customStart, endDate: customEnd, taxFilter = 'overall' } = req.query;
        const companyId = getCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required' });
        }
        const companyObjId = new mongoose.Types.ObjectId(companyId);

        let startDate = new Date();
        let endDate = new Date();

        if (period === '1m') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === '3m') {
            startDate.setMonth(startDate.getMonth() - 3);
        } else if (period === '6m') {
            startDate.setMonth(startDate.getMonth() - 6);
        } else if (period === '1y') {
            startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (period === 'custom') {
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
        } else {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const invoiceTaxMatch = { companyId: companyObjId };
        if (taxFilter === 'with_tax') {
            invoiceTaxMatch.isTaxed = true;
        } else if (taxFilter === 'without_tax') {
            invoiceTaxMatch.isTaxed = false;
        }

        // Fetch Raw Data within Date Range
        const salesData = await Invoice.find({ 
            companyId,
            date: { $gte: startDate, $lte: endDate }, 
            status: { $nin: ['Draft', 'Cancelled'] },
            ...invoiceTaxMatch
        }).select('date grandTotal');
        
        const receiptsPipeline = [
            { $match: { companyId: companyObjId, paymentDate: { $gte: startDate, $lte: endDate } } },
            { $lookup: { from: 'invoices', localField: 'invoiceId', foreignField: '_id', as: 'invoice' } },
            { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } }
        ];
        if (taxFilter === 'with_tax') {
            receiptsPipeline.push({ $match: { 'invoice.isTaxed': true } });
        } else if (taxFilter === 'without_tax') {
            receiptsPipeline.push({ $match: { 'invoice.isTaxed': false } });
        }
        receiptsPipeline.push({ $project: { paymentDate: 1, amount: 1 } });
        const receiptsData = await Payment.aggregate(receiptsPipeline);

        const expensesData = await Expense.find({ companyId, date: { $gte: startDate, $lte: endDate } }).select('date amount');
        const payablesData = await PurchaseBill.find({ companyId, billDate: { $gte: startDate, $lte: endDate } }).select('billDate grandTotal amountPaid');

        // Overall Totals
        const totalSales = salesData.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
        const totalReceipts = receiptsData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalExpenses = expensesData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalPurchases = payablesData.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
        const totalPayables = payablesData.reduce((acc, curr) => acc + ((curr.grandTotal || 0) - (curr.amountPaid || 0)), 0);

        const formatDate = (date, format) => {
            const d = new Date(date);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            if (format === 'daily') {
                return `${d.getDate()} ${months[d.getMonth()]}`;
            } else if (format === 'weekly') {
                const startOfWeek = new Date(d);
                startOfWeek.setDate(d.getDate() - d.getDay());
                return `Week of ${startOfWeek.getDate()} ${months[startOfWeek.getMonth()]}`;
            } else if (format === 'monthly') {
                return `${months[d.getMonth()]} ${d.getFullYear()}`;
            }
            return String(d);
        };

        const bucketData = (dataArray, dateField, amountField, format) => {
            const buckets = {};
            dataArray.forEach(item => {
                const key = formatDate(item[dateField], format);
                if (!buckets[key]) buckets[key] = 0;
                buckets[key] += (item[amountField] || 0);
            });
            return buckets;
        };

        // Bucket the data
        const dailySales = bucketData(salesData, 'date', 'grandTotal', 'daily');
        const dailyReceipts = bucketData(receiptsData, 'paymentDate', 'amount', 'daily');
        const dailyExpenses = bucketData(expensesData, 'date', 'amount', 'daily');

        const weeklySales = bucketData(salesData, 'date', 'grandTotal', 'weekly');
        const weeklyReceipts = bucketData(receiptsData, 'paymentDate', 'amount', 'weekly');
        const weeklyExpenses = bucketData(expensesData, 'date', 'amount', 'weekly');

        const monthlySales = bucketData(salesData, 'date', 'grandTotal', 'monthly');
        const monthlyReceipts = bucketData(receiptsData, 'paymentDate', 'amount', 'monthly');
        const monthlyExpenses = bucketData(expensesData, 'date', 'amount', 'monthly');

        const compileAlignedData = (salesMap, receiptsMap, expensesMap, format) => {
            const keys = [];
            let current = new Date(startDate);

            while (current <= endDate) {
                const key = formatDate(current, format);
                if (!keys.includes(key)) {
                    keys.push(key);
                }

                if (format === 'daily') {
                    current.setDate(current.getDate() + 1);
                } else if (format === 'weekly') {
                    current.setDate(current.getDate() + 7);
                } else if (format === 'monthly') {
                    current.setMonth(current.getMonth() + 1);
                }
            }

            if (keys.length === 0) {
                keys.push(formatDate(startDate, format));
            }

            return {
                labels: keys,
                sales: keys.map(k => salesMap[k] || 0),
                receipts: keys.map(k => receiptsMap[k] || 0),
                expenses: keys.map(k => expensesMap[k] || 0)
            }
        };

        const chartDataDaily = compileAlignedData(dailySales, dailyReceipts, dailyExpenses, 'daily');
        const chartDataWeekly = compileAlignedData(weeklySales, weeklyReceipts, weeklyExpenses, 'weekly');
        const chartDataMonthly = compileAlignedData(monthlySales, monthlyReceipts, monthlyExpenses, 'monthly');

        res.json({
            success: true,
            data: {
                totals: { sales: totalSales, receipts: totalReceipts, expenses: totalExpenses, purchases: totalPurchases, payables: totalPayables },
                chart: {
                    daily: chartDataDaily,
                    weekly: chartDataWeekly,
                    monthly: chartDataMonthly
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get dashboard activity feed
// @route   GET /api/dashboard/activity
// @access  Private
export const getActivityFeed = async (req, res) => {
    try {
        const { taxFilter = 'overall' } = req.query;
        const companyId = getCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required' });
        }
        const companyObjId = new mongoose.Types.ObjectId(companyId);

        const invoiceTaxMatch = { companyId: companyObjId };
        if (taxFilter === 'with_tax') {
            invoiceTaxMatch.isTaxed = true;
        } else if (taxFilter === 'without_tax') {
            invoiceTaxMatch.isTaxed = false;
        }

        const recentInvoices = await Invoice.find({ 
            companyId,
            status: { $ne: 'Draft' },
            ...invoiceTaxMatch
        })
            .sort({ createdAt: -1 })
            .limit(15)
            .populate('customerId', 'companyName');

        const paymentsPipeline = [
            { $match: { companyId: companyObjId } },
            { $sort: { createdAt: -1 } },
            { $limit: 15 },
            { $lookup: { from: 'invoices', localField: 'invoiceId', foreignField: '_id', as: 'invoice' } },
            { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } }
        ];
        if (taxFilter === 'with_tax') {
            paymentsPipeline.push({ $match: { 'invoice.isTaxed': true } });
        } else if (taxFilter === 'without_tax') {
            paymentsPipeline.push({ $match: { 'invoice.isTaxed': false } });
        }
        paymentsPipeline.push({
            $project: {
                _id: 1,
                referenceNumber: 1,
                paymentMode: 1,
                customerId: 1,
                amount: 1,
                createdAt: 1
            }
        });

        const recentPayments = await Payment.aggregate(paymentsPipeline);
        await Payment.populate(recentPayments, { path: 'customerId', select: 'companyName' });

        const activities = [];

        recentInvoices.forEach(inv => {
            activities.push({
                type: 'invoice',
                _id: inv._id,
                number: inv.invoiceNumber,
                customer: inv.customerId?.companyName || 'Unknown Customer',
                amount: inv.grandTotal,
                status: inv.status,
                timestamp: inv.createdAt
            });
        });

        recentPayments.forEach(pmt => {
            activities.push({
                type: 'payment',
                _id: pmt._id,
                number: pmt.referenceNumber || 'N/A',
                paymentMode: pmt.paymentMode,
                customer: pmt.customerId?.companyName || 'Unknown Customer',
                amount: pmt.amount,
                timestamp: pmt.createdAt
            });
        });

        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            data: activities.slice(0, 15)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get top selling items
// @route   GET /api/dashboard/top-selling
// @access  Private
export const getTopSellingItems = async (req, res) => {
    try {
        const { period, taxFilter = 'overall' } = req.query;
        const companyId = getCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required' });
        }

        const matchQuery = {
            companyId: new mongoose.Types.ObjectId(companyId),
            status: { $ne: 'Draft' },
            ...(taxFilter === 'with_tax' ? { isTaxed: true } : {}),
            ...(taxFilter === 'without_tax' ? { isTaxed: false } : {})
        };

        if (period !== 'overall') {
            const today = new Date();
            let startDate = new Date();
            if (period === 'weekly') {
                startDate.setDate(today.getDate() - 7);
            } else if (period === 'monthly') {
                startDate.setMonth(today.getMonth() - 1);
            } else if (period === 'yearly') {
                startDate.setFullYear(today.getFullYear() - 1);
            } else {
                // Default fallback if unknown period is passed
                startDate.setMonth(today.getMonth() - 1);
            }
            matchQuery.date = { $gte: startDate };
        }

        const topSelling = await Invoice.aggregate([
            {
                $match: matchQuery
            },
            {
                $unwind: '$lineItems'
            },
            {
                $group: {
                    _id: '$lineItems.itemId',
                    name: { $first: '$lineItems.name' },
                    totalQuantity: { $sum: '$lineItems.quantity' },
                    totalSales: { $sum: { $multiply: ['$lineItems.quantity', '$lineItems.rate'] } }
                }
            },
            {
                $sort: { totalQuantity: -1 }
            },
            {
                $limit: 10
            }
        ]);

        res.json({
            success: true,
            data: topSelling
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Global search for customers and invoices
// @route   GET /api/dashboard/search
// @access  Private
export const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;

        // If SUPER_ADMIN searches without selecting a company context, return empty results safely
        if (req.user.role === 'SUPER_ADMIN' && !req.query.companyId) {
            return res.json({ success: true, data: { customers: [], invoices: [] } });
        }

        const companyId = getCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required for search' });
        }

        if (!q || q.trim() === '') {
            return res.json({ success: true, data: { customers: [], invoices: [] } });
        }

        const searchQuery = q.trim();
        const searchRegex = new RegExp(searchQuery, 'i');

        // Search Customers
        const customers = await Customer.find({
            companyId,
            $or: [
                { name: searchRegex },
                { companyName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex }
            ]
        }).limit(5).select('name companyName email phone');

        // Search Invoices
        const invoices = await Invoice.find({
            companyId,
            invoiceNumber: searchRegex
        }).limit(5).select('invoiceNumber grandTotal status customerId date')
          .populate('customerId', 'companyName name');

        res.json({
            success: true,
            data: {
                customers,
                invoices
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
