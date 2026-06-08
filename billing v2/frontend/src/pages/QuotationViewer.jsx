import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { API_URL } from '../utils/api';
import { ArrowLeft, Download, Share2, Edit, Mail, Printer, ClipboardList, Trash2, Send, Check, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getImageUrl, getViewerTaxBreakdown } from './InvoiceViewer';

const formatCustomerAddress = (addr, flatFallback) => {
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

const QuotationViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quoteData, setQuoteData] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState('modern');
    const quoteRef = useRef(null);

    const handleDeleteQuote = async () => {
        if (window.confirm("Are you sure you want to permanently delete this quotation?")) {
            try {
                await axios.delete(`/api/quotations/${id}`);
                alert("Quotation deleted successfully.");
                navigate('/quotations');
            } catch (err) {
                console.error("Error deleting quotation", err);
                alert(err.response?.data?.message || "Failed to delete quotation.");
            }
        }
    };

    const handleMarkAsSent = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/quotations/${id}/status`, { status: 'Sent' }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showToast('Quotation marked as Sent.', 'success');
            const res = await axios.get(`/api/public/quotations/${id}`);
            setQuoteData(res.data.data);
        } catch (err) {
            console.error("Error marking quotation as sent", err);
            showToast(err.response?.data?.message || "Failed to update status.", "error");
        }
    };

    const handleAccept = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/quotations/${id}/status`, { status: 'Accepted' }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showToast('Quotation accepted successfully!', 'success');
            if (window.confirm("Quotation accepted! Do you want to convert it to an Invoice now?")) {
                navigate(`/invoices/new?quoteId=${id}`);
            } else {
                const res = await axios.get(`/api/public/quotations/${id}`);
                setQuoteData(res.data.data);
            }
        } catch (err) {
            console.error("Error accepting quotation", err);
            showToast(err.response?.data?.message || "Failed to accept quotation.", "error");
        }
    };

    const handleReject = async () => {
        if (window.confirm("Are you sure you want to reject this quotation?")) {
            try {
                const token = localStorage.getItem('token');
                await axios.put(`/api/quotations/${id}/status`, { status: 'Rejected' }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                showToast('Quotation rejected.', 'info');
                const res = await axios.get(`/api/public/quotations/${id}`);
                setQuoteData(res.data.data);
            } catch (err) {
                console.error("Error rejecting quotation", err);
                showToast(err.response?.data?.message || "Failed to reject quotation.", "error");
            }
        }
    };

    useEffect(() => {
        const fetchQuotation = async () => {
            try {
                // Using public endpoint for consistency (need to add this backend route)
                const res = await axios.get(`/api/public/quotations/${id}`);
                setQuoteData(res.data.data);
            } catch (err) {
                console.error("Error fetching quotation", err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuotation();
    }, [id]);

    const handleDownloadPDF = () => {
        setDownloading(true);
        const token = localStorage.getItem('token')
            || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
            || '';
        window.location.href = `${API_URL}/api/quotations/${id}/download?token=${token}&template=${template}`;
        showToast('PDF download started!', 'success');
        setTimeout(() => {
            setDownloading(false);
        }, 3000);
    };

    const handleSendEmail = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/quotations/${id}/send`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            alert('Quotation emailed successfully!');
        } catch (err) {
            console.error('Email send failed:', err);
            handleShareEmail();
        }
    };



    const handleShareEmail = () => {
        const link = `${window.location.origin}/public/quotation/${id}`;
        const subject = `Quotation ${quoteData.quotation.quoteNumber} from ${quoteData.settings?.companyName || 'Billing System'}`;
        const body = `Hello ${quoteData.quotation.customerId?.companyName || 'Customer'},\n\nPlease find our quotation (${quoteData.quotation.quoteNumber}) for the amount of ₹${(quoteData.quotation.grandTotal || 0).toFixed(2)}.\n\nYou can view and download it here: ${link}\n\nBest regards,\n${quoteData.settings?.companyName || 'Sales Team'}`;
        window.location.href = `mailto:${quoteData.quotation.customerId?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Quotation Viewer...</div>;
    if (!quoteData) return <div className="p-8 text-center text-red-500">Quotation not found.</div>;

    const { quotation: quote, settings } = quoteData;
    const customer = quote.customerId;

    const TemplateModern = () => (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 font-sans text-slate-800" ref={quoteRef}>
            <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                <div>
                    {settings?.logoUrl ? (
                        <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-16 object-contain mb-4" />
                    ) : (
                        <h1 className="text-2xl font-black text-slate-900 mb-2">{settings?.companyName || 'Transport Company'}</h1>
                    )}
                    <p className="text-slate-500 text-sm whitespace-pre-wrap">{[settings?.address?.street, settings?.address?.city].filter(Boolean).join(', ')}</p>
                    <p className="text-slate-500 text-sm mt-1">GSTIN: <span className="font-medium text-slate-700">{settings?.gstNumber || 'N/A'}</span></p>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-black text-blue-600 tracking-tight uppercase mb-4">Quotation</h2>
                    <p className="text-slate-500 text-sm mb-1">Reference No: <span className="font-bold text-slate-900">{quote.quoteNumber}</span></p>
                    <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(quote.createdAt).toLocaleDateString()}</span></p>
                    <p className="text-slate-500 text-sm">Valid Till: <span className="font-medium text-amber-600">{new Date(quote.validityDate || quote.validUntil).toLocaleDateString()}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-10">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Quotation For</p>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName}</h3>
                    <p className="text-slate-500 text-sm mb-1">{formatCustomerAddress(customer?.billingAddress, customer?.address)}</p>
                    <p className="text-slate-500 text-sm">GSTIN: <span className="font-medium text-slate-700">{customer?.gstNumber || 'URD'}</span></p>
                </div>
            </div>

            <table className="w-full mb-10 text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                        <th className="py-3 font-bold">Item & Description</th>
                        <th className="py-3 font-bold text-center">Qty</th>
                        <th className="py-3 font-bold text-right">Rate</th>
                        <th className="py-3 font-bold text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {quote.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                            <td className="py-4 font-medium text-slate-800 w-2/5">
                                {item.name || (item.itemId?.name)}
                                {item.itemId?.hsnCode && <p className="text-xs text-slate-400 mt-1 font-normal">HSN: {item.itemId.hsnCode}</p>}
                            </td>
                            <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                            <td className="py-4 text-right text-slate-600">₹{(item.rate || 0).toFixed(2)}</td>
                            <td className="py-4 text-right font-medium text-slate-900">₹{(item.amount || 0).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end">
                <div className="w-1/3 space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                        <span>Sub Total</span>
                        <span className="font-medium text-slate-900">₹{(quote.subTotal || 0).toFixed(2)}</span>
                    </div>
                    {getViewerTaxBreakdown(quote).map((row, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                            <span>{row.label}</span>
                            <span>₹{(row.amount || 0).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-3 mt-3">
                        <span>Estimate Total</span>
                        <span className="text-blue-600">₹{(quote.grandTotal || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {quote.notes && (
                <div className="mt-10 pt-6 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 mb-1">Customer Notes</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{quote.notes}</p>
                </div>
            )}

            {quote.includeTerms !== false && quote.termsAndConditions && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 mb-1">Terms & Conditions</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{quote.termsAndConditions}</p>
                </div>
            )}

            {quote.includeBankDetails !== false && settings?.bankDetails && (
                <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-600">
                    <p className="font-semibold text-slate-800 mb-1">Bank Details</p>
                    <p>Bank: {settings.bankDetails.bankName}</p>
                    <p>Account Name: {settings.bankDetails.accountName}</p>
                    <p>Account Number: {settings.bankDetails.accountNumber}</p>
                    <p>IFSC Code: {settings.bankDetails.ifscCode}</p>
                </div>
            )}

            {quote.includeUpiQr !== false && settings?.upiId && (
                <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-600">
                    <p className="font-semibold text-slate-800 mb-1">UPI ID</p>
                    <p>{settings.upiId}</p>
                </div>
            )}

            {quote.includeSignature && (
                <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                    <div className="text-center">
                        <div className="border border-slate-200 rounded-lg p-2 w-48 h-20 flex items-center justify-center bg-slate-50 mb-2">
                            {settings?.signature ? (
                                <img src={getImageUrl(settings.signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="text-xs text-slate-400">Signature</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Authorized Signatory</p>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/quotations')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{quote.quoteNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm ${quote.status === 'Accepted' ? 'bg-emerald-500 text-white' : quote.status === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                                {quote.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Customer: <span className="text-slate-900">{customer?.companyName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate(`/quotations/${quote._id}/edit`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Edit Quote">
                        <Edit size={20} />
                    </button>

                    <button onClick={handleDeleteQuote} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title="Delete Quote">
                        <Trash2 size={20} />
                    </button>

                    <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Print Quote">
                        <Printer size={20} />
                    </button>

                    <button onClick={handleSendEmail} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Share via Email">
                        <Mail size={20} />
                    </button>

                    {quote.status === 'Draft' && (
                        <button onClick={handleMarkAsSent} className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm shadow-md transition-all">
                            <Send size={18} /> Mark as Sent
                        </button>
                    )}

                    {(quote.status === 'Draft' || quote.status === 'Sent') && (
                        <>
                            <button onClick={handleAccept} className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg transition-all">
                                <Check size={18} /> Accept
                            </button>
                            <button onClick={handleReject} className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-sm shadow-lg transition-all">
                                <X size={18} /> Reject
                            </button>
                        </>
                    )}

                    {quote.status === 'Accepted' && (
                        <>
                            <button onClick={() => navigate(`/invoices/new?quoteId=${quote._id}`)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all">
                                <ClipboardList size={18} /> Convert to Invoice
                            </button>
                        </>
                    )}



                    <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-75">
                        {downloading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download size={18} /> Download
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-4xl">
                    <TemplateModern />
                </div>
            </div>

            <style jsx="true">{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .max-w-6xl { max-width: 100% !important; padding: 0 !important; }
                }
            `}</style>
        </div>
    );
};

export default QuotationViewer;
