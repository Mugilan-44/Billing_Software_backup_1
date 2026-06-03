import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const formatCustomerAddress = (addr, flatFallback) => {
    if (!addr) return flatFallback || '';
    if (typeof addr === 'string') return addr;
    
    const hasValues = Object.values(addr).some(val => val !== undefined && val !== null && String(val).trim() !== '');
    if (!hasValues) {
        return flatFallback || '';
    }

    const streetParts = [addr.street1, addr.street2, addr.street].filter(Boolean).map(s => String(s).trim()).join(', ');
    const parts = [
        streetParts,
        addr.city,
        addr.state,
        addr.zipCode || addr.pincode || addr.zip
    ].filter(v => v && String(v).trim() !== '');

    if (parts.length === 0) {
        return flatFallback || '';
    }
    return parts.join(', ');
};

const getDocNumberLabel = (docType) => {
    switch (docType) {
        case 'invoice': return 'Invoice No';
        case 'challan': return 'Challan No';
        case 'quotation': return 'Reference No';
        case 'sales-order': return 'Order No';
        case 'purchase-bill': return 'Bill No';
        case 'credit-note': return 'Credit Note No';
        default: return 'No';
    }
};

export const generateStandardPDF = async (docTitle, docType, invoice, customer, items, settings, template = 'modern', color = '#2563eb', customFilePath = null) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const folderName = docType === 'sales-order' ? 'sales-orders' : `${docType}s`;
            const uploadsDir = path.join(process.cwd(), 'uploads', folderName);

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/[\/\x5c:*?"<>|]/g, '-');
            const filePath = customFilePath || path.join(uploadsDir, `${sanitizedInvoiceNumber}.pdf`);
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // Use the selected accent color or default
            const accentColor = color || '#2563eb';
            const isClassic = template === 'classic';
            const isMinimal = template === 'minimal';
            const isBold = template === 'bold';
            const isElegant = template === 'elegant';
            const isProfessional = template === 'professional';
            const isVibrant = template === 'vibrant';
            const isGST = template === 'gst';

            // Set font family based on template
            const fontRegular = isClassic ? 'Times-Roman' : (isElegant ? 'Courier' : 'Helvetica');
            const fontBold = isClassic ? 'Times-Bold' : (isElegant ? 'Courier-Bold' : 'Helvetica-Bold');

            let currentY = 50;

            // DRAW HEADER BY TEMPLATE
            if (isBold || isVibrant) {
                // Bold/Vibrant top header banner
                doc.rect(0, 0, 595, 120).fill(accentColor);
                doc.fillColor('white').font(fontBold).fontSize(18).text(settings?.companyName || 'Transport Billing & Accounting', 50, 40, { width: 240 });
                doc.fontSize(9).font(fontRegular).text([settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', '), 50, doc.y + 4, { width: 240 });
                if (settings?.gstNumber) {
                    doc.text(`GSTIN: ${settings.gstNumber}`, 50, doc.y + 2);
                }
                const leftColBottom = doc.y;

                doc.fillColor('white').font(fontBold).fontSize(20).text(docTitle, 300, 40, { align: 'right', width: 245 });
                doc.fontSize(10).font(fontRegular).text(`${getDocNumberLabel(docType)}: ${invoice.invoiceNumber}`, 300, doc.y + 4, { align: 'right', width: 245 });
                doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 300, doc.y + 2, { align: 'right', width: 245 });
                currentY = Math.max(140, leftColBottom + 15, doc.y + 15);
            } else if (isClassic) {
                // Classic Centered Header
                if (settings?.logoUrl) {
                    let relativeLogoPath = settings.logoUrl;
                    if (relativeLogoPath.includes('/uploads/')) {
                        relativeLogoPath = relativeLogoPath.substring(relativeLogoPath.indexOf('uploads/'));
                    } else {
                        relativeLogoPath = relativeLogoPath.replace(/^\/+/, '');
                    }
                    const logoPath = path.join(process.cwd(), relativeLogoPath);
                    if (fs.existsSync(logoPath)) {
                        doc.image(logoPath, 237, currentY, { width: 120, height: 50, fit: [120, 50], align: 'center' });
                        currentY += 60;
                    }
                }
                doc.fillColor('#0f172a').font(fontBold).fontSize(20).text(settings?.companyName || 'Transport Billing & Accounting', 50, currentY, { align: 'center', width: 495 });
                currentY = doc.y + 5;
                doc.font(fontRegular).fontSize(9).text([settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', '), 50, currentY, { align: 'center', width: 495 });
                currentY = doc.y + 3;
                if (settings?.gstNumber) {
                    doc.text(`GSTIN: ${settings.gstNumber}`, 50, currentY, { align: 'center', width: 495 });
                    currentY = doc.y + 3;
                }
                
                // Double lines
                currentY += 5;
                doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(1.5).stroke('#000');
                doc.moveTo(50, currentY + 3).lineTo(545, currentY + 3).lineWidth(0.5).stroke('#000');
                currentY += 15;

                // Invoice metadata row
                doc.fillColor('black').font(fontBold).fontSize(10);
                doc.text(`${getDocNumberLabel(docType)}: ${invoice.invoiceNumber}`, 50, currentY);
                doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 350, currentY, { align: 'right', width: 195 });
                if (invoice.dueDate) {
                    currentY += 15;
                    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 350, currentY, { align: 'right', width: 195 });
                }
                currentY += 25;
            } else if (isMinimal) {
                // Clean Minimal layout
                doc.fillColor('#0f172a').font(fontBold).fontSize(18).text(settings?.companyName || 'Transport Billing & Accounting', 50, currentY, { width: 240 });
                currentY = doc.y + 4;
                doc.font(fontRegular).fontSize(9).fillColor('#475569');
                doc.text([settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', '), 50, currentY, { width: 240 });
                currentY = doc.y + 2;
                if (settings?.gstNumber) {
                    doc.text(`GSTIN: ${settings.gstNumber}`, 50, currentY);
                    currentY = doc.y + 2;
                }
                const leftColBottom = doc.y;

                doc.fillColor('#0f172a').font(fontBold).fontSize(18).text(docTitle, 300, 50, { align: 'right', width: 245 });
                doc.font(fontRegular).fontSize(9).fillColor('#475569').text(`${getDocNumberLabel(docType)}: ${invoice.invoiceNumber}`, 300, doc.y + 4, { align: 'right', width: 245 });
                doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 300, doc.y + 2, { align: 'right', width: 245 });
                
                currentY = Math.max(leftColBottom + 15, doc.y + 15, 120);
                doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(0.5).stroke('#cbd5e1');
                currentY += 15;
            } else {
                // Modern/Professional/Elegant/GST Default Layout
                if (settings?.logoUrl) {
                    let relativeLogoPath = settings.logoUrl;
                    if (relativeLogoPath.includes('/uploads/')) {
                        relativeLogoPath = relativeLogoPath.substring(relativeLogoPath.indexOf('uploads/'));
                    } else {
                        relativeLogoPath = relativeLogoPath.replace(/^\/+/, '');
                    }
                    const logoPath = path.join(process.cwd(), relativeLogoPath);
                    if (fs.existsSync(logoPath)) {
                        doc.image(logoPath, 50, currentY, { width: 120, height: 60, fit: [120, 60], align: 'left' });
                        currentY += 70;
                    }
                }
                doc.font(fontBold).fontSize(16).fillColor(accentColor).text(settings?.companyName || 'Transport Billing & Accounting', 50, currentY, { width: 240 });
                currentY = doc.y + 4;
                doc.font(fontRegular).fontSize(9).fillColor('#475569');
                doc.text([settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', '), 50, currentY, { width: 240 });
                currentY = doc.y + 2;
                doc.text(`GSTIN: ${settings?.gstNumber || 'Unregistered'}`, 50, currentY);
                const leftColBottom = doc.y;

                // Right side header info
                doc.font(fontBold).fontSize(20).fillColor(accentColor).text(docTitle, 300, 50, { align: 'right', width: 245 });
                doc.fillColor('#0f172a').font(fontRegular).fontSize(10);
                doc.text(`${getDocNumberLabel(docType)}: ${invoice.invoiceNumber}`, 300, doc.y + 4, { align: 'right', width: 245 });
                doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 300, doc.y + 2, { align: 'right', width: 245 });
                if (invoice.dueDate) {
                    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 300, doc.y + 2, { align: 'right', width: 245 });
                }

                currentY = Math.max(leftColBottom + 15, doc.y + 15, 140);
                doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(2).stroke(accentColor);
                currentY += 15;
            }

            // BILL TO and DISPATCH DETAILS / SHIP TO
            doc.fillColor('black');
            
            let billToY = currentY;
            let rightColY = currentY;
            
            if (isGST) {
                // GST layout has Bill To and Ship To side-by-side
                // Left Column: Bill To
                doc.font(fontBold).fontSize(10).fillColor(accentColor).text('BILL TO:', 50, billToY);
                billToY += 15;
                doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(customer.companyName || customer.name || 'Customer', 50, billToY, { width: 240 });
                billToY += 15;
                
                doc.font(fontRegular).fontSize(9).fillColor('#475569');
                const custBillingAddress = formatCustomerAddress(customer?.billingAddress, customer?.address);
                if (invoice.billingAddress) {
                    doc.text(invoice.billingAddress, 50, billToY, { width: 240 });
                    billToY += doc.heightOfString(invoice.billingAddress, { width: 240 }) + 5;
                } else if (custBillingAddress) {
                    doc.text(custBillingAddress, 50, billToY, { width: 240 });
                    billToY += doc.heightOfString(custBillingAddress, { width: 240 }) + 5;
                }
                doc.font(fontBold).fillColor('#0f172a').text(`GSTIN: ${customer.gstNumber || customer.gstin || 'URD'}`, 50, billToY);
                billToY += 15;

                // Right Column: Ship To
                doc.font(fontBold).fontSize(10).fillColor(accentColor).text('SHIP TO:', 300, rightColY);
                rightColY += 15;
                const custShippingAddress = formatCustomerAddress(customer?.shippingAddress);
                if (invoice.shippingAddress) {
                    doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(customer.companyName || customer.name || 'Customer', 300, rightColY, { width: 245 });
                    rightColY += 15;
                    doc.font(fontRegular).fontSize(9).fillColor('#475569').text(invoice.shippingAddress, 300, rightColY, { width: 245 });
                    rightColY += doc.heightOfString(invoice.shippingAddress, { width: 245 }) + 5;
                } else if (custShippingAddress) {
                    doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(customer.companyName || customer.name || 'Customer', 300, rightColY, { width: 245 });
                    rightColY += 15;
                    doc.font(fontRegular).fontSize(9).fillColor('#475569').text(custShippingAddress, 300, rightColY, { width: 245 });
                    rightColY += doc.heightOfString(custShippingAddress, { width: 245 }) + 5;
                } else {
                    doc.font(fontRegular).fontSize(9).fillColor('#64748b').text('Same as billing address', 300, rightColY, { width: 245 });
                    rightColY += 15;
                }
            } else {
                // Standard templates: Bill To (left) & Dispatch (right)
                // Left Column: Bill To
                if (isClassic) {
                    doc.font(fontBold).fontSize(10).text('BILL TO:', 50, billToY);
                    billToY += 15;
                    doc.font(fontRegular).fontSize(10).text(customer.companyName || customer.name || 'Customer', 50, billToY, { width: 250 });
                    billToY += 15;
                    doc.font(fontRegular).fontSize(9);
                    const custBillingAddress = formatCustomerAddress(customer?.billingAddress, customer?.address);
                    if (invoice.billingAddress) {
                        doc.text(invoice.billingAddress, 50, billToY, { width: 250 });
                        billToY += doc.heightOfString(invoice.billingAddress, { width: 250 }) + 5;
                    } else if (custBillingAddress) {
                        doc.text(custBillingAddress, 50, billToY, { width: 250 });
                        billToY += doc.heightOfString(custBillingAddress, { width: 250 }) + 5;
                    }
                    doc.font(fontBold).text(`GSTIN: ${customer.gstNumber || customer.gstin || 'URD'}`, 50, billToY);
                    billToY += 15;
                } else if (isMinimal) {
                    doc.font(fontBold).fontSize(9).text('BILLED TO:', 50, billToY);
                    billToY += 12;
                    doc.font(fontRegular).fontSize(9).text(customer.companyName || customer.name || 'Customer', 50, billToY, { width: 250 });
                    billToY += 12;
                    const custBillingAddress = formatCustomerAddress(customer?.billingAddress, customer?.address);
                    if (invoice.billingAddress) {
                        doc.text(invoice.billingAddress, 50, billToY, { width: 250 });
                        billToY += doc.heightOfString(invoice.billingAddress, { width: 250 }) + 5;
                    } else if (custBillingAddress) {
                        doc.text(custBillingAddress, 50, billToY, { width: 250 });
                        billToY += doc.heightOfString(custBillingAddress, { width: 250 }) + 5;
                    }
                    doc.text(`GSTIN: ${customer.gstNumber || customer.gstin || 'URD'}`, 50, billToY);
                    billToY += 12;
                } else {
                    // Modern / Professional / Elegant / Bold / Vibrant
                    doc.font(fontBold).fontSize(10).fillColor(accentColor).text('BILL TO:', 50, billToY);
                    billToY += 15;
                    doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(customer.companyName || customer.name || 'Customer', 50, billToY, { width: 250 });
                    billToY += 15;
                    doc.font(fontRegular).fontSize(9).fillColor('#475569');
                    const custBillingAddress = formatCustomerAddress(customer?.billingAddress, customer?.address);
                    if (invoice.billingAddress) {
                        doc.text(invoice.billingAddress, 50, billToY, { width: 250 });
                        billToY += doc.heightOfString(invoice.billingAddress, { width: 250 }) + 5;
                    } else if (custBillingAddress) {
                        doc.text(custBillingAddress, 50, billToY, { width: 250 });
                        billToY += doc.heightOfString(custBillingAddress, { width: 250 }) + 5;
                    }
                    doc.font(fontBold).fillColor('#0f172a').text(`GSTIN: ${customer.gstNumber || customer.gstin || 'URD'}`, 50, billToY);
                    billToY += 15;
                }

                // Right Column: Dispatch Details / Shipped Via
                if (invoice.transportDetails?.vehicleNumber) {
                    doc.font(fontBold).fontSize(10);
                    if (isClassic) {
                        doc.fillColor('black').text('DISPATCH DETAILS:', 350, rightColY);
                        rightColY += 15;
                        doc.font(fontRegular).text(`Vehicle No: ${invoice.transportDetails.vehicleNumber}`, 350, rightColY, { width: 195 });
                        rightColY += 13;
                        if (invoice.transportDetails.route) {
                            doc.text(`Route: ${invoice.transportDetails.route}`, 350, rightColY, { width: 195 });
                            rightColY += 13;
                        }
                    } else if (isMinimal) {
                        doc.fillColor('#0f172a').text('SHIPPED VIA:', 350, rightColY);
                        rightColY += 12;
                        doc.font(fontRegular).text(`${invoice.transportDetails.vehicleNumber} (${invoice.transportDetails.route || ''})`, 350, rightColY, { width: 195 });
                        rightColY += 12;
                    } else {
                        doc.fillColor(accentColor).text('DISPATCH DETAILS:', 350, rightColY);
                        rightColY += 15;
                        doc.font(fontRegular).fillColor('#475569').text(`Vehicle No: ${invoice.transportDetails.vehicleNumber}`, 350, rightColY, { width: 195 });
                        rightColY += 13;
                        if (invoice.transportDetails.route) {
                            doc.text(`Route: ${invoice.transportDetails.route}`, 350, rightColY, { width: 195 });
                            rightColY += 13;
                        }
                        if (invoice.transportDetails.driverName) {
                            doc.text(`Driver: ${invoice.transportDetails.driverName}`, 350, rightColY, { width: 195 });
                            rightColY += 13;
                        }
                    }
                }
            }

            currentY = Math.max(billToY, rightColY) + 15;

            // RENDERING TABLE (GST Compliant vs Standard)
            const tax = {
                cgst: invoice.cgst ?? invoice.taxTotal?.cgst ?? 0,
                sgst: invoice.sgst ?? invoice.taxTotal?.sgst ?? 0,
                igst: invoice.igst ?? invoice.taxTotal?.igst ?? 0,
                totalTax: invoice.taxAmount ?? invoice.taxTotal?.totalTax ?? 0
            };

            if (isGST) {
                const isIGST = invoice.taxType !== 'GST' || (tax.igst > 0 && tax.cgst === 0);

                // DRAW GST HEADER
                doc.rect(50, currentY, 495, 25).fill(accentColor);
                doc.fillColor('white').font(fontBold).fontSize(8);
                
                if (isIGST) {
                    doc.text('S.No', 52, currentY + 8);
                    doc.text('ITEM / DESCRIPTION', 82, currentY + 8);
                    doc.text('HSN', 222, currentY + 8);
                    doc.text('QTY', 267, currentY + 8);
                    doc.text('RATE', 297, currentY + 8);
                    doc.text('TAX VAL', 352, currentY + 8);
                    doc.text('IGST %', 412, currentY + 8);
                    doc.text('IGST ₹', 452, currentY + 8);
                    doc.text('TOTAL', 507, currentY + 8, { align: 'right', width: 35 });
                } else {
                    doc.text('S.No', 51, currentY + 8);
                    doc.text('ITEM / DESCRIPTION', 76, currentY + 8);
                    doc.text('HSN', 186, currentY + 8);
                    doc.text('QTY', 221, currentY + 8);
                    doc.text('RATE', 246, currentY + 8);
                    doc.text('TAX VAL', 291, currentY + 8);
                    doc.text('CGST %', 341, currentY + 8);
                    doc.text('CGST ₹', 371, currentY + 8);
                    doc.text('SGST %', 411, currentY + 8);
                    doc.text('SGST ₹', 441, currentY + 8);
                    doc.text('TOTAL', 481, currentY + 8, { align: 'right', width: 60 });
                }
                
                currentY += 25;
                doc.fillColor('black').font(fontRegular).fontSize(8);

                // DRAW GST ROWS
                items.forEach((item, idx) => {
                    const itemName = (item.name || 'Item').toString();
                    const itemQty = item.quantity ?? 0;
                    const itemRate = Number(item.rate) || 0;
                    const itemGst = item.gstPercentage ?? 0;
                    const taxableVal = itemQty * itemRate;
                    const taxAmt = taxableVal * itemGst / 100;
                    const totalAmt = taxableVal + taxAmt;
                    const rowHeight = item.description ? 35 : 25;

                    // Pagination check
                    if (currentY > 730) {
                        doc.addPage();
                        currentY = 50;
                        doc.rect(50, currentY, 495, 20).fill(accentColor);
                        doc.fillColor('white').font(fontBold).fontSize(8);
                        if (isIGST) {
                            doc.text('S.No', 52, currentY + 5);
                            doc.text('ITEM / DESCRIPTION (Contd.)', 82, currentY + 5);
                            doc.text('HSN', 222, currentY + 5);
                            doc.text('QTY', 267, currentY + 5);
                            doc.text('RATE', 297, currentY + 5);
                            doc.text('TAX VAL', 352, currentY + 5);
                            doc.text('IGST %', 412, currentY + 5);
                            doc.text('IGST ₹', 452, currentY + 5);
                            doc.text('TOTAL', 507, currentY + 5, { align: 'right', width: 35 });
                        } else {
                            doc.text('S.No', 51, currentY + 5);
                            doc.text('ITEM / DESCRIPTION (Contd.)', 76, currentY + 5);
                            doc.text('HSN', 186, currentY + 5);
                            doc.text('QTY', 221, currentY + 5);
                            doc.text('RATE', 246, currentY + 5);
                            doc.text('TAX VAL', 291, currentY + 5);
                            doc.text('CGST %', 341, currentY + 5);
                            doc.text('CGST ₹', 371, currentY + 5);
                            doc.text('SGST %', 411, currentY + 5);
                            doc.text('SGST ₹', 441, currentY + 5);
                            doc.text('TOTAL', 481, currentY + 5, { align: 'right', width: 60 });
                        }
                        currentY += 20;
                        doc.fillColor('black').font(fontRegular).fontSize(8);
                    }

                    doc.rect(50, currentY, 495, rowHeight).stroke('#e2e8f0');

                    if (isIGST) {
                        doc.text((idx + 1).toString(), 52, currentY + 5);
                        doc.text(itemName.substring(0, 25) + (itemName.length > 25 ? '...' : ''), 82, currentY + 5);
                        if (item.description) {
                            doc.fillColor('#64748b').fontSize(6.5).text(item.description, 82, currentY + 16, { width: 135 });
                            doc.fillColor('black').fontSize(8);
                        }
                        doc.text(item.hsnCode || item.itemId?.hsnCode || '-', 222, currentY + 5);
                        doc.text(itemQty.toString(), 267, currentY + 5);
                        doc.text(itemRate.toFixed(2), 297, currentY + 5);
                        doc.text(taxableVal.toFixed(2), 352, currentY + 5);
                        doc.text(`${itemGst}%`, 412, currentY + 5);
                        doc.text(taxAmt.toFixed(2), 452, currentY + 5);
                        doc.text(totalAmt.toFixed(2), 507, currentY + 5, { align: 'right', width: 35 });
                    } else {
                        const halfTax = taxAmt / 2;
                        doc.text((idx + 1).toString(), 51, currentY + 5);
                        doc.text(itemName.substring(0, 20) + (itemName.length > 20 ? '...' : ''), 76, currentY + 5);
                        if (item.description) {
                            doc.fillColor('#64748b').fontSize(6.5).text(item.description, 76, currentY + 16, { width: 105 });
                            doc.fillColor('black').fontSize(8);
                        }
                        doc.text(item.hsnCode || item.itemId?.hsnCode || '-', 186, currentY + 5);
                        doc.text(itemQty.toString(), 221, currentY + 5);
                        doc.text(itemRate.toFixed(2), 246, currentY + 5);
                        doc.text(taxableVal.toFixed(2), 291, currentY + 5);
                        doc.text(`${itemGst/2}%`, 341, currentY + 5);
                        doc.text(halfTax.toFixed(2), 371, currentY + 5);
                        doc.text(`${itemGst/2}%`, 411, currentY + 5);
                        doc.text(halfTax.toFixed(2), 441, currentY + 5);
                        doc.text(totalAmt.toFixed(2), 481, currentY + 5, { align: 'right', width: 60 });
                    }
                    currentY += rowHeight;
                });
            } else {
                // STANDARD TABLE HEADER
                if (isMinimal) {
                    doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(0.5).stroke('#cbd5e1');
                    doc.fillColor('#0f172a').font(fontBold).fontSize(9);
                    doc.text('ITEM & DESCRIPTION', 60, currentY + 8);
                    doc.text('QTY', 270, currentY + 8);
                    doc.text('RATE', 320, currentY + 8);
                    doc.text('GST %', 380, currentY + 8);
                    doc.text('AMOUNT', 460, currentY + 8, { align: 'right', width: 75 });
                    doc.moveTo(50, currentY + 25).lineTo(545, currentY + 25).lineWidth(0.5).stroke('#cbd5e1');
                    currentY += 25;
                } else if (isClassic) {
                    doc.rect(50, currentY, 495, 25).stroke('#000');
                    doc.fillColor('#000').font(fontBold).fontSize(9);
                    doc.text('ITEM & DESCRIPTION', 60, currentY + 8);
                    doc.text('QTY', 270, currentY + 8);
                    doc.text('RATE', 320, currentY + 8);
                    doc.text('GST %', 380, currentY + 8);
                    doc.text('AMOUNT', 460, currentY + 8, { align: 'right', width: 75 });
                    currentY += 25;
                } else {
                    doc.rect(50, currentY, 495, 25).fill(accentColor);
                    doc.fillColor('white').font(fontBold).fontSize(9);
                    doc.text('ITEM & DESCRIPTION', 60, currentY + 8);
                    doc.text('QTY', 270, currentY + 8);
                    doc.text('RATE', 320, currentY + 8);
                    doc.text('GST %', 380, currentY + 8);
                    doc.text('AMOUNT', 460, currentY + 8, { align: 'right', width: 75 });
                    currentY += 25;
                }
                
                doc.fillColor('black').font(fontRegular).fontSize(9);

                // STANDARD TABLE ROWS
                items.forEach(item => {
                    const itemName = (item.name || 'Item').toString();
                    const itemQty = item.quantity ?? 0;
                    const itemRate = Number(item.rate) || 0;
                    const itemGst = item.gstPercentage ?? 0;
                    const itemAmt = Number(item.amount) || (itemQty * itemRate);
                    const rowHeight = item.description ? 35 : 25;

                    // Pagination check
                    if (currentY > 730) {
                        doc.addPage();
                        currentY = 50;
                        doc.rect(50, currentY, 495, 20).fill(accentColor);
                        doc.fillColor('white').font(fontBold).fontSize(9);
                        doc.text('ITEM & DESCRIPTION (Contd.)', 60, currentY + 5);
                        doc.text('QTY', 270, currentY + 5);
                        doc.text('RATE', 320, currentY + 5);
                        doc.text('GST %', 380, currentY + 5);
                        doc.text('AMOUNT', 460, currentY + 5, { align: 'right', width: 75 });
                        currentY += 20;
                        doc.fillColor('black').font(fontRegular).fontSize(9);
                    }

                    if (isMinimal) {
                        doc.text(itemName.substring(0, 40) + (itemName.length > 40 ? '...' : ''), 60, currentY + 5);
                        if (item.description) {
                            doc.fillColor('#64748b').fontSize(7).text(item.description, 60, currentY + 16, { width: 200 });
                            doc.fillColor('black').fontSize(9);
                        }
                        doc.text(itemQty.toString(), 270, currentY + 5);
                        doc.text(itemRate.toFixed(2), 320, currentY + 5);
                        doc.text(`${itemGst}%`, 380, currentY + 5);
                        doc.text(itemAmt.toFixed(2), 460, currentY + 5, { align: 'right', width: 75 });
                        doc.moveTo(50, currentY + rowHeight).lineTo(545, currentY + rowHeight).lineWidth(0.5).stroke('#eee');
                        currentY += rowHeight;
                    } else if (isClassic) {
                        doc.rect(50, currentY, 495, rowHeight).stroke('#000');
                        doc.text(itemName.substring(0, 40) + (itemName.length > 40 ? '...' : ''), 60, currentY + 5);
                        if (item.description) {
                            doc.fillColor('#64748b').fontSize(7).text(item.description, 60, currentY + 16, { width: 200 });
                            doc.fillColor('black').fontSize(9);
                        }
                        doc.text(itemQty.toString(), 270, currentY + 5);
                        doc.text(itemRate.toFixed(2), 320, currentY + 5);
                        doc.text(`${itemGst}%`, 380, currentY + 5);
                        doc.text(itemAmt.toFixed(2), 460, currentY + 5, { align: 'right', width: 75 });
                        currentY += rowHeight;
                    } else {
                        doc.rect(50, currentY, 495, rowHeight).stroke('#e2e8f0');
                        doc.text(itemName.substring(0, 40) + (itemName.length > 40 ? '...' : ''), 60, currentY + 5);
                        if (item.description) {
                            doc.fillColor('#64748b').fontSize(7).text(item.description, 60, currentY + 16, { width: 200 });
                            doc.fillColor('black').fontSize(9);
                        }
                        doc.text(itemQty.toString(), 270, currentY + 5);
                        doc.text(itemRate.toFixed(2), 320, currentY + 5);
                        doc.text(`${itemGst}%`, 380, currentY + 5);
                        doc.text(itemAmt.toFixed(2), 460, currentY + 5, { align: 'right', width: 75 });
                        currentY += rowHeight;
                    }
                });
            }

            // PAGE BREAK FOR BOTTOM SECTION (Totals & Payment details)
            if (currentY > 600) {
                doc.addPage();
                currentY = 50;
            }

            // GRID BOTTOM LAYOUT
            const startTotalsY = currentY + 15;
            let leftY = startTotalsY;
            let rightY = startTotalsY;

            // LEFT COLUMN: Bank Details & UPI QR Code
            if (invoice.includeBankDetails !== false) {
                if (settings?.bankDetails?.accountNumber) {
                    doc.fillColor('black').font(fontBold).fontSize(10).text('Bank Details', 50, leftY);
                leftY += 15;
                doc.font(fontRegular).fontSize(9).fillColor('#334155');
                if (settings.bankDetails.bankName) {
                    doc.text(`Bank: ${settings.bankDetails.bankName}`, 50, leftY);
                    leftY += 13;
                }
                doc.text(`A/C Name: ${settings.bankDetails.accountName || ''}`, 50, leftY);
                leftY += 13;
                doc.text(`A/C Number: ${settings.bankDetails.accountNumber || ''}`, 50, leftY);
                leftY += 13;
                doc.text(`IFSC: ${settings.bankDetails.ifscCode || ''}`, 50, leftY);
                leftY += 13;
                if (settings.bankDetails.branch) {
                    doc.text(`Branch: ${settings.bankDetails.branch}`, 50, leftY);
                    leftY += 13;
                }
                } else {
                    doc.fillColor('black').font(fontBold).fontSize(10).text('Bank Details', 50, leftY);
                    leftY += 15;
                    doc.font(fontRegular).fontSize(9).fillColor('#64748b').text('No bank details provided.', 50, leftY);
                    leftY += 15;
                }
            }

            // UPI QR CODE (drawn in left column at X=230)
            let qrCodeDrawn = false;
            if (invoice.includeUpiQr !== false) {

            // 1. Render custom uploaded QR image
            if (settings?.upiQrUrl) {
                try {
                    let relativeQrPath = settings.upiQrUrl;
                    if (relativeQrPath.includes('/uploads/')) {
                        relativeQrPath = relativeQrPath.substring(relativeQrPath.indexOf('uploads/'));
                    } else {
                        relativeQrPath = relativeQrPath.replace(/^\/+/, '');
                    }
                    const qrPath = path.join(process.cwd(), relativeQrPath);
                    if (fs.existsSync(qrPath)) {
                        doc.image(qrPath, 230, startTotalsY, { width: 75, height: 75 });
                        doc.fontSize(8).fillColor('#64748b').font(fontRegular).text('Scan to Pay (UPI)', 220, startTotalsY + 80, { width: 95, align: 'center' });
                        qrCodeDrawn = true;
                    }
                } catch (error) {
                    console.error('Failed to draw custom QR code:', error);
                }
            }

            // 2. Generate UPI QR code from upiId or bank details
            if (!qrCodeDrawn) {
                let upiString = '';
                if (settings?.upiId) {
                    upiString = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.companyName || 'Company')}&am=${invoice.grandTotal}&cu=INR`;
                } else if (settings?.bankDetails?.accountNumber) {
                    upiString = `upi://pay?pa=${settings.bankDetails.accountNumber}@upi&pn=${encodeURIComponent(settings.companyName || 'Company')}&am=${invoice.grandTotal}&cu=INR`;
                }

                if (upiString) {
                    try {
                        const qrDataUrl = await QRCode.toDataURL(upiString, { margin: 1 });
                        doc.image(qrDataUrl, 230, startTotalsY, { width: 75, height: 75 });
                        doc.fontSize(8).fillColor('#64748b').font(fontRegular).text('Scan to Pay (UPI)', 220, startTotalsY + 80, { width: 95, align: 'center' });
                        qrCodeDrawn = true;
                    } catch (error) {
                        console.error('QR Generation failed:', error);
                    }
                }
            }

            // UPI ID TEXT (drawn below bank details or QR)
            if (settings?.upiId) {
                const upiTextY = Math.max(leftY, startTotalsY + 95);
                doc.fontSize(9).fillColor('black').font(fontBold).text(`UPI ID: ${settings.upiId}`, 50, upiTextY);
                leftY = upiTextY + 15;
            }
            }

            // RIGHT COLUMN: Totals Summary
            const rightColX = 350;
            const rightColValX = 460;
            const rightColWidth = 85;

            const subTotalVal = Number(invoice.subtotal ?? invoice.subTotal ?? 0);
            const discountVal = Number(invoice.discount ?? 0);
            const grandTotalVal = Number(invoice.grandTotal ?? 0);
            const amountPaidVal = Number(invoice.amountPaid ?? 0);

            doc.fillColor('black').font(fontBold).fontSize(9);
            doc.text('Sub Total:', rightColX, rightY);
            doc.font(fontRegular).text(subTotalVal.toFixed(2), rightColValX, rightY, { align: 'right', width: rightColWidth });
            rightY += 15;

            if (discountVal > 0) {
                doc.font(fontBold).text('Discount:', rightColX, rightY);
                doc.font(fontRegular).text(`- ${discountVal.toFixed(2)}`, rightColValX, rightY, { align: 'right', width: rightColWidth });
                rightY += 15;
            }

            const cgstVal = tax.cgst;
            const sgstVal = tax.sgst;
            const igstVal = tax.igst;
            const totalTaxVal = tax.totalTax || (cgstVal + sgstVal + igstVal);

            if (totalTaxVal > 0) {
                if (cgstVal > 0) {
                    doc.font(fontBold).text('CGST:', rightColX, rightY);
                    doc.font(fontRegular).text(cgstVal.toFixed(2), rightColValX, rightY, { align: 'right', width: rightColWidth });
                    rightY += 15;
                }
                if (sgstVal > 0) {
                    doc.font(fontBold).text('SGST:', rightColX, rightY);
                    doc.font(fontRegular).text(sgstVal.toFixed(2), rightColValX, rightY, { align: 'right', width: rightColWidth });
                    rightY += 15;
                }
                if (igstVal > 0) {
                    doc.font(fontBold).text('IGST:', rightColX, rightY);
                    doc.font(fontRegular).text(igstVal.toFixed(2), rightColValX, rightY, { align: 'right', width: rightColWidth });
                    rightY += 15;
                }
                if (cgstVal === 0 && sgstVal === 0 && igstVal === 0 && totalTaxVal > 0) {
                    doc.font(fontBold).text('Tax:', rightColX, rightY);
                    doc.font(fontRegular).text(totalTaxVal.toFixed(2), rightColValX, rightY, { align: 'right', width: rightColWidth });
                    rightY += 15;
                }
            }

            // GRAND TOTAL highlighted box
            rightY += 5;
            doc.rect(rightColX - 10, rightY - 5, 205, 25).fill(isMinimal ? '#f8fafc' : '#f1f5f9');
            doc.fillColor('#0f172a').font(fontBold).fontSize(11).text('Grand Total:', rightColX, rightY);
            doc.text(`${settings?.currency?.symbol || 'Rs.'} ${grandTotalVal.toFixed(2)}`, rightColValX, rightY, { align: 'right', width: rightColWidth });
            rightY += 25;

            // Amount Paid & Balance Due
            if (amountPaidVal > 0) {
                doc.fillColor('#059669').font(fontBold).fontSize(9).text('Amount Received:', rightColX, rightY);
                doc.font(fontRegular).text(amountPaidVal.toFixed(2), rightColValX, rightY, { align: 'right', width: rightColWidth });
                rightY += 15;
            }

            const balanceDue = invoice.balanceDue ?? (grandTotalVal - amountPaidVal);
            const balanceDueVal = Number(balanceDue ?? 0);
            if (balanceDueVal > 0) {
                doc.fillColor('#dc2626').font(fontBold).fontSize(9).text('Balance Due:', rightColX, rightY);
                doc.font(fontRegular).text(balanceDueVal.toFixed(2), rightColValX, rightY, { align: 'right', width: rightColWidth });
                rightY += 15;
            }

            // Align Y positions
            currentY = Math.max(leftY, rightY, startTotalsY + 110);

            // NOTES & TERMS AND CONDITIONS
            if (invoice.notes) {
                currentY += 15;
                if (currentY > 750) { doc.addPage(); currentY = 50; }
                doc.fillColor('#1e293b').font(fontBold).fontSize(9).text('Notes:', 50, currentY);
                currentY += 13;
                doc.fillColor('#475569').font(fontRegular).fontSize(8).text(invoice.notes, 50, currentY, { width: 495 });
                currentY += Math.ceil(invoice.notes.length / 80) * 10;
            }

            if (invoice.includeTerms !== false && invoice.termsAndConditions) {
                currentY += 15;
                if (currentY > 750) { doc.addPage(); currentY = 50; }
                doc.fillColor('#1e293b').font(fontBold).fontSize(9).text('Terms & Conditions:', 50, currentY);
                currentY += 13;
                doc.fillColor('#475569').font(fontRegular).fontSize(8).text(invoice.termsAndConditions, 50, currentY, { width: 495 });
            }

            // Digital Signature
            if (invoice.includeSignature === true) {
                currentY += 20;
                if (currentY > 730) { doc.addPage(); currentY = 50; }
                const signatureX = 350;
                doc.rect(signatureX, currentY, 195, 75).stroke('#e2e8f0');
                doc.fillColor('#94a3b8').font(fontBold).fontSize(7).text('DIGITALLY SIGNED BY', signatureX + 10, currentY + 10);
                if (settings?.signature) {
                    try {
                        let relativeSigPath = settings.signature;
                        if (relativeSigPath.includes('/uploads/')) {
                            relativeSigPath = relativeSigPath.substring(relativeSigPath.indexOf('uploads/'));
                        } else {
                            relativeSigPath = relativeSigPath.replace(/^\/+/, '');
                        }
                        const sigPath = path.join(process.cwd(), relativeSigPath);
                        if (fs.existsSync(sigPath)) {
                            doc.image(sigPath, signatureX + 10, currentY + 22, { width: 175, height: 35, fit: [175, 35] });
                        }
                    } catch (e) {
                        // Leave blank space
                    }
                }
                doc.fillColor('#64748b').font(fontRegular).fontSize(8).text('Authorized Signature', signatureX + 10, currentY + 60);
                currentY += 85;
            }

            // FOOTER (Always at bottom of last page)
            doc.fillColor('#94a3b8').font(fontRegular).fontSize(8).text(`Thank you for your business. This is a computer-generated ${docTitle.toLowerCase()}.`, 50, doc.page.height - 40, { align: 'center', width: 495 });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
};

