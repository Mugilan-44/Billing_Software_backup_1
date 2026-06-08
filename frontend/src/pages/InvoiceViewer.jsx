import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { API_URL } from '../utils/api';
import { ArrowLeft, Download, Share2, Edit, Mail, Printer, Trash2, Palette, FileText, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    const cleanUrl = url.replace(/^\/+/, '');
    if (API_URL) {
        return `${API_URL}/${cleanUrl}`;
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return `http://localhost:5050/${cleanUrl}`;
    }
    return `/${cleanUrl}`;
};

export function getViewerTaxBreakdown(invoice) {
    const cgst = invoice.cgst ?? invoice.taxTotal?.cgst ?? 0;
    const sgst = invoice.sgst ?? invoice.taxTotal?.sgst ?? 0;
    const igst = invoice.igst ?? invoice.taxTotal?.igst ?? 0;
    const totalTax = invoice.taxAmount ?? invoice.taxTotal?.totalTax ?? (cgst + sgst + igst);

    if (totalTax <= 0) return [];

    if (invoice.taxType === 'GST') {
        const rows = [];
        if (cgst > 0) rows.push({ label: 'CGST', amount: cgst });
        if (sgst > 0) rows.push({ label: 'SGST', amount: sgst });
        if (igst > 0) rows.push({ label: 'IGST', amount: igst });
        return rows;
    }

    if (invoice.useProductSpecificTax) {
        const items = invoice.lineItems || invoice.items || [];
        const breakdown = {};
        
        const savedSystems = localStorage.getItem('invoice_tax_systems');
        let taxSystems = [
            { name: 'Commission or Brokerage', rate: 2 },
            { name: 'Dividend', rate: 10 },
            { name: 'GST', rate: 18 },
            { name: 'Other Interest than securities', rate: 10 },
            { name: 'Payment of contractors for Others', rate: 2 },
            { name: 'Payment of contractors HUF/Indiv', rate: 1 },
            { name: 'Technical Fees (2%)', rate: 2 }
        ];
        if (savedSystems) {
            try { taxSystems = JSON.parse(savedSystems); } catch (e) {}
        }

        items.forEach(item => {
            const qty = item.quantity || 0;
            const rate = item.rate || 0;
            const discountPercent = item.discountPercent || 0;
            const taxRate = item.gstPercent ?? item.gstPercentage ?? 0;
            if (taxRate <= 0) return;

            const rawAmount = qty * rate;
            const discountAmount = rawAmount * (discountPercent / 100);
            const taxableAmount = rawAmount - discountAmount;
            const taxAmount = taxableAmount * (taxRate / 100);

            const matched = taxSystems.find(ts => ts.rate === taxRate);
            const taxName = matched ? matched.name : (invoice.taxType && invoice.taxType !== 'GST' ? invoice.taxType : 'Tax');
            const label = `${taxName} (${taxRate}%)`;

            breakdown[label] = (breakdown[label] || 0) + taxAmount;
        });

        const rows = Object.entries(breakdown)
            .filter(([_, amt]) => amt > 0)
            .map(([label, amount]) => ({ label, amount }));

        if (rows.length > 0) {
            return rows;
        }
    }

    const label = `${invoice.taxType || 'Tax'} Total`;
    return [{ label, amount: totalTax }];
}


// ── Color Themes ────────────────────────────────────────────────────────────────
export const COLOR_THEMES = [
    { label: 'Ocean Blue',   value: '#2563eb', light: '#eff6ff', border: '#bfdbfe' },
    { label: 'Emerald',      value: '#059669', light: '#ecfdf5', border: '#a7f3d0' },
    { label: 'Purple',       value: '#7c3aed', light: '#f5f3ff', border: '#ddd6fe' },
    { label: 'Amber',        value: '#d97706', light: '#fffbeb', border: '#fde68a' },
    { label: 'Rose',         value: '#e11d48', light: '#fff1f2', border: '#fecdd3' },
    { label: 'Teal',         value: '#0891b2', light: '#ecfeff', border: '#a5f3fc' },
    { label: 'Indigo Premium', value: '#4f46e5', light: '#eef2ff', border: '#c7d2fe' },
    { label: 'Crimson Red',  value: '#dc2626', light: '#fef2f2', border: '#fca5a5' },
    { label: 'Orange Sunset', value: '#ea580c', light: '#fff7ed', border: '#ffedd5' },
    { label: 'Slate Steel',  value: '#475569', light: '#f8fafc', border: '#e2e8f0' },
    { label: 'Charcoal Black', value: '#1e293b', light: '#f1f5f9', border: '#cbd5e1' },
    { label: 'Forest Green', value: '#15803d', light: '#f0fdf4', border: '#bbf7d0' },
    { label: 'Sapphire Blue', value: '#0f52ba', light: '#eaf2ff', border: '#bcd2ee' },
    { label: 'Plum Velvet',  value: '#5c246f', light: '#faf4fc', border: '#ebd5f0' },
    { label: 'Rust Bronze',  value: '#b75c2e', light: '#fdf6f2', border: '#f6dbcd' },
    { label: 'Ruby Rose',    value: '#b81442', light: '#fff0f3', border: '#ffd1dc' },
    { label: 'Obsidian Black', value: '#090d16', light: '#f3f4f6', border: '#d1d5db' },
    { label: 'Olive Sage',   value: '#556b2f', light: '#f4f8f0', border: '#e1ecd6' },
];

