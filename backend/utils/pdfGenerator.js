import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export const generateInvoicePDF = async (invoice, customer, items, settings) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
            const filePath = path.join(uploadsDir, `${sanitizedInvoiceNumber}.pdf`);
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            let currentY = 50;

            // LOGO
            if (settings?.logoUrl) {
                const relativeLogoPath = settings.logoUrl.replace(/^\/+/, ''); // Remove leading slash
                const logoPath = path.join(process.cwd(), relativeLogoPath);
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 50, currentY, { width: 120, height: 60, fit: [120, 60], align: 'left' });
                    currentY += 70;
                }
            }

            // HEADER: Company Info
            doc.font('Helvetica-Bold').fontSize(16).text(settings?.companyName || 'Transport Billing & Accounting', 50, currentY);
            currentY += 20;
            doc.font('Helvetica').fontSize(10);
            if (settings?.address?.street) {
                doc.text(`${settings.address.street}, ${settings.address.city}, ${settings.address.state}`, 50, currentY);
                currentY += 15;
            }
            doc.text(`GSTIN: ${settings?.gstNumber || 'Unregistered'}`, 50, currentY);

            // HEADER: Invoice Title & Info
            doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text('TAX INVOICE', 400, 50, { align: 'right' });
            doc.fillColor('black').font('Helvetica').fontSize(10);
            doc.text(`Invoice No: ${invoice.invoiceNumber}`, 400, 80, { align: 'right' });
            doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 400, 95, { align: 'right' });
            if (invoice.dueDate) {
                doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, 110, { align: 'right' });
            }

            // DIVIDER
            currentY = Math.max(currentY + 30, 140);
            doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(1).stroke('#e2e8f0');

            currentY += 20;

            // BILL TO
            doc.font('Helvetica-Bold').fontSize(11).text('BILL TO:', 50, currentY);
            doc.font('Helvetica').fontSize(10).text(customer.companyName, 50, currentY + 15);
            if (customer.billingAddress?.street) {
                doc.text(customer.billingAddress.street, 50, currentY + 30);
                doc.text(`${customer.billingAddress.city}, ${customer.billingAddress.state}`, 50, currentY + 45);
            }
            doc.font('Helvetica-Bold').text(`GSTIN: ${customer.gstNumber || 'URD'}`, 50, currentY + 60);

            // TRANSPORT DETAILS
            if (invoice.transportDetails?.vehicleNumber) {
                doc.font('Helvetica-Bold').text('DISPATCH DETAILS:', 350, currentY);
                doc.font('Helvetica').text(`Vehicle No: ${invoice.transportDetails.vehicleNumber}`, 350, currentY + 15);
                if (invoice.transportDetails.route) {
                    doc.text(`Route: ${invoice.transportDetails.route}`, 350, currentY + 30);
                }
                if (invoice.transportDetails.driverName) {
                    doc.text(`Driver: ${invoice.transportDetails.driverName}`, 350, currentY + 45);
                }
            }

            currentY += 90;

            // TABLE HEADER
            doc.rect(50, currentY, 495, 25).fill('#f8fafc').stroke('#e2e8f0');
            doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9);
            doc.text('ITEM & DESCRIPTION', 60, currentY + 8);
            doc.text('QTY', 270, currentY + 8);
            doc.text('RATE', 320, currentY + 8);
            doc.text('GST %', 380, currentY + 8);
            doc.text('AMOUNT', 460, currentY + 8, { align: 'right', width: 75 });

            currentY += 25;
            doc.fillColor('black').font('Helvetica').fontSize(9);

            // TABLE ROWS
            items.forEach(item => {
                doc.rect(50, currentY, 495, 25).stroke('#e2e8f0');
                doc.text(item.name.substring(0, 40) + (item.name.length > 40 ? '...' : ''), 60, currentY + 8);
                doc.text(item.quantity.toString(), 270, currentY + 8);
                doc.text(item.rate.toFixed(2), 320, currentY + 8);
                doc.text(`${item.gstPercentage}%`, 380, currentY + 8);
                doc.text(item.amount.toFixed(2), 460, currentY + 8, { align: 'right', width: 75 });
                currentY += 25;
            });

            // TOTALS CALCULATION
            currentY += 15;
            const rightColX = 350;

            doc.font('Helvetica-Bold').text('Sub Total:', rightColX, currentY);
            doc.font('Helvetica').text(invoice.subTotal.toFixed(2), 460, currentY, { align: 'right', width: 75 });
            currentY += 15;

            if (invoice.discount > 0) {
                doc.font('Helvetica-Bold').text('Discount:', rightColX, currentY);
                doc.font('Helvetica').text(`- ${invoice.discount.toFixed(2)}`, 460, currentY, { align: 'right', width: 75 });
                currentY += 15;
            }

            if (invoice.taxTotal.totalTax > 0) {
                if (invoice.taxTotal.cgst > 0) {
                    doc.font('Helvetica-Bold').text('CGST:', rightColX, currentY);
                    doc.font('Helvetica').text(invoice.taxTotal.cgst.toFixed(2), 460, currentY, { align: 'right', width: 75 });
                    currentY += 15;
                }
                if (invoice.taxTotal.sgst > 0) {
                    doc.font('Helvetica-Bold').text('SGST:', rightColX, currentY);
                    doc.font('Helvetica').text(invoice.taxTotal.sgst.toFixed(2), 460, currentY, { align: 'right', width: 75 });
                    currentY += 15;
                }
                if (invoice.taxTotal.igst > 0) {
                    doc.font('Helvetica-Bold').text('IGST:', rightColX, currentY);
                    doc.font('Helvetica').text(invoice.taxTotal.igst.toFixed(2), 460, currentY, { align: 'right', width: 75 });
                    currentY += 15;
                }
            }

            // GRAND TOTAL
            currentY += 10;
            doc.rect(rightColX - 10, currentY - 5, 205, 25).fill('#f1f5f9');
            doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Grand Total:', rightColX, currentY);
            doc.text(`${settings?.currency?.symbol || 'Rs.'} ${invoice.grandTotal.toFixed(2)}`, 460, currentY, { align: 'right', width: 75 });

            // BANK DETAILS & QR CODE
            doc.fillColor('black').font('Helvetica-Bold').fontSize(10).text('Bank Details', 50, currentY - 30);
            doc.font('Helvetica').fontSize(9);

            if (settings?.bankDetails?.bankName) {
                doc.text(`Bank: ${settings.bankDetails.bankName}`, 50, currentY - 15);
                doc.text(`A/C Name: ${settings.bankDetails.accountName}`, 50, currentY);
                doc.text(`A/C Number: ${settings.bankDetails.accountNumber}`, 50, currentY + 15);
                doc.text(`IFSC: ${settings.bankDetails.ifscCode}`, 50, currentY + 30);
            } else {
                doc.text('No bank details provided.', 50, currentY - 15);
            }

            // Generate UPI QR Code
            if (settings?.bankDetails?.accountNumber) {
                try {
                    // We fake a generic UPI scheme using bank details for demo scaling
                    const upiString = `upi://pay?pa=${settings.bankDetails.accountNumber}@upi&pn=${encodeURIComponent(settings.companyName || 'Company')}&am=${invoice.grandTotal}&cu=INR`;
                    const qrDataUrl = await QRCode.toDataURL(upiString, { margin: 1 });
                    doc.image(qrDataUrl, 230, currentY - 30, { width: 70 });
                    doc.fontSize(8).fillColor('#64748b').text('Scan to Pay via UPI', 225, currentY + 45);
                } catch (error) {
                    console.error('QR Generation failed', error);
                }
            }

            // FOOTER
            doc.fillColor('#94a3b8').fontSize(9).text('Thank you for your business. This is a computer-generated invoice.', 50, doc.page.height - 50, { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
};