export const generateInvoicePDF = async (invoice, customer, items, settings, template = 'modern', color = '#2563eb', customFilePath = null) => {
    const docData = {
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        dueDate: invoice.dueDate,
        placeOfSupply: invoice.placeOfSupply,
        discount: invoice.discount || invoice.invoiceDiscount || 0,
        adjustment: invoice.adjustment || 0,
        subtotal: invoice.subtotal || invoice.subTotal || 0,
        taxAmount: invoice.taxAmount || (invoice.cgst + invoice.sgst + invoice.igst) || 0,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        igst: invoice.igst,
        grandTotal: invoice.grandTotal,
        notes: invoice.notes,
        termsAndConditions: invoice.termsAndConditions,
        includeTerms: invoice.includeTerms,
        includeSignature: invoice.includeSignature,
        includeBankDetails: invoice.includeBankDetails,
        includeUpiQr: invoice.includeUpiQr,
        billingAddress: invoice.billingAddress,
        shippingAddress: invoice.shippingAddress
    };
    return generateStandardPDF('TAX INVOICE', 'invoice', docData, customer, items, settings, template, color, customFilePath);
};

export const generateQuotationPDF = async (quotation, customer, items, settings, template = 'modern', color = '#2563eb', customFilePath = null) => {
    const docData = {
        invoiceNumber: quotation.quoteNumber,
        date: quotation.date || quotation.quoteDate,
        dueDate: quotation.validUntil || quotation.validityDate,
        discount: quotation.discount || 0,
        adjustment: quotation.adjustment || 0,
        subtotal: quotation.subtotal || quotation.subTotal || 0,
        taxAmount: quotation.taxTotal || quotation.taxAmount || 0,
        grandTotal: quotation.grandTotal,
        notes: quotation.notes,
        termsAndConditions: quotation.termsAndConditions,
        includeTerms: quotation.includeTerms,
        includeSignature: quotation.includeSignature,
        includeBankDetails: quotation.includeBankDetails,
        includeUpiQr: quotation.includeUpiQr
    };
    return generateStandardPDF('QUOTATION', 'quotation', docData, customer, items, settings, template, color, customFilePath);
};

