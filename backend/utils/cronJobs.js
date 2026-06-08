import cron from 'node-cron';
import Invoice from '../models/Invoice.js';
import CompanySettings from '../models/CompanySettings.js';

// Generate automated recurring invoices exactly at 00:00 every midnight
const runCronJobs = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('Running daily cron job for Recurring Invoices...');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const recurringInvoices = await Invoice.find({
                isRecurring: true,
                nextRecurringDate: { $lte: today }
            });

            if (recurringInvoices.length === 0) {
                console.log('No recurring invoices scheduled for today.');
                return;
            }

            const settings = await CompanySettings.findOne() || {};
            const prefix = settings.invoicePrefix || 'INV/';

            for (let sourceInvoice of recurringInvoices) {
                // Generate a new invoice based on the source but set it to Draft

                // Construct new invoice number
                const count = await Invoice.countDocuments();
                const year = new Date().getFullYear();
                const newInvoiceNumber = `${prefix}${year}-${year + 1}/${(count + 1).toString().padStart(3, '0')}`;

                const newInvoiceData = {
                    invoiceNumber: newInvoiceNumber,
                    customerId: sourceInvoice.customerId,
                    date: today,
                    dueDate: sourceInvoice.dueDate ? new Date(today.getTime() + (sourceInvoice.dueDate.getTime() - sourceInvoice.date.getTime())) : today,
                    items: sourceInvoice.items.map(item => ({
                        itemId: item.itemId,
                        name: item.name,
                        quantity: item.quantity,
                        rate: item.rate,
                        gstPercentage: item.gstPercentage,
                        amount: item.amount
                    })),
                    subTotal: sourceInvoice.subTotal,
                    taxTotal: sourceInvoice.taxTotal,
                    discount: sourceInvoice.discount,
                    roundOff: sourceInvoice.roundOff,
                    grandTotal: sourceInvoice.grandTotal,
                    amountPaid: 0,
                    status: 'Draft',
                    notes: 'Auto-generated via Recurring Schedule',
                    transportDetails: sourceInvoice.transportDetails,
                };

                await Invoice.create(newInvoiceData);

                // Update nextRecurringDate
                let nextDate = new Date(sourceInvoice.nextRecurringDate);
                if (sourceInvoice.recurringInterval === 'Weekly') {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (sourceInvoice.recurringInterval === 'Monthly') {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                } else if (sourceInvoice.recurringInterval === 'Yearly') {
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                }

                sourceInvoice.nextRecurringDate = nextDate;
                await sourceInvoice.save();

                console.log(`Successfully generated recurring invoice ${newInvoiceNumber} for Customer ${sourceInvoice.customerId}`);
            }
        } catch (error) {
            console.error('Error executing recurring invoice CRON job:', error);
        }
    });
};

export default runCronJobs;
