/**
 * BillingSystem — SUPER_ADMIN Seed Script
 * ========================================
 * Run this ONCE to create the first Super Admin account.
 * After running, use the Super Admin UI to create company + admin accounts.
 *
 * Usage:
 *   node seed-superadmin.js
 *
 * Or with custom values:
 *   SA_NAME="My Name" SA_EMAIL="me@email.com" SA_PASS="mypassword" node seed-superadmin.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// ─── Config — change these or pass via env vars ──────────────────────────────
const NAME = process.env.SA_NAME || 'Super Admin';
const EMAIL = process.env.SA_EMAIL || 'superadmin@billingsystem.com';
const PASSWORD = process.env.SA_PASS || 'SuperAdmin@123';

// ─── Minimal User schema (no pre-hook, we hash manually) ────────────────────
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, lowercase: true },
    password: String,
    role: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system');
        console.log('✅  Connected to MongoDB\n');

        // Check if a SUPER_ADMIN already exists
        const existing = await User.findOne({ role: 'SUPER_ADMIN' });
        if (existing) {
            console.log(`⚠️  SUPER_ADMIN already exists:`);
            console.log(`    Email : ${existing.email}`);
            console.log(`    Name  : ${existing.name}`);
            console.log('\n   If you forgot the password, delete the user from MongoDB and run this script again.');
            await mongoose.disconnect();
            return;
        }

        // Hash password manually (bypasses Mongoose hooks to avoid import issues)
        const hashed = await bcrypt.hash(PASSWORD, 10);

        const admin = await User.create({
            name: NAME,
            email: EMAIL,
            password: hashed,
            role: 'SUPER_ADMIN',
            isActive: true,
        });

        console.log('🎉  SUPER_ADMIN created successfully!\n');
        console.log('─────────────────────────────────────────');
        console.log(`   Name     : ${admin.name}`);
        console.log(`   Email    : ${admin.email}`);
        console.log(`   Password : ${PASSWORD}`);
        console.log(`   Role     : ${admin.role}`);
        console.log('─────────────────────────────────────────');
        console.log('\n📌  Next Steps:');
        console.log('   1. Start the backend:  npm run dev  (in /backend)');
        console.log('   2. Start the frontend: npm run dev  (in /frontend)');
        console.log('   3. Login at:  http://localhost:5173/super-admin/login');
        console.log('   4. Create a Company, then create an ADMIN user for that company');
        console.log('   5. ADMIN can then log in at: http://localhost:5173/admin/login\n');

    } catch (err) {
        console.error('❌  Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
