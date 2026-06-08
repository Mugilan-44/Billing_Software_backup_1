import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import PurchaseBill from '../models/PurchaseBill.js';
import Vendor from '../models/Vendor.js';
import Expense from '../models/Expense.js';

// @desc    Get dashboard summary metrics
// @route   GET /api/dashboard/summary
// @access  Private
export const getDashboardSummary = async (req, res) => {
    try {
        const currentDate = new Date();
        // If current month is Jan, Feb, or Mar (0, 1, 2), the FY started last year.
        const startYear = currentDate.getMonth() < 3 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
        const currentYearStart = new Date(startYear, 3, 1); // 1st April of current FY

        // 1. Basic KPI Totals
        const salesData = await Invoice.aggregate([{ $match: { date: { $gte: currentYearStart }, status: { $ne: 'Draft' } } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]);
        const totalSales = salesData.length > 0 ? salesData[0].total : 0;

        const paymentsData = await Payment.aggregate([{ $match: { paymentDate: { $gte: currentYearStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
        const totalReceived = paymentsData.length > 0 ? paymentsData[0].total : 0;

        const receivablesData = await Invoice.aggregate([
            { $match: { status: { $nin: ['Draft', 'Paid'] } } },
            { $group: { _id: null, total: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } } } }
        ]);
        const totalReceivables = receivablesData.length > 0 ? receivablesData[0].total : 0;

        const purchasesData = await PurchaseBill.aggregate([{ $match: { billDate: { $gte: currentYearStart } } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]);
        const totalPurchases = purchasesData.length > 0 ? purchasesData[0].total : 0;

        const vendorsData = await Vendor.aggregate([{ $group: { _id: null, total: { $sum: '$openingBalance' } } }]);
        const totalPayables = vendorsData.length > 0 ? vendorsData[0].total : 0;

        const expensesData = await Expense.aggregate([{ $match: { date: { $gte: currentYearStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
        const totalExpenses = expensesData.length > 0 ? expensesData[0].total : 0;

        const outputGstData = await Invoice.aggregate([{ $match: { date: { $gte: currentYearStart }, status: { $ne: 'Draft' } } }, { $group: { _id: null, total: { $sum: '$taxTotal.totalTax' } } }]);
        const inputGstData = await PurchaseBill.aggregate([{ $match: { billDate: { $gte: currentYearStart } } }, { $group: { _id: null, total: { $sum: '$taxTotal' } } }]);
        const netGstPayable = (outputGstData[0]?.total || 0) - (inputGstData[0]?.total || 0);

        // 2. Overdue Breakdown (1_15, 16_30, 31_45, 45_plus)
        const now = new Date();
        const overdueInvoices = await Invoice.aggregate([
            { $match: { dueDate: { $lt: now }, status: { $nin: ['Draft', 'Paid'] } } },
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
        ]);
        const overdueBreakdown = overdueInvoices.length > 0 ? {
            '1_15': overdueInvoices[0]['1_15'], '16_30': overdueInvoices[0]['16_30'], '31_45': overdueInvoices[0]['31_45'], '45_plus': overdueInvoices[0]['45_plus']
        } : { '1_15': 0, '16_30': 0, '31_45': 0, '45_plus': 0 };

        // Calculate Current Receivables
        const overdueTotal = overdueBreakdown['1_15'] + overdueBreakdown['16_30'] + overdueBreakdown['31_45'] + overdueBreakdown['45_plus'];
        const currentReceivables = Math.max(0, totalReceivables - overdueTotal);

        // 3. 12 Month Chart Data (Sales, Receipts, Expenses)
        const last12MonthsStart = new Date();
        last12MonthsStart.setMonth(last12MonthsStart.getMonth() - 11);
        last12MonthsStart.setDate(1);
        last12MonthsStart.setHours(0, 0, 0, 0);

        const monthlySalesData = await Invoice.aggregate([{ $match: { date: { $gte: last12MonthsStart }, status: { $ne: 'Draft' } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$grandTotal' } } }]);
        const monthlyReceiptsData = await Payment.aggregate([{ $match: { paymentDate: { $gte: last12MonthsStart } } }, { $group: { _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } }, total: { $sum: '$amount' } } }]);
        const monthlyExpensesData = await Expense.aggregate([{ $match: { date: { $gte: last12MonthsStart } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } }]);

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

        // 4. Period Summary Table
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const thisWeekStart = new Date(todayStart); thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        const thisMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        const thisQuarterStart = new Date(todayStart.getFullYear(), Math.floor(todayStart.getMonth() / 3) * 3, 1);
        const thisYearStart = new Date(todayStart.getFullYear(), 0, 1);

        const getPeriodMetrics = async (startDate) => {
            const sumSales = await Invoice.aggregate([{ $match: { date: { $gte: startDate }, status: { $ne: 'Draft' } } }, { $group: { _id: null, total: { $sum: '$grandTotal' }, due: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } } } }]);
            const sumReceipts = await Payment.aggregate([{ $match: { paymentDate: { $gte: startDate } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
            return {
                sales: sumSales.length ? sumSales[0].total : 0,
                receipts: sumReceipts.length ? sumReceipts[0].total : 0,
                due: sumSales.length ? sumSales[0].due : 0
            };
        };

        const periodSummary = [
            { label: 'Today', ...(await getPeriodMetrics(todayStart)) },
            { label: 'This Week', ...(await getPeriodMetrics(thisWeekStart)) },
            { label: 'This Month', ...(await getPeriodMetrics(thisMonthStart)) },
            { label: 'This Quarter', ...(await getPeriodMetrics(thisQuarterStart)) },
            { label: 'This Year', ...(await getPeriodMetrics(thisYearStart)) },
        ];

        // 5. Shared dashboard generic payload
        const recentInvoices = await Invoice.find().sort({ createdAt: -1 }).limit(5).populate('customerId', 'companyName');
        const lowStockItems = await Item.find({ $expr: { $lte: ['$stockQuantity', '$lowStockAlert'] }, type: 'Goods', status: 'Active' });

        res.json({
            success: true,
            data: {
                totalSales, totalPurchases, totalReceivables, currentReceivables, totalPayables, totalExpenses, netGstPayable, totalReceived,
                recentInvoices, lowStockItems: lowStockItems.length,
                overdueBreakdown,
                chartData12Months,
                totals12m: { sales: total12mSales, receipts: total12mReceipts, expenses: total12mExpenses },
                periodSummary
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get dashboard chart data with Date Range and Granularity (Daily/Weekly/Monthly)
// @route   GET /api/dashboard/chart
// @access  Private
// @query   period (1m, 3m, 6m, 1y, custom), startDate, endDate
export const getChartData = async (req, res) => {
    try {
        const { period, startDate: customStart, endDate: customEnd } = req.query;

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
            // Default to 1 year if an invalid/missing period is sent
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        // ensure start & end of days for consistency
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // Fetch Raw Data within Date Range
        const salesData = await Invoice.find({ date: { $gte: startDate, $lte: endDate }, status: { $ne: 'Draft' } }).select('date grandTotal');
        const receiptsData = await Payment.find({ paymentDate: { $gte: startDate, $lte: endDate } }).select('paymentDate amount');
        const expensesData = await Expense.find({ date: { $gte: startDate, $lte: endDate } }).select('date amount');
        const payablesData = await PurchaseBill.find({ billDate: { $gte: startDate, $lte: endDate } }).select('billDate grandTotal amountPaid');

        // Overall Totals
        const totalSales = salesData.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
        const totalReceipts = receiptsData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalExpenses = expensesData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalPurchases = payablesData.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
        const totalPayables = payablesData.reduce((acc, curr) => acc + ((curr.grandTotal || 0) - (curr.amountPaid || 0)), 0);

        // Helper to format date keys
        const formatDate = (date, format) => {
            const d = new Date(date);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            if (format === 'daily') {
                return `${d.getDate()} ${months[d.getMonth()]}`;
            } else if (format === 'weekly') {
                // Return start of the week (Sunday)
                const startOfWeek = new Date(d);
                startOfWeek.setDate(d.getDate() - d.getDay()); // Go to Sunday
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

        // Compile ordered sets using a time-series aligned array technique
        const compileAlignedData = (salesMap, receiptsMap, expensesMap, format) => {
            // Create an array of chronological keys for the specified range, handling gaps
            const keys = [];
            let current = new Date(startDate);

            while (current <= endDate) {
                const key = formatDate(current, format);
                if (!keys.includes(key)) {
                    keys.push(key);
                }

                // Increment current iterator
                if (format === 'daily') {
                    current.setDate(current.getDate() + 1);
                } else if (format === 'weekly') {
                    current.setDate(current.getDate() + 7);
                } else if (format === 'monthly') {
                    current.setMonth(current.getMonth() + 1);
                }
            }

            // Handle potential single-item edge cases for charts
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
