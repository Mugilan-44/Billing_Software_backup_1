import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Company from './models/Company.js';
import Branch from './models/Branch.js';
import CompanySettings from './models/CompanySettings.js';
import Subscription from './models/Subscription.js';

dotenv.config();

const createTestCompany = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find superadmin for createdBy reference
    const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    const createdBy = superAdmin ? superAdmin._id : new mongoose.Types.ObjectId();

    console.log('--- Seeding Test Environment ---');

    // 1. Create a fresh Company
    const company = await Company.create({
      name: 'Test Sandbox Company',
      email: 'sandbox@testcompany.com',
      phone: '9999999999',
      address: {
        street: '123 Testing Lane',
        city: 'Sandbox City',
        state: 'TS',
        zipCode: '100000'
      },
      createdBy
    });
    console.log(`✅ Company Created: ${company.name}`);

    // 2. Create Company Settings
    await CompanySettings.create({
      companyId: company._id,
      companyName: company.name,
      invoicePrefix: 'TST-INV',
      address: company.address
    });
    console.log(`✅ Company Settings Initialized`);

    // 3. Create a Branch
    const branch = await Branch.create({
      companyId: company._id,
      branchName: 'Main Test Branch',
      branchCode: 'TST01',
      createdBy
    });
    console.log(`✅ Branch Created: ${branch.branchName}`);

    // 3.5. Create Subscription
    await Subscription.create({
      companyId: company._id,
      plan: 'Premium',
      status: 'ACTIVE',
      createdBy
    });
    console.log(`✅ Subscription Created`);

    // 4. Create the Test Admin User
    const testEmail = `testadmin_${Date.now()}@billing.com`;
    const testPassword = 'testpassword123';
    
    const user = await User.create({
      name: 'Test Admin',
      email: testEmail,
      password: testPassword,
      role: 'ADMIN',
      companyId: company._id,
      branchId: branch._id
    });
    console.log(`✅ Test User Created!`);
    
    console.log('\n=======================================');
    console.log('🎉 TEST ENVIRONMENT READY');
    console.log('Login with the following credentials to access a completely isolated dashboard with 0 balances:');
    console.log(`Email:    ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log('=======================================\n');

    process.exit();
  } catch (error) {
    console.error('❌ Error creating test environment:', error);
    process.exit(1);
  }
};

createTestCompany();
