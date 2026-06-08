import mongoose from 'mongoose';

async function test() {
    await mongoose.connect('mongodb://localhost:27017/billing_system');

    // Simulate schemas
    const Invoice = mongoose.model('Invoice', new mongoose.Schema({ date: Date, grandTotal: Number, status: String }, { strict: false }));
    const Payment = mongoose.model('Payment', new mongoose.Schema({ paymentDate: Date, amount: Number }, { strict: false }));
    const Expense = mongoose.model('Expense', new mongoose.Schema({ date: Date, amount: Number }, { strict: false }));
    const PurchaseBill = mongoose.model('PurchaseBill', new mongoose.Schema({ billDate: Date, grandTotal: Number }, { strict: false }));

    let startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    console.log(`Searching from ${startDate} to ${endDate}`);

    const salesData = await Invoice.find({ date: { $gte: startDate, $lte: endDate }, status: { $ne: 'Draft' } }).select('date grandTotal');
    const receiptsData = await Payment.find({ paymentDate: { $gte: startDate, $lte: endDate } }).select('paymentDate amount');
    const expensesData = await Expense.find({ date: { $gte: startDate, $lte: endDate } }).select('date amount');
    const payablesData = await PurchaseBill.find({ billDate: { $gte: startDate, $lte: endDate } }).select('billDate grandTotal');

    console.log('Invoices Count:', salesData.length);
    console.log('Receipts Count:', receiptsData.length);
    console.log('Expenses Count:', expensesData.length);
    console.log('Payables Count:', payablesData.length);

    const totalSales = salesData.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
    console.log('Total sales calculated:', totalSales);

    if (salesData.length > 0) {
        console.log('Sample Invoice:', salesData[0].grandTotal, salesData[0].date);
    }

    process.exit(0);
}
test();
