import { generateInvoicePDF } from '../utils/pdfGenerator.js';
import fs from 'fs';
import path from 'path';

// Find a real logo file from the uploads directory to use as a test image for logo, qr, and signature
const logosDir = path.join(process.cwd(), 'backend', 'uploads', 'logos');
let testImage = '';

if (fs.existsSync(logosDir)) {
    const files = fs.readdirSync(logosDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    if (files.length > 0) {
        testImage = `/uploads/logos/${files[0]}`;
    }
}

if (!testImage) {
    // Check if it's running with process.cwd() as backend
    const logosDirAlt = path.join(process.cwd(), 'uploads', 'logos');
    if (fs.existsSync(logosDirAlt)) {
        const files = fs.readdirSync(logosDirAlt).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
        if (files.length > 0) {
            testImage = `/uploads/logos/${files[0]}`;
        }
    }
}

console.log(`[Test] Using test image URL: "${testImage}"`);

const mockInvoice = {
    invoiceNumber: 'INV-TEST-999',
    date: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    subtotal: 1000,
    taxAmount: 180,
    cgst: 90,
    sgst: 90,
    igst: 0,
    grandTotal: 1180,
    notes: 'This is a test invoice to verify logo, QR, and signature resolution.',
    termsAndConditions: '1. Pay within 7 days.\n2. Goods once sold cannot be returned.',
    includeTerms: true,
    includeSignature: true,
    includeBankDetails: true,
    includeUpiQr: true,
    billingAddress: '456 Client Lane, Bangalore, KA, 560001',
    shippingAddress: '456 Client Lane, Bangalore, KA, 560001'
};

const mockCustomer = {
    companyName: 'ACME Test Corporation',
    name: 'John Test',
    email: 'john@example.com',
    phone: '9876543210',
    gstNumber: '29ABCDE1234F1Z5',
    address: '456 Client Lane, Bangalore, KA, 560001'
};

const mockItems = [
    {
        name: 'Premium Consulting Services',
        quantity: 2,
        rate: 500,
        gstPercentage: 18,
        amount: 1000,
        description: 'Detailed enterprise systems audit and path resolution design.'
    }
];

const mockSettings = {
    companyName: 'Antigravity Enterprise Solutions',
    address: {
        street: '100 Innovation Way, Tech Park',
        city: 'Bangalore',
        state: 'Karnataka'
    },
    gstNumber: '29AAACA1111A1Z0',
    currency: { symbol: '₹' },
    logoUrl: testImage,       // Points to uploaded image
    upiQrUrl: testImage,      // Points to uploaded image
    signature: testImage,     // Points to uploaded image
    bankDetails: {
        accountNumber: '91827364509',
        bankName: 'Innovators Bank',
        accountName: 'Antigravity Solutions',
        ifscCode: 'INNV0009876',
        branch: 'Silicon Valley Branch'
    },
    upiId: 'antigravity@upi'
};

async function runTest() {
    try {
        console.log(`[Test] Generating Modern PDF...`);
        const modernPath = await generateInvoicePDF(mockInvoice, mockCustomer, mockItems, mockSettings, 'modern');
        console.log(`[Success] Modern template generated at: ${modernPath}`);
        
        console.log(`[Test] Generating Classic PDF...`);
        const classicPath = await generateInvoicePDF(mockInvoice, mockCustomer, mockItems, mockSettings, 'classic');
        console.log(`[Success] Classic template generated at: ${classicPath}`);
        
        console.log('[Test] PDF Generation completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('[Error] PDF generation failed:', error);
        process.exit(1);
    }
}

runTest();
