import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, Share2, Edit, FileText, CheckCircle, Mail, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const InvoiceViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoiceData, setInvoiceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState('modern');
    const invoiceRef = useRef(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                // Using public endpoint as it nicely bundles settings and invoice together
                const res = await axios.get(`/api/public/invoices/${id}`);
                setInvoiceData(res.data.data);
            } catch (err) {
                console.error("Error fetching invoice", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [id]);

    const handleDownloadPDF = () => {
        const element = invoiceRef.current;
        const opt = {
            margin: 0,
            filename: `Invoice_${invoiceData.invoice.invoiceNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    const handleShareWhatsApp = () => {
        const link = `http://localhost:5173/public/invoice/${id}`;
        const text = `Hello ${invoiceData.invoice.customerId?.companyName || 'Customer'},\n\nHere is your latest Invoice (${invoiceData.invoice.invoiceNumber}) for ₹${invoiceData.invoice.grandTotal.toFixed(2)}.\n\nView and download it securely here: ${link}\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = () => {
        const link = `http://localhost:5173/public/invoice/${id}`;
        const subject = `Invoice ${invoiceData.invoice.invoiceNumber} from ${settings?.companyName || 'Billing System'}`;
        const body = `Hello ${invoiceData.invoice.customerId?.companyName || 'Customer'},\n\nPlease find your invoice (${invoiceData.invoice.invoiceNumber}) for the amount of ₹${invoiceData.invoice.grandTotal.toFixed(2)}.\n\nYou can view and download it here: ${link}\n\nBest regards,\n${settings?.companyName || 'Billing Team'}`;
        window.location.href = `mailto:${invoiceData.invoice.customerId?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Invoice Viewer...</div>;
    if (!invoiceData) return <div className="p-8 text-center text-red-500">Invoice not found.</div>;

    const { invoice, settings } = invoiceData;
    const customer = invoice.customerId;

    // --- TEMPLATES ---
    const TemplateModern = () => (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200" ref={invoiceRef}>
            <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                <div>
                    {settings?.logoUrl ? (
                        <img src={`${settings.logoUrl}`} alt="Logo" className="h-16 object-contain mb-4" />
                    ) : (
                        <h1 className="text-2xl font-black text-slate-900 mb-2">{settings?.companyName || 'Transport Company'}</h1>
                    )}
                    <p className="text-slate-500 text-sm whitespace-pre-wrap">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', ')}</p>
                    <p className="text-slate-500 text-sm mt-1">GSTIN: <span className="font-medium text-slate-700">{settings?.gstNumber || 'N/A'}</span></p>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-black text-blue-600 tracking-tight uppercase mb-4">Invoice</h2>
                    <p className="text-slate-500 text-sm mb-1">Invoice No: <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
                    <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(invoice.date).toLocaleDateString()}</span></p>
                    {invoice.dueDate && <p className="text-slate-500 text-sm">Due Date: <span className="font-medium text-red-500">{new Date(invoice.dueDate).toLocaleDateString()}</span></p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-10">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName}</h3>
                    {customer?.billingAddress && (
                        <p className="text-slate-500 text-sm mb-1">
                            {customer.billingAddress.street}, {customer.billingAddress.city}, {customer.billingAddress.state}
                        </p>
                    )}
                    <p className="text-slate-500 text-sm mt-1">GSTIN: <span className="font-medium text-slate-700">{customer?.gstNumber || 'URD'}</span></p>
                </div>
                {invoice.transportDetails?.vehicleNumber && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Dispatch Details</p>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1 text-sm">
                            <p className="text-slate-600">Vehicle: <span className="font-bold text-slate-900">{invoice.transportDetails.vehicleNumber}</span></p>
                            <p className="text-slate-600">Route: <span className="font-medium text-slate-900">{invoice.transportDetails.route || 'N/A'}</span></p>
                            {invoice.transportDetails.tripDate && <p className="text-slate-600">Trip Date: <span className="font-medium text-slate-900">{new Date(invoice.transportDetails.tripDate).toLocaleDateString()}</span></p>}
                        </div>
                    </div>
                )}
            </div>

            <table className="w-full mb-10 text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                        <th className="py-3 font-bold">Item & Description</th>
                        <th className="py-3 font-bold text-center">Qty</th>
                        <th className="py-3 font-bold text-right">Rate</th>
                        <th className="py-3 font-bold text-center">GST</th>
                        <th className="py-3 font-bold text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {invoice.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                            <td className="py-4 font-medium text-slate-800 w-2/5">
                                {item.name || (item.itemId ? item.itemId.name : 'Item')}
                                {item.itemId?.hsnCode && <p className="text-xs text-slate-400 mt-1 font-normal">HSN: {item.itemId.hsnCode}</p>}
                            </td>
                            <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                            <td className="py-4 text-right text-slate-600">₹{item.rate?.toFixed(2) || '0.00'}</td>
                            <td className="py-4 text-center text-slate-600">{item.gstPercentage}%</td>
                            <td className="py-4 text-right font-medium text-slate-900">₹{item.amount?.toFixed(2) || '0.00'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="grid grid-cols-2 gap-12">
                <div>
                    {settings?.bankDetails?.accountNumber ? (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Details</p>
                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-sm text-slate-700">
                                <p className="mb-1"><strong>Bank:</strong> {settings.bankDetails.bankName}</p>
                                <p className="mb-1"><strong>Account Name:</strong> {settings.bankDetails.accountName}</p>
                                <p className="mb-1"><strong>Account No:</strong> {settings.bankDetails.accountNumber}</p>
                                <p><strong>IFSC:</strong> {settings.bankDetails.ifscCode}</p>
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                        <span>Sub Total</span>
                        <span className="font-medium text-slate-900">₹{invoice.subTotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    {invoice.discount > 0 && (
                        <div className="flex justify-between text-emerald-500">
                            <span>Discount</span>
                            <span>-₹{invoice.discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                        <span>CGST</span>
                        <span>₹{invoice.taxTotal?.cgst?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>SGST</span>
                        <span>₹{invoice.taxTotal?.sgst?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-3 mt-3">
                        <span>Grand Total</span>
                        <span className="text-blue-600">₹{invoice.grandTotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    {invoice.amountPaid > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium pt-2">
                            <span>Amount Paid</span>
                            <span>₹{invoice.amountPaid?.toFixed(2) || '0.00'}</span>
                        </div>
                    )}
                    {invoice.status !== 'Paid' && invoice.amountPaid > 0 && (
                        <div className="flex justify-between text-red-500 font-bold border-t border-slate-100 pt-2">
                            <span>Balance Due</span>
                            <span>₹{(invoice.grandTotal - invoice.amountPaid).toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>
            {invoice.notes && (
                <div className="mt-10 pt-6 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 mb-1">Notes</p>
                    <p className="text-sm text-slate-600">{invoice.notes}</p>
                </div>
            )}
        </div>
    );

    const TemplateClassic = () => (
        <div className="bg-white p-10 rounded-sm shadow-sm border border-slate-300 font-serif" ref={invoiceRef}>
            <div className="text-center border-b-2 border-slate-800 pb-6 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2 uppercase tracking-wider">{settings?.companyName || 'Transport Company'}</h1>
                <p className="text-slate-600 text-sm mb-1">{[settings?.address?.street, settings?.address?.city].filter(Boolean).join(', ')}</p>
                <p className="text-slate-600 text-sm">GSTIN: {settings?.gstNumber || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-start mb-10">
                <div className="w-1/2">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-1 mb-3">Bill To:</h3>
                    <p className="font-bold text-slate-800">{customer?.companyName}</p>
                    <p className="text-slate-600 text-sm mt-1">{customer?.billingAddress?.street}</p>
                    <p className="text-slate-600 text-sm">{customer?.billingAddress?.city}</p>
                    <p className="text-slate-600 text-sm mt-1">GSTIN: {customer?.gstNumber}</p>
                </div>
                <div className="w-1/3 border border-slate-300 p-4 bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-900 uppercase text-center mb-3">Invoice</h2>
                    <div className="flex justify-between text-sm mb-2"><span className="font-bold">No:</span> <span>{invoice.invoiceNumber}</span></div>
                    <div className="flex justify-between text-sm mb-2"><span className="font-bold">Date:</span> <span>{new Date(invoice.date).toLocaleDateString()}</span></div>
                    {invoice.dueDate && <div className="flex justify-between text-sm"><span className="font-bold">Due:</span> <span>{new Date(invoice.dueDate).toLocaleDateString()}</span></div>}
                </div>
            </div>

            <table className="w-full mb-10 border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300">
                    <tr className="text-slate-900 text-sm">
                        <th className="py-2 px-3 border-r border-slate-300 text-left">Description</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-center">Qty</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {invoice.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                            <td className="py-3 px-3 border-r border-slate-300">{item.name || (item.itemId ? item.itemId.name : 'Item')}</td>
                            <td className="py-3 px-3 border-r border-slate-300 text-center">{item.quantity}</td>
                            <td className="py-3 px-3 border-r border-slate-300 text-right">₹{item.rate?.toFixed(2) || '0.00'}</td>
                            <td className="py-3 px-3 text-right">₹{item.amount?.toFixed(2) || '0.00'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end mb-10">
                <div className="w-1/2 border border-slate-300">
                    <div className="flex justify-between p-2 border-b border-slate-200 text-sm"><span>Sub Total:</span><span>₹{invoice.subTotal?.toFixed(2) || '0.00'}</span></div>
                    <div className="flex justify-between p-2 border-b border-slate-200 text-sm"><span>CGST:</span><span>₹{invoice.taxTotal?.cgst?.toFixed(2) || '0.00'}</span></div>
                    <div className="flex justify-between p-2 border-b border-slate-200 text-sm"><span>SGST:</span><span>₹{invoice.taxTotal?.sgst?.toFixed(2) || '0.00'}</span></div>
                    <div className="flex justify-between p-3 bg-slate-100 font-bold text-lg"><span>Total:</span><span>₹{invoice.grandTotal?.toFixed(2) || '0.00'}</span></div>
                </div>
            </div>
            <div className="text-sm text-slate-600 text-center border-t border-slate-300 pt-4">
                Thank you for your business!
            </div>
        </div>
    );

    const TemplateProfessional = () => (
        <div className="bg-white p-12 shadow-2xl border-t-8 border-blue-600 rounded-b-xl relative overflow-hidden" ref={invoiceRef}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 -mr-16 -mt-16 rounded-full opacity-50"></div>

            <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                    {settings?.logoUrl ? (
                        <img src={`${settings.logoUrl}`} alt="Logo" className="h-20 object-contain mb-6" />
                    ) : (
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">{settings?.companyName || 'Prolync Book'}</h1>
                    )}
                    <div className="text-slate-500 text-sm space-y-1">
                        <p>{settings?.address?.street}</p>
                        <p>{settings?.address?.city}, {settings?.address?.state}</p>
                        <p className="pt-2 text-slate-800 font-semibold">GSTIN: {settings?.gstNumber || 'N/A'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-5xl font-black text-slate-200 uppercase tracking-tighter mb-4">Invoice</h2>
                    <div className="space-y-1">
                        <p className="text-slate-900 font-bold">#{invoice.invoiceNumber}</p>
                        <p className="text-slate-500 text-sm">Date: {new Date(invoice.date).toLocaleDateString()}</p>
                        <p className="text-slate-500 text-sm font-semibold pt-2">Total Amount</p>
                        <p className="text-3xl font-black text-blue-600">₹{invoice.grandTotal.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-16 mb-12">
                <div>
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-100 pb-2">Client Details</h4>
                    <p className="text-xl font-bold text-slate-900 mb-2">{customer?.companyName}</p>
                    <div className="text-slate-500 text-sm space-y-1">
                        <p>{customer?.billingAddress?.street}</p>
                        <p>{customer?.billingAddress?.city}, {customer?.billingAddress?.state}</p>
                        <p className="pt-2 text-slate-800 font-medium">GST: {customer?.gstNumber || 'URD'}</p>
                    </div>
                </div>
                {invoice.transportDetails?.vehicleNumber && (
                    <div>
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-100 pb-2">Logistics</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase">Vehicle</p>
                                <p className="font-bold text-slate-900">{invoice.transportDetails.vehicleNumber}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase">Trip Date</p>
                                <p className="font-bold text-slate-900">{invoice.transportDetails.tripDate ? new Date(invoice.transportDetails.tripDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-slate-400 text-xs font-bold uppercase">Route</p>
                                <p className="font-medium text-slate-900">{invoice.transportDetails.route || 'Local Delivery'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <table className="w-full mb-12">
                <thead>
                    <tr className="bg-slate-900 text-white">
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest rounded-l-lg">Description</th>
                        <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest rounded-r-lg">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="px-4 py-6">
                                <p className="font-bold text-slate-900">{item.name || (item.itemId?.name)}</p>
                                {item.itemId?.hsnCode && <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">HSN: {item.itemId.hsnCode}</p>}
                            </td>
                            <td className="px-4 py-6 text-center text-slate-600 font-medium">{item.quantity}</td>
                            <td className="px-4 py-6 text-right text-slate-600">₹{item.rate.toFixed(2)}</td>
                            <td className="px-4 py-6 text-right font-bold text-slate-900">₹{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-between items-end">
                <div className="w-1/2">
                    {settings?.bankDetails?.accountNumber && (
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Information</h4>
                            <div className="space-y-2 text-xs">
                                <p className="flex justify-between"><span className="text-slate-500">Bank Name</span> <span className="font-bold text-slate-900">{settings.bankDetails.bankName}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Acc Holder</span> <span className="font-bold text-slate-900">{settings.bankDetails.accountName}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Acc Number</span> <span className="font-bold text-slate-900">{settings.bankDetails.accountNumber}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">IFSC Code</span> <span className="font-bold text-slate-900 text-blue-600">{settings.bankDetails.ifscCode}</span></p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="w-1/3 space-y-4">
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-bold text-slate-900">₹{invoice.subTotal.toFixed(2)}</span>
                    </div>
                    {invoice.discount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600">
                            <span>Discount</span>
                            <span className="font-bold">-₹{invoice.discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Tax (CGST+SGST)</span>
                        <span className="font-bold text-slate-900">₹{(invoice.taxTotal.cgst + invoice.taxTotal.sgst).toFixed(2)}</span>
                    </div>
                    <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Amount Due</span>
                        <span className="text-3xl font-black text-slate-900">₹{(invoice.grandTotal - (invoice.amountPaid || 0)).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center text-[#94a3b8] text-[11px] font-medium uppercase tracking-[0.3em]">
                Issued by {settings?.companyName} &bull; Generated via Prolync Book
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            {/* Header / Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/invoices')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm hover:shadow-md">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">#{invoice.invoiceNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm ${invoice.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                                {invoice.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Recipient: <span className="text-slate-900">{customer?.companyName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <select
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            className="w-48 !bg-slate-900 !text-white !border-none !rounded-2xl !py-3 !pl-4 !pr-10 !text-sm !font-bold shadow-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <option value="modern">Modern Professional</option>
                            <option value="professional">Corporate Premium</option>
                            <option value="classic">Traditional Clean</option>
                        </select>
                    </div>

                    <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                    <button onClick={() => navigate(`/invoices/${invoice._id}/edit`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Edit Invoice">
                        <Edit size={20} />
                    </button>

                    <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Print Invoice">
                        <Printer size={20} />
                    </button>

                    <button onClick={handleShareEmail} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Share via Email">
                        <Mail size={20} />
                    </button>

                    <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95">
                        <Share2 size={18} /> Share
                    </button>

                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
                        <Download size={18} /> Download
                    </button>
                </div>
            </div>

            {/* Document Preview */}
            <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-full max-w-4xl">
                    {template === 'modern' && <TemplateModern />}
                    {template === 'professional' && <TemplateProfessional />}
                    {template === 'classic' && <TemplateClassic />}
                </div>
            </div>

            <style jsx="true">{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .max-w-6xl { max-width: 100% !important; padding: 0 !important; }
                    .shadow-2xl, .shadow-sm { shadow: none !important; }
                    .rounded-xl, .rounded-b-xl { border-radius: 0 !important; }
                }
            `}</style>
        </div>
    );
};

export default InvoiceViewer;
