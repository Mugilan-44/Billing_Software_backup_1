import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
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
import { startOverdueCron } from './cron/overdue.cron.js';
import { protect } from './middleware/authMiddleware.js';
import { checkSubscription } from './middleware/subscriptionMiddleware.js';

// Database, crons, and listener are initialized inside startServer() below

const app = express();

app.use(express.json());
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: function (origin, callback) {
        console.log(`[CORS Audit] Incoming Origin: ${origin || 'No Origin'}`);
        if (!origin) {
            return callback(null, true);
        }

        const isExplicitlyAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
        const isLocalDev = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
        const isVercel = origin.endsWith('.vercel.app') || /^https:\/\/.*\.vercel\.app$/.test(origin);

        if (isExplicitlyAllowed || isLocalDev || isVercel) {
            console.log(`[CORS Audit] Allowed Origin: ${origin}`);
            return callback(null, true);
        }

        console.warn(`[CORS Audit] Blocked Origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ─── Health Check Route ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Billing System API is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 500).json({
        status: isDbConnected ? 'healthy' : 'unhealthy',
        database: isDbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ─── Auth Routes (includes 3 role-specific logins) ──────────────────────────
app.use('/api/auth', authRoutes);

// ─── Super Admin Routes ──────────────────────────────────────────────────────
app.use('/api/super-admin', superAdminRoutes);

// ─── Business Module Routes ──────────────────────────────────────────────────
app.use('/api/customers', protect, checkSubscription, customerRoutes);
app.use('/api/items', protect, checkSubscription, itemRoutes);
app.use('/api/invoices', protect, checkSubscription, invoiceRoutes);
app.use('/api/challans', protect, checkSubscription, challanRoutes);
app.use('/api/payments', protect, checkSubscription, paymentRoutes);
app.use('/api/dashboard', protect, checkSubscription, dashboardRoutes);
app.use('/api/settings', protect, checkSubscription, settingsRoutes);
app.use('/api/credit-notes', protect, checkSubscription, creditNoteRoutes);
app.use('/api/expenses', protect, checkSubscription, expenseRoutes);
app.use('/api/upload', protect, checkSubscription, uploadRoutes);
app.use('/api/reports', protect, checkSubscription, reportsRoutes);
app.use('/api/public', publicRoutes); // Keep public route unsecured
app.use('/api/quotations', protect, checkSubscription, quotationRoutes);
app.use('/api/sales-orders', protect, checkSubscription, salesOrderRoutes);
app.use('/api/vendors', protect, checkSubscription, vendorRoutes);
app.use('/api/purchase-bills', protect, checkSubscription, purchaseBillRoutes);
app.use('/api/branches', protect, checkSubscription, branchRoutes);

const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        runCronJobs();
        startOverdueCron();

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
    } catch (error) {
        console.error('FATAL: Database connection failed. Server startup aborted:', error.message);
        process.exit(1);
    }
};

startServer();
