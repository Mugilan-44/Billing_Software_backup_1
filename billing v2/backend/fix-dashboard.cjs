const fs = require('fs');

let content = fs.readFileSync('controllers/dashboardController.js', 'utf8');

if (!content.includes("import mongoose from 'mongoose';")) {
    content = "import mongoose from 'mongoose';\n" + content;
}

const matchLogic = `
    const companyFilter = req.user.role === 'ADMIN' && req.user.companyId 
      ? { companyId: new mongoose.Types.ObjectId(req.user.companyId) } 
      : {};
`;

content = content.replace(/\{ \$match: \{ /g, '{ $match: { ...companyFilter, ');
content = content.replace(/Vendor\.aggregate\(\[\n\s*\{\s*\$group/g, 'Vendor.aggregate([\n      { $match: companyFilter },\n      { $group');
content = content.replace(/Invoice\.find\(\{ status:/g, 'Invoice.find({ ...companyFilter, status:');
content = content.replace(/Customer\.find\(\)/g, 'Customer.find(companyFilter)');
content = content.replace(/Invoice\.find\(\{ date/g, 'Invoice.find({ ...companyFilter, date');
content = content.replace(/Payment\.find\(\{ \$or/g, 'Payment.find({ ...companyFilter, $or');
content = content.replace(/Expense\.find\(\{ date/g, 'Expense.find({ ...companyFilter, date');
content = content.replace(/PurchaseBill\.find\(\{ \$or/g, 'PurchaseBill.find({ ...companyFilter, $or');

content = content.replace(/export const getDashboardSummary = async \(req, res\) => \{\n  try \{/, "export const getDashboardSummary = async (req, res) => {\n  try {" + matchLogic);
content = content.replace(/export const getChartData = async \(req, res\) => \{\n  try \{/, "export const getChartData = async (req, res) => {\n  try {" + matchLogic);

fs.writeFileSync('controllers/dashboardController.js', content);
console.log('Dashboard fixed!');
