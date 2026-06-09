import { generateChallanPDF } from '../backend/utils/pdfGenerator.js';
import path from 'path';

const test = async () => {
    const mockChallan = {
        challanNumber: 'CHL-2026-0001-LONG-NUMBER-FOR-TESTING',
        date: new Date('2026-06-03'),
        discountAmount: 0,
        subtotal: 1000,
        taxAmount: 180,
        grandTotal: 1180,
        items: [
            { name: 'Red Stone Transportation Service', quantity: 10, rate: 100, amount: 1000 }
        ]
    };
    const mockCustomer = {
        name: 'John Doe Customer',
        companyName: 'Acme Corporates Ltd',
        billingAddress: {
            street: '456 Tech Park Ave',
            city: 'Chennai',
            state: 'TN',
            zipCode: '600002'
        }
    };
    const mockSettings = {
        companyName: 'Fast Logistic Solutions India Pvt Ltd',
        address: {
            street: '123 Expressway, Phase 2',
            city: 'Bangalore',
            state: 'KA',
            zipCode: '560001'
        },
        gstNumber: '29AAAAA1111A1Z1'
    };
    
    console.log('Generating test PDF...');
    await generateChallanPDF(
        mockChallan, 
        mockCustomer, 
        mockChallan.items, 
        mockSettings, 
        'modern', 
        '#2563eb', 
        path.join(path.resolve(), 'scratch', 'test-challan.pdf')
    );
    console.log('PDF generated at scratch/test-challan.pdf');
    process.exit(0);
};

test().catch(err => {
    console.error(err);
    process.exit(1);
});