export const generateSalesOrderPDF = async (salesOrder, customer, items, settings, template = 'modern', color = '#2563eb', customFilePath = null) => {
    const docData = {
        invoiceNumber: salesOrder.orderNumber,
        date: salesOrder.date || salesOrder.createdAt,
        dueDate: salesOrder.expectedDeliveryDate,
        discount: salesOrder.discount || 0,
        subtotal: salesOrder.subtotal || salesOrder.subTotal || 0,
        taxAmount: salesOrder.taxTotal || salesOrder.taxAmount || 0,
        grandTotal: salesOrder.grandTotal,
        notes: salesOrder.notes,
        termsAndConditions: salesOrder.termsAndConditions,
        includeTerms: salesOrder.includeTerms,
        includeSignature: salesOrder.includeSignature,
        includeBankDetails: salesOrder.includeBankDetails,
        includeUpiQr: salesOrder.includeUpiQr,
        buyersRef: salesOrder.buyersRef,
        modeOfPayment: salesOrder.modeOfPayment
    };
    return generateStandardPDF('SALES ORDER', 'sales-order', docData, customer, items, settings, template, color, customFilePath);
};

export const generateChallanPDF = async (challan, customer, items, settings, template = 'modern', color = '#2563eb', customFilePath = null) => {
    const docData = {
        invoiceNumber: challan.challanNumber,
        date: challan.date,
        discount: challan.discountAmount || 0,
        subtotal: challan.subtotal || 0,
        taxAmount: challan.taxAmount || 0,
        cgst: challan.cgst,
        sgst: challan.sgst,
        igst: challan.igst,
        grandTotal: challan.grandTotal,
        notes: challan.notes,
        termsAndConditions: challan.termsAndConditions,
        includeTerms: challan.includeTerms,
        includeSignature: challan.includeSignature,
        includeBankDetails: challan.includeBankDetails,
        includeUpiQr: challan.includeUpiQr
    };
    return generateStandardPDF('DELIVERY CHALLAN', 'challan', docData, customer, items, settings, template, color, customFilePath);
};

