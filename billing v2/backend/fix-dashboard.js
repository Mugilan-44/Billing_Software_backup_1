const fs = require('fs');

let content = fs.readFileSync('controllers/dashboardController.js', 'utf8');

// Add mongoose import if missing
if (!content.includes("import mongoose from 'mongoose';")) {
    content = "import mongoose from 'mongoose';\n" + content;
}

// Add companyId matching logic to both methods
const matchLogic = `
    const companyFilter = req.user.role === 'ADMIN' && req.user.companyId 
      ? { companyId: new mongoose.Types.ObjectId(req.user.companyId) } 
      : {};
`;

// Helper to inject companyFilter into $match aggregations
content = content.replace(/\{ \$match: \{ /g, '{ $match: { ...companyFilter, ');

// Helper to inject companyFilter into simple group pipelines (where no $match exists)
// e.g. Vendor.aggregate([{ $group: ...
content = content.replace(/Vendor\.aggregate\(\[\n\s*\{\s*\$group/g, 'Vendor.aggregate([\n      { $match: companyFilter },\n      { $group');

// Fix recentInvoices
content = content.replace(/Invoice\.find\(\{ status:/g, 'Invoice.find({ ...companyFilter, status:');

// Fix topCustomers
content = content.replace(/Customer\.find\(\)/g, 'Customer.find(companyFilter)');

// Fix find() in getChartData
content = content.replace(/Invoice\.find\(\{ date/g, 'Invoice.find({ ...companyFilter, date');
content = content.replace(/Payment\.find\(\{ \$or/g, 'Payment.find({ ...companyFilter, $or');
content = content.replace(/Expense\.find\(\{ date/g, 'Expense.find({ ...companyFilter, date');
content = content.replace(/PurchaseBill\.find\(\{ \$or/g, 'PurchaseBill.find({ ...companyFilter, $or');

// Inject the definition of companyFilter inside getDashboardSummary and getChartData
content = content.replace(/export const getDashboardSummary = async \(req, res\) => \{\n  try \{/, "export const getDashboardSummary = async (req, res) => {\n  try {" + matchLogic);
content = content.replace(/export const getChartData = async \(req, res\) => \{\n  try \{/, "export const getChartData = async (req, res) => {\n  try {" + matchLogic);

fs.writeFileSync('controllers/dashboardController.js', content);
console.log('Dashboard fixed!');
