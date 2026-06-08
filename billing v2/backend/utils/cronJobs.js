import cron from 'node-cron';
import Invoice from '../models/Invoice.js';
import CompanySettings from '../models/CompanySettings.js';
import { markOverdueInvoices } from './billing.utils.js';

// ─── Overdue Invoice Cron — runs every day at 00:05 ──────────────────────────
const overdueJob = cron.schedule('5 0 * * *', async () => {
  console.log('[CRON] Checking for overdue invoices...');
  try {
    const count = await markOverdueInvoices(Invoice);
    console.log(`[CRON] Marked ${count} invoice(s) as Overdue`);
  } catch (err) {
    console.error('[CRON] Overdue check failed:', err.message);
  }
}, { scheduled: false });

// ─── Recurring Invoice Cron — runs every day at midnight ─────────────────────
const recurringJob = cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running daily recurring invoice job...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recurringInvoices = await Invoice.find({
      isRecurring: true,
      nextRecurringDate: { $lte: today },
    });

    if (!recurringInvoices.length) {
      console.log('[CRON] No recurring invoices scheduled for today.');
      return;
    }

    for (const sourceInvoice of recurringInvoices) {
      const settings = await CompanySettings.findOne({ companyId: sourceInvoice.companyId }) || {};
      const prefix   = settings.invoicePrefix || 'INV/';
      const count = await Invoice.countDocuments({ companyId: sourceInvoice.companyId });
      const year  = new Date().getFullYear();
      const newInvoiceNumber = `${prefix}${year}-${year + 1}/${(count + 1).toString().padStart(3, '0')}`;

      const newInvoiceData = {
        invoiceNumber: newInvoiceNumber,
        customerId:    sourceInvoice.customerId,
        date:          today,
        dueDate:       sourceInvoice.dueDate
          ? new Date(today.getTime() + (sourceInvoice.dueDate.getTime() - sourceInvoice.date.getTime()))
          : today,
        lineItems: sourceInvoice.lineItems || [],
        subtotal:  sourceInvoice.subtotal  || sourceInvoice.subTotal || 0,
        cgst:      sourceInvoice.cgst  || sourceInvoice.taxTotal?.cgst  || 0,
        sgst:      sourceInvoice.sgst  || sourceInvoice.taxTotal?.sgst  || 0,
        igst:      sourceInvoice.igst  || sourceInvoice.taxTotal?.igst  || 0,
        grandTotal: sourceInvoice.grandTotal,
        balanceDue: sourceInvoice.grandTotal,
        amountPaid: 0,
        status:     'Draft',
        notes:      'Auto-generated via Recurring Schedule',
        transportDetails: sourceInvoice.transportDetails,
        companyId:     sourceInvoice.companyId,
        branchId:      sourceInvoice.branchId,
        isRecurring: true,
        recurringInterval: sourceInvoice.recurringInterval,
      };

      await Invoice.create(newInvoiceData);

      const nextDate = new Date(sourceInvoice.nextRecurringDate);
      if      (sourceInvoice.recurringInterval === 'Weekly')  nextDate.setDate(nextDate.getDate() + 7);
      else if (sourceInvoice.recurringInterval === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (sourceInvoice.recurringInterval === 'Yearly')  nextDate.setFullYear(nextDate.getFullYear() + 1);

      sourceInvoice.nextRecurringDate = nextDate;
      await sourceInvoice.save();

      console.log(`[CRON] Generated recurring invoice ${newInvoiceNumber} for Customer ${sourceInvoice.customerId}`);
    }
  } catch (error) {
    console.error('[CRON] Recurring invoice job failed:', error);
  }
}, { scheduled: false });

// ─── Start all cron jobs ─────────────────────────────────────────────────────
const runCronJobs = () => {
  overdueJob.start();
  recurringJob.start();
  console.log('[CRON] Cron jobs started: overdue check (00:05) + recurring invoices (00:00)');
};

export default runCronJobs;