export const TEMPLATES = [
    { value: 'modern',       label: 'Modern Professional' },
    { value: 'classic',      label: 'Traditional Clean' },
    { value: 'professional', label: 'Corporate Premium' },
    { value: 'elegant',      label: 'Elegant Formal' },
    { value: 'minimal',      label: 'Clean Minimal' },
    { value: 'bold',         label: 'Bold Impact' },
    { value: 'gst',          label: 'GST Compliant' },
    { value: 'vibrant',      label: 'Vibrant Color' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────────
export const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const resolveItemName = (item) => item.name || item.itemId?.name || 'Item';
export const resolveAmount = (item) => item.amount ?? ((item.quantity || 0) * (item.rate || 0));

export const formatCustomerAddress = (addr, flatFallback) => {
    if (!addr) return flatFallback || '';
    if (typeof addr === 'string') return addr;
    const hasValues = Object.values(addr).some(val => val !== undefined && val !== null && String(val).trim() !== '');
    if (!hasValues) return flatFallback || '';
    const streetParts = [addr.street1, addr.street2, addr.street].filter(Boolean).map(s => String(s).trim()).join(', ');
    return [
        streetParts,
        addr.city,
        addr.state,
        addr.zipCode || addr.pincode || addr.zip
    ].filter(v => v && String(v).trim() !== '').join(', ');
};

// ── GST Summary Calculator ────────────────────────────────────────────────────────
export function calcTaxBreakdown(invoice) {
    const cgst = invoice.cgst ?? invoice.taxTotal?.cgst ?? 0;
    const sgst = invoice.sgst ?? invoice.taxTotal?.sgst ?? 0;
    const igst = invoice.igst ?? invoice.taxTotal?.igst ?? 0;
    const totalTax = invoice.taxAmount ?? invoice.taxTotal?.totalTax ?? (cgst + sgst + igst);
    return { cgst, sgst, igst, totalTax };
}

// ── Reusable Invoice Footer & Signature Block ─────────────────────────────────────
export const InvoiceFooterBlock = ({ invoice, settings, color }) => {
    return (
        <div className="mt-8 pt-6 border-t border-slate-200 space-y-6">
            {(invoice.notes || (invoice.includeTerms !== false && invoice.termsAndConditions)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    {invoice.notes && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
                        </div>
                    )}
                    {(invoice.includeTerms !== false && invoice.termsAndConditions) && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Terms & Conditions</p>
                            <p className="text-sm text-slate-500 whitespace-pre-wrap">{invoice.termsAndConditions}</p>
                        </div>
                    )}
                </div>
            )}
            
            {invoice.includeSignature && (
                <div className="flex justify-end pt-4">
                    <div className="text-right max-w-[220px] flex flex-col items-center">
                        {settings?.signature ? (
                            <>
                                <img src={getImageUrl(settings.signature)} alt="Signature" className="h-12 object-contain mx-auto mb-1" />
                                <div className="border-t border-slate-300 w-36 my-1.5"></div>
                                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider text-center">Authorized Signature</p>
                            </>
                        ) : (
                            <>
                                <div className="h-12 w-full"></div>
                                <div className="border-t border-slate-300 w-36 my-1.5"></div>
                                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider text-center">Authorized Signature</p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: Modern Professional
// ──────────────────────────────────────────────────────────────────────────────────
export const TemplateModern = ({ invoice, customer, settings, color, printRef }) => {
    const tax = calcTaxBreakdown(invoice);
    const items = invoice.items || invoice.lineItems || [];
    return (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 font-sans" ref={printRef}>
            <div className="flex justify-between items-start pb-8 mb-8" style={{ borderBottom: `3px solid ${color}` }}>
                <div>
                    {settings?.logoUrl
                        ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-16 object-contain mb-3" />
                        : <h1 className="text-2xl font-black mb-2" style={{ color }}>{settings?.companyName || 'Company'}</h1>
                    }
                    {settings?.logoUrl && <h2 className="text-lg font-bold text-slate-800 mb-1">{settings?.companyName}</h2>}
                    <p className="text-slate-500 text-sm">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', ')}</p>
                    {settings?.gstNumber && <p className="text-slate-500 text-sm">GSTIN: <span className="font-semibold text-slate-700">{settings.gstNumber}</span></p>}
                    {settings?.phone && <p className="text-slate-500 text-sm">Ph: {settings.phone}</p>}
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-black uppercase tracking-tight mb-4" style={{ color }}>Invoice</h2>
                    <p className="text-slate-500 text-sm mb-1">Invoice No: <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
                    <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(invoice.date).toLocaleDateString('en-IN')}</span></p>
                    {invoice.dueDate && <p className="text-slate-500 text-sm">Due: <span className="font-medium text-red-500">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span></p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-10">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color }}>Billed To</p>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName || customer?.displayName}</h3>
                    {invoice.billingAddress ? (
                        <p className="text-slate-500 text-sm whitespace-pre-wrap">{invoice.billingAddress}</p>
                    ) : formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                        <p className="text-slate-500 text-sm">{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                    )}
                    {(customer?.gstNumber || customer?.gstin) && <p className="text-slate-500 text-sm mt-1">GSTIN: <span className="font-medium text-slate-700">{customer.gstNumber || customer.gstin}</span></p>}
                </div>
            </div>

            <table className="w-full mb-10 text-left border-collapse">
                <thead>
                    <tr style={{ borderBottom: `2px solid ${color}` }} className="text-sm">
                        <th className="py-3 font-bold text-slate-800">Item & Description</th>
                        <th className="py-3 font-bold text-center text-slate-800">Qty</th>
                        <th className="py-3 font-bold text-right text-slate-800">Rate</th>
                        <th className="py-3 font-bold text-center text-slate-800">GST%</th>
                        <th className="py-3 font-bold text-right text-slate-800">Amount</th>
                    </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="py-3 text-slate-800">
                                <div className="font-medium">{resolveItemName(item)}</div>
                                {item.description && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                            </td>
                            <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                            <td className="py-3 text-right text-slate-600">₹{fmt(item.rate)}</td>
                            <td className="py-3 text-center text-slate-600">{item.gstPercentage ?? item.gstPercent ?? 0}%</td>
                            <td className="py-3 text-right font-semibold text-slate-900">₹{fmt(resolveAmount(item))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="grid grid-cols-2 gap-12">
                <div>
                    {settings?.bankDetails?.accountNumber && (
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color }}>Bank Details</p>
                            <div className="text-sm text-slate-700 space-y-0.5 p-4 rounded-lg border" style={{ borderColor: color + '40', backgroundColor: color + '08' }}>
                                <p><strong>Bank:</strong> {settings.bankDetails.bankName}</p>
                                <p><strong>A/C Name:</strong> {settings.bankDetails.accountName}</p>
                                <p><strong>A/C No:</strong> {settings.bankDetails.accountNumber}</p>
                                <p><strong>IFSC:</strong> {settings.bankDetails.ifscCode}</p>
                            </div>
                        </div>
                    )}
                    {(settings?.upiId || settings?.upiQrUrl) && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color }}>UPI Payment</p>
                            <div className="text-sm text-slate-700 p-4 rounded-lg border" style={{ borderColor: color + '40', backgroundColor: color + '08' }}>
                                {settings.upiId && <p className="font-semibold mb-2">{settings.upiId}</p>}
                                {settings.upiQrUrl && <img src={getImageUrl(settings.upiQrUrl)} alt="UPI QR" className="w-24 h-24 object-contain" />}
                            </div>
                        </div>
                    )}
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600"><span>Sub Total</span><span className="font-medium text-slate-900">₹{fmt(invoice.subTotal)}</span></div>
                    {getViewerTaxBreakdown(invoice).map((row, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                            <span>{row.label}</span>
                            <span className="font-medium">₹{fmt(row.amount)}</span>
                        </div>
                    ))}
                    {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                        <div className="flex justify-between text-red-600">
                            <span>Discount</span>
                            <span className="font-medium">-₹{fmt(invoice.discount || invoice.discountAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-3 mt-3" style={{ color }}>
                        <span>Grand Total</span><span>₹{fmt(invoice.grandTotal)}</span>
                    </div>
                    {invoice.amountPaid > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium"><span>Amount Received</span><span>₹{fmt(invoice.amountPaid)}</span></div>
                    )}
                    {(invoice.balanceDue > 0 || (invoice.grandTotal - (invoice.amountPaid || 0)) > 0) && (
                        <div className="flex justify-between text-red-600 font-bold border-t border-slate-100 pt-2">
                            <span>Balance Due</span>
                            <span>₹{fmt(invoice.balanceDue ?? (invoice.grandTotal - (invoice.amountPaid || 0)))}</span>
                        </div>
                    )}
                </div>
            </div>
            <InvoiceFooterBlock invoice={invoice} settings={settings} color={color} />
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: Classic (Traditional)
// ──────────────────────────────────────────────────────────────────────────────────
export const TemplateClassic = ({ invoice, customer, settings, color, printRef }) => {
    const tax = calcTaxBreakdown(invoice);
    const items = invoice.items || invoice.lineItems || [];
    return (
        <div className="bg-white p-10 border-2 border-slate-800 font-serif" ref={printRef}>
            <div className="text-center border-b-2 border-slate-800 pb-6 mb-8">
                {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-14 object-contain mx-auto mb-3" /> : null}
                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wider">{settings?.companyName || 'Company'}</h1>
                <p className="text-slate-600 text-sm mt-1">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', ')}</p>
                {settings?.gstNumber && <p className="text-slate-600 text-sm">GSTIN: {settings.gstNumber}</p>}
            </div>
            <div className="flex justify-between items-start mb-10">
                <div className="w-1/2">
                    <h3 className="text-base font-bold border-b border-slate-400 pb-1 mb-2">Bill To:</h3>
                    <p className="font-bold text-slate-800">{customer?.companyName || customer?.displayName}</p>
                    {invoice.billingAddress ? (
                        <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{invoice.billingAddress}</p>
                    ) : formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                        <p className="text-slate-600 text-sm mt-1">{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                    )}
                    {(customer?.gstNumber || customer?.gstin) && <p className="text-slate-600 text-sm">GSTIN: {customer.gstNumber || customer.gstin}</p>}
                </div>
                <div className="w-1/3 border border-slate-400 p-4 bg-slate-50">
                    <h2 className="text-xl font-bold text-center uppercase mb-3">TAX INVOICE</h2>
                    <div className="flex justify-between text-sm mb-1"><span className="font-bold">No:</span><span>{invoice.invoiceNumber}</span></div>
                    <div className="flex justify-between text-sm mb-1"><span className="font-bold">Date:</span><span>{new Date(invoice.date).toLocaleDateString('en-IN')}</span></div>
                    {invoice.dueDate && <div className="flex justify-between text-sm"><span className="font-bold">Due:</span><span>{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span></div>}
                </div>
            </div>
            <table className="w-full mb-10 border border-slate-400 text-sm">
                <thead className="bg-slate-200 border-b border-slate-400">
                    <tr>
                        <th className="py-2 px-3 border-r border-slate-400 text-left">Description</th>
                        <th className="py-2 px-3 border-r border-slate-400 text-center">Qty</th>
                        <th className="py-2 px-3 border-r border-slate-400 text-right">Rate</th>
                        <th className="py-2 px-3 border-r border-slate-400 text-center">GST</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                            <td className="py-2 px-3 border-r border-slate-200">
                                <div className="font-semibold text-slate-800">{resolveItemName(item)}</div>
                                {item.description && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 border-r border-slate-200 text-right">₹{fmt(item.rate)}</td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center">{item.gstPercentage ?? item.gstPercent ?? 0}%</td>
                            <td className="py-2 px-3 text-right font-semibold">₹{fmt(resolveAmount(item))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-end mb-8">
                <div className="w-1/2 border border-slate-400">
                    <div className="flex justify-between p-2 border-b border-slate-300 text-sm"><span>Sub Total:</span><span>₹{fmt(invoice.subTotal)}</span></div>
                    {getViewerTaxBreakdown(invoice).map((row, idx) => (
                        <div key={idx} className="flex justify-between p-2 border-b border-slate-200 text-sm">
                            <span>{row.label}:</span>
                            <span>₹{fmt(row.amount)}</span>
                        </div>
                    ))}
                    {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                        <div className="flex justify-between p-2 border-b border-slate-200 text-sm text-red-600"><span>Discount:</span><span>-₹{fmt(invoice.discount || invoice.discountAmount)}</span></div>
                    )}
                    <div className="flex justify-between p-3 bg-slate-200 font-bold text-base"><span>Total:</span><span>₹{fmt(invoice.grandTotal)}</span></div>
                    {invoice.amountPaid > 0 && <div className="flex justify-between p-2 text-sm text-green-700"><span>Received:</span><span>₹{fmt(invoice.amountPaid)}</span></div>}
                    {(invoice.balanceDue > 0 || invoice.grandTotal - (invoice.amountPaid||0) > 0) && (
                        <div className="flex justify-between p-2 border-t border-slate-300 font-bold text-red-700"><span>Balance Due:</span><span>₹{fmt(invoice.balanceDue ?? invoice.grandTotal - (invoice.amountPaid||0))}</span></div>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 border-t border-slate-300 pt-6 mb-4">
                <div>
                    {settings?.bankDetails?.accountNumber && (
                        <div>
                            <p className="text-xs font-bold uppercase mb-2">Bank Details</p>
                            <div className="text-sm text-slate-700 space-y-0.5">
                                <p><strong>Bank:</strong> {settings.bankDetails.bankName}</p>
                                <p><strong>A/C Name:</strong> {settings.bankDetails.accountName}</p>
                                <p><strong>A/C No:</strong> {settings.bankDetails.accountNumber}</p>
                                <p><strong>IFSC:</strong> {settings.bankDetails.ifscCode}</p>
                            </div>
                        </div>
                    )}
                </div>
                <div>
                    {(settings?.upiId || settings?.upiQrUrl) && (
                        <div className="flex items-start gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase mb-1">UPI Payment</p>
                                {settings.upiId && <p className="text-sm font-mono">{settings.upiId}</p>}
                            </div>
                            {settings.upiQrUrl && <img src={getImageUrl(settings.upiQrUrl)} alt="QR" className="w-20 h-20 object-contain border border-slate-300 p-1" />}
                        </div>
                    )}
                </div>
            </div>
            <InvoiceFooterBlock invoice={invoice} settings={settings} color={color} />
            <div className="text-center text-slate-500 text-sm border-t border-slate-300 pt-4 mt-6">Thank you for your business!</div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: Corporate Premium
// ──────────────────────────────────────────────────────────────────────────────────
export const TemplateProfessional = ({ invoice, customer, settings, color, printRef }) => {
    const tax = calcTaxBreakdown(invoice);
    const items = invoice.items || invoice.lineItems || [];
    return (
        <div className="bg-white shadow-2xl rounded-b-xl relative overflow-hidden font-sans" style={{ borderTop: `8px solid ${color}` }} ref={printRef}>
            <div className="p-12">
                <div className="flex justify-between items-start mb-12">
                    <div>
                        {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-20 object-contain mb-4" /> : <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color }}>{settings?.companyName}</h1>}
                        {settings?.logoUrl && <h2 className="text-xl font-bold text-slate-800 mb-2">{settings?.companyName}</h2>}
                        <div className="text-slate-500 text-sm space-y-0.5">
                            <p>{settings?.address?.street}</p>
                            <p>{settings?.address?.city}, {settings?.address?.state}</p>
                            {settings?.gstNumber && <p className="font-semibold text-slate-800 pt-1">GSTIN: {settings.gstNumber}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-5xl font-black text-slate-100 uppercase tracking-tighter mb-4">Invoice</h2>
                        <p className="font-bold text-slate-900">#{invoice.invoiceNumber}</p>
                        <p className="text-slate-500 text-sm">Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
                        <p className="text-slate-500 text-sm font-semibold pt-2">Total Amount</p>
                        <p className="text-3xl font-black" style={{ color }}>₹{fmt(invoice.grandTotal)}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-16 mb-12">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-3 pb-2 border-b" style={{ color, borderColor: color + '40' }}>Client Details</h4>
                        <p className="text-xl font-bold text-slate-900 mb-1">{customer?.companyName || customer?.displayName}</p>
                        <div className="text-slate-500 text-sm space-y-0.5">
                            {invoice.billingAddress ? (
                                <p className="whitespace-pre-wrap">{invoice.billingAddress}</p>
                            ) : formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                                <p>{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                            )}
                            {(customer?.gstNumber || customer?.gstin) && <p className="pt-1 font-medium text-slate-800">GST: {customer.gstNumber || customer.gstin}</p>}
                        </div>
                    </div>
                </div>
                <table className="w-full mb-12">
                    <thead>
                        <tr className="text-white text-xs font-black uppercase tracking-widest" style={{ backgroundColor: color }}>
                            <th className="px-4 py-3 text-left rounded-l-lg">Description</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-right">Rate</th>
                            <th className="px-4 py-3 text-center">GST%</th>
                            <th className="px-4 py-3 text-right rounded-r-lg">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-4 py-5 text-slate-900">
                                    <div className="font-bold">{resolveItemName(item)}</div>
                                    {item.description && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                                </td>
                                <td className="px-4 py-5 text-center text-slate-600">{item.quantity}</td>
                                <td className="px-4 py-5 text-right text-slate-600">₹{fmt(item.rate)}</td>
                                <td className="px-4 py-5 text-center text-slate-600">{item.gstPercentage ?? item.gstPercent ?? 0}%</td>
                                <td className="px-4 py-5 text-right font-bold text-slate-900">₹{fmt(resolveAmount(item))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between items-end">
                    <div className="w-1/2 space-y-4">
                        {settings?.bankDetails?.accountNumber && (
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Bank Details</h4>
                                <div className="space-y-1 text-xs">
                                    <p className="flex justify-between"><span className="text-slate-500">Bank</span><span className="font-bold">{settings.bankDetails.bankName}</span></p>
                                    <p className="flex justify-between"><span className="text-slate-500">Account</span><span className="font-bold">{settings.bankDetails.accountNumber}</span></p>
                                    <p className="flex justify-between"><span className="text-slate-500">IFSC</span><span className="font-bold" style={{ color }}>{settings.bankDetails.ifscCode}</span></p>
                                </div>
                            </div>
                        )}
                        {(settings?.upiId || settings?.upiQrUrl) && (
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {settings.upiQrUrl && <img src={getImageUrl(settings.upiQrUrl)} alt="UPI QR" className="w-20 h-20 object-contain" />}
                                {settings.upiId && <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pay via UPI</p><p className="font-bold text-slate-900">{settings.upiId}</p></div>}
                            </div>
                        )}
                    </div>
                    <div className="w-1/3 space-y-3">
                        <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span className="font-bold text-slate-900">₹{fmt(invoice.subTotal)}</span></div>
                        {getViewerTaxBreakdown(invoice).map((row, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-slate-500">
                                <span>{row.label}</span>
                                <span className="font-bold">₹{fmt(row.amount)}</span>
                            </div>
                        ))}
                        {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                            <div className="flex justify-between text-sm text-red-600"><span>Discount</span><span className="font-bold">-₹{fmt(invoice.discount || invoice.discountAmount)}</span></div>
                        )}
                        <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Due</span>
                            <span className="text-3xl font-black text-slate-900">₹{fmt(invoice.grandTotal - (invoice.amountPaid || 0))}</span>
                        </div>
                        {invoice.amountPaid > 0 && <div className="flex justify-between text-sm text-emerald-600 font-bold"><span>Received</span><span>₹{fmt(invoice.amountPaid)}</span></div>}
                    </div>
                </div>
                <InvoiceFooterBlock invoice={invoice} settings={settings} color={color} />
                <div className="mt-12 text-center text-slate-300 text-xs font-medium uppercase tracking-[0.3em]">Issued by {settings?.companyName} • Generated via Prolync</div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4: Elegant Formal
// ──────────────────────────────────────────────────────────────────────────────────
export const TemplateElegant = ({ invoice, customer, settings, color, printRef }) => {
    const tax = calcTaxBreakdown(invoice);
    const items = invoice.items || invoice.lineItems || [];
    return (
        <div className="bg-white p-12 font-sans" style={{ border: `1px solid ${color}40` }} ref={printRef}>
            <div className="flex justify-between items-center mb-10 pb-8" style={{ borderBottom: `1px solid ${color}30` }}>
                <div>
                    {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-14 object-contain mb-2" /> : null}
                    <h1 className="text-xl font-bold text-slate-900">{settings?.companyName}</h1>
                    <p className="text-slate-500 text-xs mt-1">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(' • ')}</p>
                    {settings?.gstNumber && <p className="text-slate-500 text-xs">GSTIN: {settings.gstNumber}</p>}
                </div>
                <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.3em] font-bold mb-2" style={{ color }}>Tax Invoice</p>
                    <p className="text-3xl font-black text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="text-slate-400 text-sm mt-1">{new Date(invoice.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>
            <div className="flex justify-between mb-10">
                <div>
                    <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color }}>Bill To</p>
                    <p className="text-lg font-bold text-slate-900">{customer?.companyName || customer?.displayName}</p>
                    {invoice.billingAddress ? (
                        <p className="text-slate-500 text-sm mt-1 whitespace-pre-wrap">{invoice.billingAddress}</p>
                    ) : formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                        <p className="text-slate-500 text-sm mt-1">{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                    )}
                    {(customer?.gstNumber || customer?.gstin) && <p className="text-slate-500 text-sm">GSTIN: {customer.gstNumber || customer.gstin}</p>}
                </div>
                {invoice.dueDate && (
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color }}>Due Date</p>
                        <p className="text-lg font-bold text-slate-900">{new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                )}
            </div>
            <table className="w-full mb-10 text-sm">
                <thead>
                    <tr className="text-xs uppercase tracking-widest" style={{ borderBottom: `2px solid ${color}`, color }}>
                        <th className="py-3 text-left font-bold">Item</th>
                        <th className="py-3 text-center font-bold">Qty</th>
                        <th className="py-3 text-right font-bold">Rate</th>
                        <th className="py-3 text-center font-bold">GST</th>
                        <th className="py-3 text-right font-bold">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="py-4 text-slate-800">
                                <div className="font-medium">{resolveItemName(item)}</div>
                                {item.description && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                            </td>
                            <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                            <td className="py-4 text-right text-slate-600">₹{fmt(item.rate)}</td>
                            <td className="py-4 text-center text-slate-600">{item.gstPercentage ?? item.gstPercent ?? 0}%</td>
                            <td className="py-4 text-right font-semibold text-slate-900">₹{fmt(resolveAmount(item))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-end">
                <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>₹{fmt(invoice.subTotal)}</span></div>
                    {getViewerTaxBreakdown(invoice).map((row, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-slate-500">
                            <span>{row.label}</span>
                            <span>₹{fmt(row.amount)}</span>
                        </div>
                    ))}
                    {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                        <div className="flex justify-between text-sm text-red-500"><span>Discount</span><span>-₹{fmt(invoice.discount || invoice.discountAmount)}</span></div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-3 mt-1" style={{ borderTop: `2px solid ${color}`, color }}>
                        <span>Grand Total</span><span>₹{fmt(invoice.grandTotal)}</span>
                    </div>
                    {invoice.amountPaid > 0 && <div className="flex justify-between text-sm text-emerald-600 font-semibold"><span>Received</span><span>₹{fmt(invoice.amountPaid)}</span></div>}
                    {(invoice.balanceDue > 0 || invoice.grandTotal - (invoice.amountPaid||0) > 0) && (
                        <div className="flex justify-between text-sm font-bold text-red-500"><span>Balance Due</span><span>₹{fmt(invoice.balanceDue ?? invoice.grandTotal - (invoice.amountPaid||0))}</span></div>
                    )}
                </div>
            </div>
            {(settings?.upiId || settings?.bankDetails?.accountNumber) && (
                <div className="mt-8 pt-6 flex gap-8" style={{ borderTop: `1px solid ${color}30` }}>
                    {settings?.bankDetails?.accountNumber && (
                        <div><p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color }}>Bank</p>
                            <p className="text-sm text-slate-700">{settings.bankDetails.bankName}</p>
                            <p className="text-sm text-slate-700">A/C: {settings.bankDetails.accountNumber}</p>
                            <p className="text-sm text-slate-700">IFSC: {settings.bankDetails.ifscCode}</p>
                        </div>
                    )}
                    {settings?.upiId && <div><p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color }}>UPI</p>
                        <p className="text-sm font-mono text-slate-800">{settings.upiId}</p>
                        {settings.upiQrUrl && <img src={getImageUrl(settings.upiQrUrl)} alt="QR" className="w-20 h-20 mt-2 object-contain border" />}
                    </div>}
                </div>
            )}
            <InvoiceFooterBlock invoice={invoice} settings={settings} color={color} />
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5: Clean Minimal
// ──────────────────────────────────────────────────────────────────────────────────
export const TemplateMinimal = ({ invoice, customer, settings, color, printRef }) => {
    const tax = calcTaxBreakdown(invoice);
    const items = invoice.items || invoice.lineItems || [];
    return (
        <div className="bg-white p-12 font-sans" ref={printRef}>
            <div className="flex justify-between items-start mb-16">
                <div>
                    {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-12 object-contain mb-3" /> : <span className="text-2xl font-black text-slate-900">{settings?.companyName}</span>}
                </div>
                <div className="text-right">
                    <p className="text-slate-400 text-sm">Invoice</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{invoice.invoiceNumber}</p>
                    <p className="text-slate-400 text-sm mt-2">{new Date(invoice.date).toLocaleDateString('en-IN')}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">From</p>
                    <p className="font-semibold text-slate-900">{settings?.companyName}</p>
                    <p className="text-slate-500 text-sm">{[settings?.address?.street, settings?.address?.city].filter(Boolean).join(', ')}</p>
                    {settings?.gstNumber && <p className="text-slate-500 text-sm">GSTIN: {settings.gstNumber}</p>}
                </div>
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">To</p>
                    <p className="font-semibold text-slate-900">{customer?.companyName || customer?.displayName}</p>
                    {invoice.billingAddress ? (
                        <p className="text-slate-500 text-sm whitespace-pre-wrap">{invoice.billingAddress}</p>
                    ) : formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                        <p className="text-slate-500 text-sm">{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                    )}
                    {(customer?.gstNumber || customer?.gstin) && <p className="text-slate-500 text-sm">GSTIN: {customer.gstNumber || customer.gstin}</p>}
                </div>
            </div>
            <div className="border-t border-b border-slate-100 py-4 mb-8">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                        <div>
                            <p className="font-medium text-slate-900">{resolveItemName(item)}</p>
                            {item.description && <p className="text-xs text-slate-400 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</p>}
                            <p className="text-sm text-slate-400">{item.quantity} × ₹{fmt(item.rate)}</p>
                        </div>
                        <p className="font-semibold text-slate-900">₹{fmt(resolveAmount(item))}</p>
                    </div>
                ))}
            </div>
            <div className="flex justify-end mb-8">
                <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{fmt(invoice.subTotal)}</span></div>
                    {getViewerTaxBreakdown(invoice).map((row, idx) => (
                        <div key={idx} className="flex justify-between text-slate-500">
                            <span>{row.label}</span>
                            <span>₹{fmt(row.amount)}</span>
                        </div>
                    ))}
                    {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                        <div className="flex justify-between text-slate-500"><span>Discount</span><span>-₹{fmt(invoice.discount || invoice.discountAmount)}</span></div>
                    )}
                    <div className="flex justify-between font-black text-lg border-t border-slate-200 pt-3 text-slate-900"><span>Total</span><span style={{ color }}>₹{fmt(invoice.grandTotal)}</span></div>
                    {invoice.amountPaid > 0 && <div className="flex justify-between text-emerald-600 font-semibold"><span>Paid</span><span>₹{fmt(invoice.amountPaid)}</span></div>}
                </div>
            </div>
            {(settings?.upiId || settings?.bankDetails?.accountNumber || settings?.upiQrUrl) && (
                <div className="pt-6 border-t border-slate-100 flex justify-between items-start text-sm">
                    <div className="space-y-4">
                        {settings?.bankDetails?.accountNumber && (
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Bank Details</p>
                                <p className="text-slate-700">{settings.bankDetails.bankName} • {settings.bankDetails.accountName} • A/C: {settings.bankDetails.accountNumber} • IFSC: {settings.bankDetails.ifscCode}</p>
                            </div>
                        )}
                        {settings?.upiId && (
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">UPI ID</p>
                                <p className="font-mono text-slate-800">{settings.upiId}</p>
                            </div>
                        )}
                    </div>
                    {settings?.upiQrUrl && (
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">UPI QR</p>
                            <img src={getImageUrl(settings.upiQrUrl)} alt="UPI QR" className="w-16 h-16 object-contain border p-1" />
                        </div>
                    )}
                </div>
            )}
            <InvoiceFooterBlock invoice={invoice} settings={settings} color={color} />
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// TEMPLATE 6: Bold Impact
// ──────────────────────────────────────────────────────────────────────────────────
export const TemplateBold = ({ invoice, customer, settings, color, printRef }) => {
    const tax = calcTaxBreakdown(invoice);
    const items = invoice.items || invoice.lineItems || [];
    return (
        <div className="bg-white font-sans overflow-hidden" ref={printRef}>
            <div className="p-10 text-white" style={{ backgroundColor: color }}>
                <div className="flex justify-between items-start">
                    <div>
                        {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-14 object-contain mb-3 brightness-0 invert" /> : <h1 className="text-2xl font-black mb-1">{settings?.companyName}</h1>}
                        <p className="text-white/70 text-sm">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', ')}</p>
                        {settings?.gstNumber && <p className="text-white/70 text-sm">GSTIN: {settings.gstNumber}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-white/60 text-sm uppercase tracking-widest">Invoice</p>
                        <p className="text-4xl font-black mt-1">{invoice.invoiceNumber}</p>
                        <p className="text-white/70 text-sm mt-2">{new Date(invoice.date).toLocaleDateString('en-IN')}</p>
                        <p className="text-2xl font-black mt-3">₹{fmt(invoice.grandTotal)}</p>
                    </div>
                </div>
            </div>
            <div className="p-10">
                <div className="mb-8 p-5 rounded-2xl bg-slate-50">
                    <p className="text-xs font-black uppercase tracking-widest mb-2 text-slate-400">Billed To</p>
                    <p className="text-xl font-black text-slate-900">{customer?.companyName || customer?.displayName}</p>
                    {invoice.billingAddress ? (
                        <p className="text-slate-500 text-sm whitespace-pre-wrap">{invoice.billingAddress}</p>
                    ) : formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                        <p className="text-slate-500 text-sm">{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                    )}
                    {(customer?.gstNumber || customer?.gstin) && <p className="text-slate-500 text-sm">GSTIN: {customer.gstNumber || customer.gstin}</p>}
                </div>
                <table className="w-full mb-8 text-sm">
                    <thead>
                        <tr className="text-xs uppercase tracking-widest text-slate-400 border-b-2 border-slate-200">
                            <th className="py-3 text-left font-black">Item</th>
                            <th className="py-3 text-center font-black">Qty</th>
                            <th className="py-3 text-right font-black">Rate</th>
                            <th className="py-3 text-center font-black">GST</th>
                            <th className="py-3 text-right font-black">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="py-4 text-slate-900">
                                    <div className="font-bold">{resolveItemName(item)}</div>
                                    {item.description && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                                </td>
                                <td className="py-4 text-center">{item.quantity}</td>
                                <td className="py-4 text-right">₹{fmt(item.rate)}</td>
                                <td className="py-4 text-center">{item.gstPercentage ?? item.gstPercent ?? 0}%</td>
                                <td className="py-4 text-right font-bold text-slate-900">₹{fmt(resolveAmount(item))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between items-end">
                    <div className="flex gap-6">
                        {settings?.bankDetails?.accountNumber && (
                            <div className="bg-slate-50 rounded-xl p-4 text-sm">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Bank Details</p>
                                <p>{settings.bankDetails.bankName}</p>
                                <p>A/C: {settings.bankDetails.accountNumber}</p>
                                <p>IFSC: {settings.bankDetails.ifscCode}</p>
                            </div>
                        )}
                        {(settings?.upiId || settings?.upiQrUrl) && (
                            <div className="bg-slate-50 rounded-xl p-4 text-sm flex items-center gap-3">
                                {settings.upiQrUrl && <img src={getImageUrl(settings.upiQrUrl)} alt="UPI QR" className="w-16 h-16 object-contain" />}
                                {settings.upiId && <div><p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">UPI</p><p className="font-mono font-bold">{settings.upiId}</p></div>}
                            </div>
                        )}
                    </div>
                    <div className="text-right space-y-1 text-sm min-w-56">
                        <div className="flex justify-between gap-8 text-slate-500"><span>Subtotal</span><span>₹{fmt(invoice.subTotal)}</span></div>
                        {getViewerTaxBreakdown(invoice).map((row, idx) => (
                            <div key={idx} className="flex justify-between gap-8 text-slate-500">
                                <span>{row.label}</span>
                                <span>₹{fmt(row.amount)}</span>
                            </div>
                        ))}
                        {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                            <div className="flex justify-between gap-8 text-red-600"><span>Discount</span><span>-₹{fmt(invoice.discount || invoice.discountAmount)}</span></div>
                        )}
                        <div className="flex justify-between gap-8 text-xl font-black pt-2 mt-1 border-t-2 border-slate-200" style={{ color }}>
                            <span>Total</span><span>₹{fmt(invoice.grandTotal)}</span>
                        </div>
                        {invoice.amountPaid > 0 && <div className="flex justify-between gap-8 text-emerald-600 font-bold"><span>Paid</span><span>₹{fmt(invoice.amountPaid)}</span></div>}
                    </div>
                </div>
                <InvoiceFooterBlock invoice={invoice} settings={settings} color={color} />
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// TEMPLATE 7: GST Compliant (detailed tax columns)
// ──────────────────────────────────────────────────────────────────────────────────
export const TemplateGST = ({ invoice, customer, settings, color, printRef }) => {
    const tax = calcTaxBreakdown(invoice);
    const items = invoice.items || invoice.lineItems || [];
    const taxType = invoice.taxType || 'GST';
    const isIGST = taxType !== 'GST' || (tax.igst > 0 && tax.cgst === 0);
    return (
        <div className="bg-white font-sans text-xs" ref={printRef}>
            <div className="p-6" style={{ borderBottom: `3px solid ${color}` }}>
                <div className="flex justify-between items-start">
                    <div>
                        {settings?.logoUrl && <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-12 object-contain mb-2" />}
                        <h1 className="text-base font-black text-slate-900">{settings?.companyName}</h1>
                        <p className="text-slate-500">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', ')}</p>
                        <p className="text-slate-500">GSTIN: <span className="font-bold text-slate-800">{settings?.gstNumber || 'N/A'}</span></p>
                        {settings?.phone && <p className="text-slate-500">Ph: {settings.phone}</p>}
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-black uppercase border-2 px-4 py-2" style={{ color, borderColor: color }}>TAX INVOICE</h2>
                    </div>
                    <div className="text-right">
                        <table className="text-right border border-slate-300 text-xs">
                            <tbody>
                                <tr className="border-b border-slate-200"><td className="px-3 py-1 text-slate-500 border-r">Invoice No.</td><td className="px-3 py-1 font-bold">{invoice.invoiceNumber}</td></tr>
                                <tr className="border-b border-slate-200"><td className="px-3 py-1 text-slate-500 border-r">Date</td><td className="px-3 py-1 font-bold">{new Date(invoice.date).toLocaleDateString('en-IN')}</td></tr>
                                {invoice.dueDate && <tr><td className="px-3 py-1 text-slate-500 border-r">Due Date</td><td className="px-3 py-1 font-bold">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-300">
                <div className="p-4 border-r border-slate-300">
                    <p className="font-black uppercase tracking-widest text-slate-400 mb-1" style={{ color }}>Bill To</p>
                    <p className="font-bold text-slate-900">{customer?.companyName || customer?.displayName}</p>
                    {invoice.billingAddress ? (
                        <p className="text-slate-600 whitespace-pre-wrap">{invoice.billingAddress}</p>
                    ) : formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                        <p className="text-slate-600">{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                    )}
                    <p className="text-slate-600">GSTIN: {customer?.gstNumber || customer?.gstin || 'URD'}</p>
                </div>
                <div className="p-4">
                    <p className="font-black uppercase tracking-widest text-slate-400 mb-1" style={{ color }}>Ship To</p>
                    {invoice.shippingAddress ? (
                        <>
                            <p className="font-bold text-slate-900">{customer?.companyName || customer?.displayName}</p>
                            <p className="text-slate-600 whitespace-pre-wrap">{invoice.shippingAddress}</p>
                        </>
                    ) : formatCustomerAddress(customer?.shippingAddress) ? (
                        <>
                            <p className="font-bold text-slate-900">{customer?.companyName || customer?.displayName}</p>
                            <p className="text-slate-600">{formatCustomerAddress(customer.shippingAddress)}</p>
                        </>
                    ) : <p className="text-slate-400">Same as billing address</p>}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300" style={{ fontSize: '11px' }}>
                    <thead>
                        <tr className="text-white" style={{ backgroundColor: color }}>
                            <th className="border border-white/20 px-2 py-2 text-left" rowSpan={2}>S.No</th>
                            <th className="border border-white/20 px-2 py-2 text-left" rowSpan={2}>Item / Description</th>
                            <th className="border border-white/20 px-2 py-2" colSpan={1}>HSN</th>
                            <th className="border border-white/20 px-2 py-2" colSpan={1}>Qty</th>
                            <th className="border border-white/20 px-2 py-2 text-right" colSpan={1}>Rate</th>
                            <th className="border border-white/20 px-2 py-2 text-right" colSpan={1}>Taxable Val.</th>
                            {isIGST ? (
                                <th className="border border-white/20 px-2 py-2 text-center" colSpan={2}>{invoice.taxType || 'IGST'}</th>
                            ) : (
                                <><th className="border border-white/20 px-2 py-2 text-center" colSpan={2}>CGST</th>
                                <th className="border border-white/20 px-2 py-2 text-center" colSpan={2}>SGST</th></>
                            )}
                            <th className="border border-white/20 px-2 py-2 text-right" rowSpan={2}>Total</th>
                        </tr>
                        <tr className="bg-slate-100 text-slate-600" style={{ fontSize: '10px' }}>
                            <th className="border border-slate-300 px-2 py-1">Code</th>
                            <th className="border border-slate-300 px-2 py-1">Unit</th>
                            <th className="border border-slate-300 px-2 py-1 text-right">₹</th>
                            <th className="border border-slate-300 px-2 py-1 text-right">₹</th>
                            {isIGST ? (
                                <><th className="border border-slate-300 px-2 py-1 text-center">%</th><th className="border border-slate-300 px-2 py-1 text-right">₹</th></>
                            ) : (
                                <><th className="border border-slate-300 px-2 py-1 text-center">%</th><th className="border border-slate-300 px-2 py-1 text-right">₹</th>
                                <th className="border border-slate-300 px-2 py-1 text-center">%</th><th className="border border-slate-300 px-2 py-1 text-right">₹</th></>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const taxableVal = resolveAmount(item);
                            const gst = item.gstPercentage ?? item.gstPercent ?? 0;
                            const taxAmt = taxableVal * gst / 100;
                            const half = taxAmt / 2;
                            return (
                                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                                    <td className="border border-slate-200 px-2 py-2 text-center">{idx + 1}</td>
                                    <td className="border border-slate-200 px-2 py-2">
                                        <div className="font-medium text-slate-800">{resolveItemName(item)}</div>
                                        {item.description && <div className="text-[10px] text-slate-500 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                                    </td>
                                    <td className="border border-slate-200 px-2 py-2 text-center font-mono">{item.hsnCode || item.itemId?.hsnCode || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2 text-center">{item.quantity}</td>
                                    <td className="border border-slate-200 px-2 py-2 text-right">₹{fmt(item.rate)}</td>
                                    <td className="border border-slate-200 px-2 py-2 text-right">₹{fmt(taxableVal)}</td>
                                    {isIGST ? (
                                        <><td className="border border-slate-200 px-2 py-2 text-center">{gst}%</td><td className="border border-slate-200 px-2 py-2 text-right">₹{fmt(taxAmt)}</td></>
                                    ) : (
                                        <><td className="border border-slate-200 px-2 py-2 text-center">{gst/2}%</td><td className="border border-slate-200 px-2 py-2 text-right">₹{fmt(half)}</td>
                                        <td className="border border-slate-200 px-2 py-2 text-center">{gst/2}%</td><td className="border border-slate-200 px-2 py-2 text-right">₹{fmt(half)}</td></>
                                    )}
                                    <td className="border border-slate-200 px-2 py-2 text-right font-bold">₹{fmt(taxableVal + taxAmt)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="font-bold" style={{ backgroundColor: color + '15' }}>
                        <tr>
                            <td className="border border-slate-300 px-2 py-2 text-right" colSpan={5}>Total</td>
                            <td className="border border-slate-300 px-2 py-2 text-right">₹{fmt(invoice.subTotal)}</td>
                            {isIGST ? (
                                <><td className="border border-slate-300 px-2 py-2"></td><td className="border border-slate-300 px-2 py-2 text-right">₹{fmt(tax.igst || tax.totalTax)}</td></>
                            ) : (
                                <><td className="border border-slate-300 px-2 py-2"></td><td className="border border-slate-300 px-2 py-2 text-right">₹{fmt(tax.cgst)}</td>
                                <td className="border border-slate-300 px-2 py-2"></td><td className="border border-slate-300 px-2 py-2 text-right">₹{fmt(tax.sgst)}</td></>
                            )}
                            <td className="border border-slate-300 px-2 py-2 text-right" style={{ color }}>₹{fmt(invoice.grandTotal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="p-4 grid grid-cols-2 gap-6">
                <div>
                    {settings?.bankDetails?.accountNumber && (
                        <div className="mb-4">
                            <p className="font-black uppercase tracking-widest text-slate-400 mb-1" style={{ color, fontSize: '10px' }}>Bank Details</p>
                            <p className="text-slate-700">Bank: {settings.bankDetails.bankName}</p>
                            <p className="text-slate-700">A/C Name: {settings.bankDetails.accountName}</p>
                            <p className="text-slate-700">A/C No: {settings.bankDetails.accountNumber}</p>
                            <p className="text-slate-700">IFSC: {settings.bankDetails.ifscCode}</p>
                        </div>
                    )}
                    {(settings?.upiId || settings?.upiQrUrl) && (
                        <div className="flex items-center gap-3">
                            {settings.upiQrUrl && <img src={getImageUrl(settings.upiQrUrl)} alt="UPI QR" className="w-20 h-20 object-contain border border-slate-300" />}
                            {settings.upiId && <p className="font-mono font-bold text-slate-900">UPI: {settings.upiId}</p>}
                        </div>
                    )}
                </div>
                <div className="flex flex-col justify-end">
                    <table className="w-full text-right border border-slate-300">
                        <tbody>
                            <tr><td className="px-3 py-1 text-slate-500 border-b border-r border-slate-200">Sub Total</td><td className="px-3 py-1 font-bold border-b border-slate-200">₹{fmt(invoice.subTotal)}</td></tr>
                            {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                                <tr><td className="px-3 py-1 text-red-600 border-b border-r border-slate-200">Discount</td><td className="px-3 py-1 text-red-600 border-b border-slate-200">-₹{fmt(invoice.discount || invoice.discountAmount)}</td></tr>
                            )}
                            <tr><td className="px-3 py-1 text-slate-500 border-b border-r border-slate-200">Taxable Amount</td><td className="px-3 py-1 font-bold border-b border-slate-200">₹{fmt(invoice.taxableAmount || invoice.subTotal - (invoice.discount || 0))}</td></tr>
                            {getViewerTaxBreakdown(invoice).map((row, idx) => (
                                <tr key={idx}>
                                    <td className="px-3 py-1 text-slate-500 border-b border-r border-slate-200">{row.label}</td>
                                    <td className="px-3 py-1 border-b border-slate-200">₹{fmt(row.amount)}</td>
                                </tr>
                            ))}
                            {invoice.amountPaid > 0 && <tr><td className="px-3 py-1 text-emerald-600 border-b border-r border-slate-200">Amount Received</td><td className="px-3 py-1 text-emerald-600 border-b border-slate-200">₹{fmt(invoice.amountPaid)}</td></tr>}
                            <tr className="font-black text-white" style={{ backgroundColor: color }}><td className="px-3 py-2 border-r border-white/20">Total Amount</td><td className="px-3 py-2">₹{fmt(invoice.grandTotal)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            {(invoice.notes || (invoice.includeTerms !== false && invoice.termsAndConditions)) && (
                <div className="px-4 pb-4 text-xs">
                    {invoice.notes && <div className="mb-2"><p className="font-bold text-slate-500 mb-1">Notes:</p><p className="text-xs text-slate-600">{invoice.notes}</p></div>}
                    {(invoice.includeTerms !== false && invoice.termsAndConditions) && <div><p className="font-bold text-slate-500 mb-1">Terms & Conditions:</p><p className="text-xs text-slate-500">{invoice.termsAndConditions}</p></div>}
                </div>
            )}
            <div className="px-4 pb-4 border-t border-slate-200 pt-3 flex justify-between items-center">
                {invoice.includeSignature ? (
                    <div className="text-right max-w-[200px] flex flex-col items-center">
                        {settings?.signature ? (
                            <>
                                <img src={getImageUrl(settings.signature)} alt="Signature" className="h-8 object-contain mx-auto mb-1" />
                                <div className="border-t border-slate-300 w-28 my-1"></div>
                                <p className="text-[9px] text-slate-500 font-bold">Authorized Signature</p>
                            </>
                        ) : (
                            <>
                                <div className="h-8 w-28"></div>
                                <div className="border-t border-slate-300 w-28 my-1"></div>
                                <p className="text-[9px] text-slate-500 font-bold">Authorized Signature</p>
                            </>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400">This is a computer-generated invoice. No signature required.</p>
                )}
                <p className="text-xs font-bold" style={{ color }}>{settings?.companyName}</p>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// TEMPLATE 8: Vibrant Color
// ──────────────────────────────────────────────────────────────────────────────────
export const TemplateVibrant = ({ invoice, customer, settings, color, printRef }) => {
    const tax = calcTaxBreakdown(invoice);
    const items = invoice.items || invoice.lineItems || [];
    const theme = COLOR_THEMES.find(t => t.value === color) || COLOR_THEMES[0];
    return (
        <div className="bg-white font-sans overflow-hidden rounded-2xl" ref={printRef}>
            <div className="relative p-10 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}>
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20" style={{ backgroundColor: 'white' }}></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: 'white' }}></div>
                <div className="relative flex justify-between items-start">
                    <div>
                        {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-14 object-contain mb-3 brightness-0 invert" /> : <h1 className="text-2xl font-black text-white mb-1">{settings?.companyName}</h1>}
                        <p className="text-white/70 text-sm">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', ')}</p>
                        {settings?.gstNumber && <p className="text-white/70 text-sm">GSTIN: {settings.gstNumber}</p>}
                    </div>
                    <div className="text-right">
                        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                            <p className="text-white/70 text-xs uppercase tracking-widest">Invoice</p>
                            <p className="text-white text-2xl font-black">{invoice.invoiceNumber}</p>
                            <p className="text-white/70 text-sm">{new Date(invoice.date).toLocaleDateString('en-IN')}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-10">
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="p-5 rounded-2xl" style={{ backgroundColor: theme.light, border: `1px solid ${theme.border}` }}>
                        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color }}>Billed To</p>
                        <p className="text-lg font-black text-slate-900">{customer?.companyName || customer?.displayName}</p>
                        {invoice.billingAddress ? (
                            <p className="text-slate-500 text-sm whitespace-pre-wrap">{invoice.billingAddress}</p>
                        ) : formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                            <p className="text-slate-500 text-sm">{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                        )}
                        {(customer?.gstNumber || customer?.gstin) && <p className="text-slate-600 text-sm">GSTIN: {customer.gstNumber || customer.gstin}</p>}
                    </div>
                    <div className="p-5 rounded-2xl" style={{ backgroundColor: theme.light, border: `1px solid ${theme.border}` }}>
                        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color }}>Invoice Summary</p>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-bold">{new Date(invoice.date).toLocaleDateString('en-IN')}</span></div>
                            {invoice.dueDate && <div className="flex justify-between"><span className="text-slate-500">Due</span><span className="font-bold text-red-500">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span></div>}
                            <div className="flex justify-between text-base font-black pt-2" style={{ color }}><span>Total</span><span>₹{fmt(invoice.grandTotal)}</span></div>
                        </div>
                    </div>
                </div>
                <table className="w-full mb-8 text-sm">
                    <thead>
                        <tr className="text-xs uppercase tracking-widest font-black text-white" style={{ backgroundColor: color }}>
                            <th className="px-4 py-3 text-left rounded-l-xl">Item</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-right">Rate</th>
                            <th className="px-4 py-3 text-center">GST</th>
                            <th className="px-4 py-3 text-right rounded-r-xl">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : ''}`} style={idx % 2 !== 0 ? { backgroundColor: theme.light } : {}}>
                                <td className="px-4 py-3 text-slate-900">
                                    <div className="font-semibold">{resolveItemName(item)}</div>
                                    {item.description && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                                </td>
                                <td className="px-4 py-3 text-center">{item.quantity}</td>
                                <td className="px-4 py-3 text-right">₹{fmt(item.rate)}</td>
                                <td className="px-4 py-3 text-center">{item.gstPercentage ?? item.gstPercent ?? 0}%</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">₹{fmt(resolveAmount(item))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between items-end">
                    <div className="flex gap-4">
                        {settings?.bankDetails?.accountNumber && (
                            <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: theme.light, border: `1px solid ${theme.border}` }}>
                                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color }}>Bank</p>
                                <p className="text-slate-700">{settings.bankDetails.bankName}</p>
                                <p className="text-slate-700">A/C: {settings.bankDetails.accountNumber}</p>
                                <p className="text-slate-700">IFSC: {settings.bankDetails.ifscCode}</p>
                            </div>
                        )}
                        {(settings?.upiId || settings?.upiQrUrl) && (
                            <div className="p-4 rounded-xl flex items-center gap-3 text-sm" style={{ backgroundColor: theme.light, border: `1px solid ${theme.border}` }}>
                                {settings.upiQrUrl && <img src={getImageUrl(settings.upiQrUrl)} alt="UPI QR" className="w-16 h-16 object-contain" />}
                                {settings.upiId && <div><p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color }}>UPI</p><p className="font-mono font-bold text-slate-900">{settings.upiId}</p></div>}
                            </div>
                        )}
                    </div>
                    <div className="text-right p-6 rounded-2xl min-w-64" style={{ backgroundColor: theme.light, border: `1px solid ${theme.border}` }}>
                        <div className="space-y-1 text-sm mb-3">
                            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{fmt(invoice.subTotal)}</span></div>
                            {getViewerTaxBreakdown(invoice).map((row, idx) => (
                                <div key={idx} className="flex justify-between text-slate-500">
                                    <span>{row.label}</span>
                                    <span>₹{fmt(row.amount)}</span>
                                </div>
                            ))}
                        </div>
                        {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                            <div className="flex justify-between text-slate-500"><span>Discount</span><span>-₹{fmt(invoice.discount || invoice.discountAmount)}</span></div>
                        )}
                        <div className="flex justify-between text-xl font-black pt-3 border-t-2" style={{ color, borderColor: color }}>
                            <span>Total</span><span>₹{fmt(invoice.grandTotal)}</span>
                        </div>
                        {invoice.amountPaid > 0 && <div className="flex justify-between text-sm text-emerald-600 font-bold mt-2"><span>Received</span><span>₹{fmt(invoice.amountPaid)}</span></div>}
                        {(invoice.balanceDue > 0 || invoice.grandTotal - (invoice.amountPaid||0) > 0) && (
                            <div className="flex justify-between text-sm font-bold text-red-500 mt-1"><span>Balance Due</span><span>₹{fmt(invoice.balanceDue ?? invoice.grandTotal - (invoice.amountPaid||0))}</span></div>
                        )}
                    </div>
                </div>
                <InvoiceFooterBlock invoice={invoice} settings={settings} color={color} />
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────────
const InvoiceViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [invoiceData, setInvoiceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState(() => localStorage.getItem('invoiceTemplate') || 'modern');
    const [accentColor, setAccentColor] = useState(() => localStorage.getItem('invoiceColor') || '#2563eb');
    const [downloading, setDownloading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [emailFrom, setEmailFrom] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [showColors, setShowColors] = useState(false);
    const printRef = useRef(null);

    useEffect(() => {
        const fetchInvoiceAndSettings = async () => {
            try {
                const [invoiceRes, settingsRes] = await Promise.all([
                    axios.get(`/api/invoices/${id}`),
                    axios.get('/api/settings'),
                ]);
                const invoice = invoiceRes.data.data;
                const settings = settingsRes.data.data;
                // Normalize: merge items from lineItems or items array
                if (!invoice.items) {
                    invoice.items = invoice.lineItems || [];
                }
                setInvoiceData({ invoice, settings });
            } catch (err) {
                console.error('Error fetching invoice', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoiceAndSettings();
    }, [id]);

    const handleTemplateChange = (val) => {
        setTemplate(val);
        localStorage.setItem('invoiceTemplate', val);
    };

    const handleColorChange = (val) => {
        setAccentColor(val);
        localStorage.setItem('invoiceColor', val);
        setShowColors(false);
    };

    // ── Safe download using fetch + Blob (no page freeze) ──────────────────────
    const handleDownloadPDF = () => {
        setDownloading(true);
        const token = localStorage.getItem('token')
            || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
            || '';
        window.location.href = `${API_URL}/api/invoices/${id}/download?token=${token}&template=${template}&color=${encodeURIComponent(accentColor)}`;
        showToast('PDF download started!', 'success');
        setTimeout(() => {
            setDownloading(false);
        }, 3000);
    };

    const openEmailModal = () => {
        if (!invoiceData) return;
        const { invoice, settings } = invoiceData;
        const customer = invoice.customerId;
        
        setEmailTo(customer?.email || '');
        setEmailFrom(settings?.email || '');
        setEmailSubject(`Invoice ${invoice.invoiceNumber} from ${settings?.companyName || 'Prolync Billing'}`);
        setEmailMessage(`Hello ${customer?.companyName || customer?.name || 'Customer'},\n\nPlease find attached your Invoice ${invoice.invoiceNumber} for ₹${fmt(invoice.grandTotal)}.\n\nThank you for your business!\n\nBest regards,\n${settings?.companyName || 'Prolync Billing'}`);
        setIsEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!emailTo) {
            alert('Recipient email address is required.');
            return;
        }
        setSendingEmail(true);
        try {
            const token = localStorage.getItem('token')
                || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
                || '';

            await axios.put(`/api/invoices/${id}/send?template=${template}&color=${encodeURIComponent(accentColor)}`, {
                to: emailTo,
                from: emailFrom,
                subject: emailSubject,
                message: emailMessage
            }, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            alert('Invoice PDF email sent successfully!');
            setIsEmailModalOpen(false);
        } catch (err) {
            console.error('Email send failed:', err);
            alert(err.response?.data?.message || 'Failed to send email. Please check your SMTP configuration in .env');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleDeleteInvoice = async () => {
        if (window.confirm('Are you sure you want to permanently delete this invoice? This will restore inventory stock and reverse customer balance.')) {
            try {
                await axios.delete(`/api/invoices/${id}`);
                navigate('/invoices');
            } catch (err) {
                alert(err.response?.data?.message || 'Failed to delete invoice.');
            }
        }
    };



    const handleSendMailGmail = () => {
        if (!invoiceData) return;
        const { invoice, settings } = invoiceData;
        const customer = invoice.customerId;
        const link = `${window.location.origin}/invoice/view/${invoice.shareToken}`;
        const subject = `Invoice ${invoice.invoiceNumber} from ${settings?.companyName || 'Billing System'}`;
        const body = `Hello ${customer?.companyName || customer?.displayName || 'Customer'},\n\nPlease find your Invoice ${invoice.invoiceNumber} for ₹${fmt(invoice.grandTotal)}.\n\nYou can view and download the invoice here: ${link}\n\nThank you for your business!\n\nBest regards,\n${settings?.companyName || 'Billing System'}`;
        
        const htmlBody = `Hello ${customer?.companyName || customer?.displayName || 'Customer'},<br/><br/>Please find your Invoice ${invoice.invoiceNumber} for ₹${fmt(invoice.grandTotal)}.<br/><br/>You can view and download the invoice <a href="${link}">here</a>.<br/><br/>Thank you for your business!<br/><br/>Best regards,<br/>${settings?.companyName || 'Billing System'}`;
        
        try {
            const blobText = new Blob([body], { type: 'text/plain' });
            const blobHtml = new Blob([htmlBody], { type: 'text/html' });
            const clipboardData = [new ClipboardItem({ 'text/plain': blobText, 'text/html': blobHtml })];
            navigator.clipboard.write(clipboardData).then(() => {
                showToast("Gmail opened. Rich text with formatted link copied to clipboard! Paste it directly.", "success");
            }).catch(err => {
                console.error("Clipboard copy failed", err);
            });
        } catch (e) {
            console.error("Rich text clipboard copy is not supported in this browser", e);
        }
        
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customer?.email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');
    };

    const handleCopyInvoiceLink = () => {
        if (!invoiceData) return;
        const { invoice } = invoiceData;
        const link = `${window.location.origin}/invoice/view/${invoice.shareToken}`;
        navigator.clipboard.writeText(link)
            .then(() => {
                showToast('Invoice sharing link copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Failed to copy', err);
                showToast('Failed to copy link to clipboard.', 'error');
            });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Loading Invoice...</p>
            </div>
        </div>
    );
    if (!invoiceData) return <div className="p-8 text-center text-red-500 font-semibold">Invoice not found.</div>;

    const { invoice, settings } = invoiceData;
    const customer = invoice.customerId;

    const filteredSettings = {
        ...settings,
        bankDetails: invoice.includeBankDetails !== false ? settings?.bankDetails : null,
        upiId: invoice.includeUpiQr !== false ? settings?.upiId : null,
        upiQrUrl: invoice.includeUpiQr !== false ? settings?.upiQrUrl : null,
    };

    const templateProps = { invoice, customer, settings: filteredSettings, color: accentColor, printRef };
    const templateMap = {
        modern:       <TemplateModern {...templateProps} />,
        classic:      <TemplateClassic {...templateProps} />,
        professional: <TemplateProfessional {...templateProps} />,
        elegant:      <TemplateElegant {...templateProps} />,
        minimal:      <TemplateMinimal {...templateProps} />,
        bold:         <TemplateBold {...templateProps} />,
        gst:          <TemplateGST {...templateProps} />,
        vibrant:      <TemplateVibrant {...templateProps} />,
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            {/* ── Toolbar ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-6 gap-4 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/invoices')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black text-slate-900">#{invoice.invoiceNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase ${invoice.status === 'Paid' ? 'bg-emerald-500 text-white' : invoice.status === 'Draft' ? 'bg-slate-400 text-white' : 'bg-amber-400 text-white'}`}>
                                {invoice.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm">{customer?.companyName || customer?.displayName}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Template selector */}
                    <select
                        value={template}
                        onChange={e => handleTemplateChange(e.target.value)}
                        className="bg-slate-900 text-white border-none rounded-xl py-2.5 pl-3 pr-8 text-sm font-bold shadow-lg cursor-pointer"
                    >
                        {TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>

                    {/* Color picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColors(v => !v)}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all flex items-center gap-2"
                            title="Change Color Theme"
                        >
                            <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: accentColor }}></div>
                            <Palette size={16} className="text-slate-500" />
                        </button>
                        {showColors && (
                            <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 flex gap-2">
                                {COLOR_THEMES.map(t => (
                                    <button
                                        key={t.value}
                                        onClick={() => handleColorChange(t.value)}
                                        title={t.label}
                                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${accentColor === t.value ? 'border-slate-800 scale-110' : 'border-white shadow-sm'}`}
                                        style={{ backgroundColor: t.value }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    <button onClick={() => navigate(`/invoices/${invoice._id}/edit`)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Edit">
                        <Edit size={18} />
                    </button>
                    <button onClick={handleDeleteInvoice} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title="Delete">
                        <Trash2 size={18} />
                    </button>
                    <button onClick={() => window.print()} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Print">
                        <Printer size={18} />
                    </button>
                    <button onClick={handleCopyInvoiceLink} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Copy Public Link">
                        <Copy size={18} />
                    </button>
                    <button onClick={handleSendMailGmail} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Send Gmail">
                        <Mail size={18} />
                    </button>

                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-70"
                        style={{ backgroundColor: accentColor }}
                    >
                        {downloading
                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Downloading...</>
                            : <><Download size={16} /> Download PDF</>
                        }
                    </button>
                </div>
            </div>

            {/* ── Invoice Preview ── */}
            <div className="flex justify-center">
                <div className="w-full max-w-4xl shadow-2xl">
                    {templateMap[template] || templateMap.modern}
                </div>
            </div>

            {/* ── Interactive Send Email Modal ── */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in no-print">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all scale-100 duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Send Invoice via Email</h3>
                                <p className="text-slate-500 text-xs mt-0.5">Customize your email details below before sending</p>
                            </div>
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-6 space-y-4">
                            {/* From field */}
                            <div>
                                <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-1">From (Sender Email)</label>
                                <input
                                    type="email"
                                    value={emailFrom}
                                    onChange={e => setEmailFrom(e.target.value)}
                                    placeholder="your-email@company.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                />
                            </div>

                            {/* To field */}
                            <div>
                                <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-1">To (Recipient Email)</label>
                                <input
                                    type="email"
                                    value={emailTo}
                                    onChange={e => setEmailTo(e.target.value)}
                                    placeholder="customer-email@domain.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    required
                                />
                            </div>

                            {/* Subject field */}
                            <div>
                                <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={e => setEmailSubject(e.target.value)}
                                    placeholder="Email Subject"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    required
                                />
                            </div>

                            {/* Message field */}
                            <div>
                                <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-1">Message Content</label>
                                <textarea
                                    rows={5}
                                    value={emailMessage}
                                    onChange={e => setEmailMessage(e.target.value)}
                                    placeholder="Type your message details..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none leading-relaxed"
                                />
                            </div>

                            {/* Attached PDF row */}
                            <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5">
                                <div className="p-2 bg-blue-500 text-white rounded-xl">
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-slate-800 font-bold text-xs truncate">{invoice.invoiceNumber}.pdf</p>
                                    <p className="text-slate-500 text-[10px]">Automatically generated & attached</p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                                    PDF Attachment
                                </span>
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsEmailModalOpen(false)}
                                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendEmail}
                                disabled={sendingEmail}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-70 bg-blue-600 hover:bg-blue-700"
                                style={{ backgroundColor: accentColor }}
                            >
                                {sendingEmail ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Sending Email...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} />
                                        Send Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .max-w-6xl { max-width: 100% !important; padding: 0 !important; }
                    .shadow-2xl, .shadow-sm { box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
};

export default InvoiceViewer;
