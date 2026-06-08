import cron from 'node-cron';
import Invoice from '../models/Invoice.js';

export function startOverdueCron() {
  // Runs every day at 00:00 UTC to avoid timezone drift
  cron.schedule('0 0 * * *', async () => {
    try {
      // Exact midnight UTC boundary
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);

      // Critical: ONLY mark overdue if there is still an unpaid balance.
      // Never mark fully paid invoices as overdue.
      const result = await Invoice.updateMany(
        {
          dueDate:    { $lt: now },
          balanceDue: { $gt: 0 },
          status:     { $in: ['Sent', 'Partial'] },
        },
        { $set: { status: 'Overdue' } }
      );
      console.log(`[CRON] Overdue sweep complete — ${result.modifiedCount} invoices marked Overdue`);
    } catch (err) {
      console.error('[CRON] Overdue update failed:', err.message);
    }
  }, { timezone: 'UTC' });
}
