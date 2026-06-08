import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import challanRoutes from './routes/challanRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import creditNoteRoutes from './routes/creditNoteRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import quotationRoutes from './routes/quotationRoutes.js';
import salesOrderRoutes from './routes/salesOrderRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import purchaseBillRoutes from './routes/purchaseBillRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import runCronJobs from './utils/cronJobs.js';

dotenv.config();
connectDB();
runCronJobs();

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ─── Auth Routes (includes 3 role-specific logins) ──────────────────────────
app.use('/api/auth', authRoutes);

// ─── Super Admin Routes ──────────────────────────────────────────────────────
app.use('/api/super-admin', superAdminRoutes);

// ─── Business Module Routes ──────────────────────────────────────────────────
app.use('/api/customers', customerRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase-bills', purchaseBillRoutes);
app.use('/api/branches', branchRoutes);

const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`BillingSystem API running on port ${PORT} | Bound to 0.0.0.0 | RBAC: SUPER_ADMIN / ADMIN / CUSTOMER`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please kill the process or use a different port.`);
    } else {
        console.error('An error occurred while starting the server:', error);
    }
    process.exit(1);
});