export const generateCreditNotePDF = async (creditNote, customer, items, settings, template = 'modern', color = '#dc2626', customFilePath = null) => {
    const docData = {
        invoiceNumber: creditNote.cnNumber || creditNote.creditNoteNumber || creditNote.reference || creditNote._id.toString(),
        date: creditNote.date || creditNote.createdAt,
        dueDate: creditNote.dueDate,
        discount: creditNote.discount || 0,
        adjustment: creditNote.adjustment || 0,
        subtotal: creditNote.subTotal || creditNote.subtotal || creditNote.amount || 0,
        taxAmount: creditNote.taxTotal || creditNote.taxAmount || 0,
        cgst: creditNote.cgst || 0,
        sgst: creditNote.sgst || 0,
        igst: creditNote.igst || 0,
        grandTotal: creditNote.amount || creditNote.grandTotal || 0,
        notes: creditNote.notes || creditNote.reason,
        termsAndConditions: creditNote.termsAndConditions,
        includeTerms: creditNote.includeTerms,
        includeSignature: creditNote.includeSignature,
        includeBankDetails: creditNote.includeBankDetails,
        includeUpiQr: creditNote.includeUpiQr
    };
    const displayItems = items && items.length > 0 ? items : [{
        name: creditNote.subject || 'Credit Note adjustment',
        description: creditNote.reason,
        quantity: 1,
        rate: creditNote.subTotal || creditNote.amount,
        gstPercent: creditNote.taxTotal ? Math.round((creditNote.taxTotal / (creditNote.subTotal || creditNote.amount)) * 100) : 0,
        amount: creditNote.amount
    }];
    return generateStandardPDF('CREDIT NOTE', 'credit-note', docData, customer, displayItems, settings, template, color, customFilePath);
};

export const generatePurchaseBillPDF = async (purchaseBill, customer, items, settings, template = 'modern', color = '#2563eb', customFilePath = null) => {
    const docData = {
        invoiceNumber: purchaseBill.billNumber || purchaseBill._id.toString(),
        date: purchaseBill.date || purchaseBill.createdAt,
        dueDate: purchaseBill.dueDate,
        discount: purchaseBill.discount || 0,
        subtotal: purchaseBill.subtotal || purchaseBill.subTotal || 0,
        taxAmount: purchaseBill.taxAmount || (purchaseBill.cgst + purchaseBill.sgst + purchaseBill.igst) || 0,
        cgst: purchaseBill.cgst || 0,
        sgst: purchaseBill.sgst || 0,
        igst: purchaseBill.igst || 0,
        grandTotal: purchaseBill.grandTotal,
        notes: purchaseBill.notes,
        termsAndConditions: purchaseBill.termsAndConditions,
        includeTerms: purchaseBill.includeTerms,
        includeSignature: purchaseBill.includeSignature,
        includeBankDetails: purchaseBill.includeBankDetails,
        includeUpiQr: purchaseBill.includeUpiQr
    };
    return generateStandardPDF('PURCHASE BILL', 'purchase-bill', docData, customer, items, settings, template, color, customFilePath);
};
