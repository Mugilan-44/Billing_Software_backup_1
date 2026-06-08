import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { API_URL } from '../utils/api';
import { ArrowLeft, Download, Share2, Mail, Printer, Palette, Copy, AlertTriangle, Check, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getImageUrl, getViewerTaxBreakdown } from './InvoiceViewer';

// Color themes - credit notes default to red/orange tones or general settings
export const COLOR_THEMES = [
    { label: 'Crimson Red',  value: '#dc2626', light: '#fef2f2', border: '#fca5a5' },
    { label: 'Rose Return',  value: '#e11d48', light: '#fff1f2', border: '#fecdd3' },
    { label: 'Orange Return', value: '#ea580c', light: '#fff7ed', border: '#ffedd5' },
    { label: 'Charcoal Black', value: '#1e293b', light: '#f1f5f9', border: '#cbd5e1' },
    { label: 'Ocean Blue',   value: '#2563eb', light: '#eff6ff', border: '#bfdbfe' },
];

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

const CreditNoteViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [cnData, setCnData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accentColor, setAccentColor] = useState('#dc2626');
    const [downloading, setDownloading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [showColors, setShowColors] = useState(false);
    const printRef = useRef(null);

    useEffect(() => {
        const fetchCreditNoteAndSettings = async () => {
            try {
                const [cnRes, settingsRes] = await Promise.all([
                    axios.get(`/api/credit-notes/${id}`),
                    axios.get('/api/settings'),
                ]);
                const cn = cnRes.data.data;
                const settings = settingsRes.data.data;
                setCnData({ cn, settings });
            } catch (err) {
                console.error('Error fetching credit note', err);
                showToast('Failed to fetch credit note details.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCreditNoteAndSettings();
    }, [id]);

    const handleColorChange = (val) => {
        setAccentColor(val);
        setShowColors(false);
    };

    const handleUpdateStatus = async (newStatus) => {
        try {
            const token = localStorage.getItem('token')
                || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
                || '';

            await axios.put(`/api/credit-notes/${id}/status`, { status: newStatus }, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            showToast(`Credit Note marked as ${newStatus}!`, 'success');
            
            // Refetch
            const [cnRes, settingsRes] = await Promise.all([
                axios.get(`/api/credit-notes/${id}`),
                axios.get('/api/settings'),
            ]);
            setCnData({ cn: cnRes.data.data, settings: settingsRes.data.data });
        } catch (err) {
            console.error('Status update failed:', err);
            showToast(err.response?.data?.message || 'Failed to update status.', 'error');
        }
    };

    const handleDownloadPDF = () => {
        const token = localStorage.getItem('token')
            || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
            || '';
        window.location.href = `${API_URL}/api/credit-notes/${id}/download?token=${token}&color=${encodeURIComponent(accentColor)}`;
        showToast('PDF download started!', 'success');
    };

    const openEmailModal = () => {
        if (!cnData) return;
        const { cn, settings } = cnData;
        const customer = cn.customerId;
        
        setEmailTo(customer?.email || '');
        setEmailSubject(`Credit Note ${cn.cnNumber} from ${settings?.companyName || 'Prolync Billing'}`);
        setEmailMessage(`Hello ${customer?.companyName || customer?.name || 'Customer'},\n\nPlease find attached your Credit Note ${cn.cnNumber} for ₹${fmt(cn.amount)}.\n\nReason: ${cn.reason || 'Returns'}\n\nThank you,\n${settings?.companyName || 'Prolync Billing'}`);
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

            await axios.post(`/api/credit-notes/${id}/send?color=${encodeURIComponent(accentColor)}`, {
                to: emailTo,
                subject: emailSubject,
                message: emailMessage
            }, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            showToast('Credit Note email sent successfully!', 'success');
            setIsEmailModalOpen(false);
        } catch (err) {
            console.error('Email send failed:', err);
            alert(err.response?.data?.message || 'Failed to send email. Please check your SMTP configuration in backend .env');
        } finally {
            setSendingEmail(false);
        }
    };



    const handleCopyDetails = () => {
        if (!cnData) return;
        const { cn } = cnData;
        const text = `Credit Note: ${cn.cnNumber}\nCustomer: ${cn.customerId?.companyName || cn.customerId?.name || 'Customer'}\nAmount: ₹${fmt(cn.amount)}\nReason: ${cn.reason}`;
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('Credit Note details copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Failed to copy', err);
            });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Loading Credit Note...</p>
            </div>
        </div>
    );

    if (!cnData || !cnData.cn) return <div className="p-8 text-center text-red-500 font-semibold">Credit Note not found.</div>;

    const { cn, settings } = cnData;
    const customer = cn.customerId;
    const items = cn.items || cn.lineItems || [];

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-6 gap-4 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/credit-notes')} className="group p-3 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black text-slate-900">#{cn.cnNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase ${
                                cn.status === 'Open' ? 'bg-blue-500 text-white' :
                                cn.status === 'Refunded' ? 'bg-emerald-500 text-white' :
                                cn.status === 'Applied' ? 'bg-purple-500 text-white' :
                                'bg-slate-500 text-white'
                            }`}>
                                {cn.status || 'Open'}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm">{customer?.companyName || customer?.name}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Color picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColors(v => !v)}
                            className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 transition-all flex items-center gap-2"
                            title="Change Color Theme"
                        >
                            <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: accentColor }}></div>
                            <Palette size={16} className="text-slate-500" />
                        </button>
                        {showColors && (
                            <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-50 flex gap-2">
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

                    {cn.status === 'Open' && (
                        <>
                            <button onClick={() => handleUpdateStatus('Refunded')} className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all" title="Record Refund">
                                <Check size={14} /> Refund
                            </button>
                            <button onClick={() => handleUpdateStatus('Applied')} className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all" title="Apply to Invoice">
                                <Check size={14} /> Apply Credits
                            </button>
                        </>
                    )}

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    <button onClick={() => window.print()} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title="Print">
                        <Printer size={18} />
                    </button>
                    <button onClick={handleCopyDetails} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title="Copy Details">
                        <Copy size={18} />
                    </button>
                    <button onClick={openEmailModal} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title="Send Email">
                        <Mail size={18} />
                    </button>

                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium text-sm shadow-sm transition-all disabled:opacity-70"
                        style={{ backgroundColor: accentColor }}
                    >
                        {downloading
                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Downloading...</>
                            : <><Download size={16} /> Download PDF</>
                        }
                    </button>
                </div>
            </div>

            {/* ── Credit Note Preview (Beautiful template) ── */}
            <div className="flex justify-center">
                <div className="w-full max-w-4xl shadow-2xl bg-white p-10 rounded-xl border border-slate-200 font-sans" ref={printRef}>
                    <div className="flex justify-between items-start pb-8 mb-8" style={{ borderBottom: `3px solid ${accentColor}` }}>
                        <div>
                            {settings?.logoUrl
                                ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-16 object-contain mb-3" />
                                : <h1 className="text-2xl font-black mb-2" style={{ color: accentColor }}>{settings?.companyName || 'Company'}</h1>
                            }
                            {settings?.logoUrl && <h2 className="text-lg font-bold text-slate-800 mb-1">{settings?.companyName}</h2>}
                            <p className="text-slate-500 text-sm">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', ')}</p>
                            {settings?.gstNumber && <p className="text-slate-500 text-sm">GSTIN: <span className="font-semibold text-slate-700">{settings.gstNumber}</span></p>}
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-black uppercase tracking-tight mb-4" style={{ color: accentColor }}>Credit Note</h2>
                            <p className="text-slate-500 text-sm mb-1">CN No: <span className="font-bold text-slate-900">{cn.cnNumber}</span></p>
                            <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(cn.date).toLocaleDateString('en-IN')}</span></p>
                            {cn.invoiceId && (
                                <p className="text-slate-500 text-sm mb-1">Invoice Ref: <span className="font-semibold text-slate-950">{cn.invoiceId.invoiceNumber || 'N/A'}</span></p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accentColor }}>Billed To</p>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName || customer?.name}</h3>
                            {formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                                <p className="text-slate-500 text-sm">{formatCustomerAddress(customer.billingAddress, customer.address)}</p>
                            )}
                            {(customer?.gstNumber || customer?.gstin) && <p className="text-slate-500 text-sm mt-1">GSTIN: <span className="font-medium text-slate-700">{customer.gstNumber || customer.gstin}</span></p>}
                        </div>
                        <div className="text-right">
                            {cn.reference && <p className="text-sm text-slate-500">Reference: <span className="font-medium text-slate-800">{cn.reference}</span></p>}
                            {cn.salesPerson && <p className="text-sm text-slate-500">Sales Person: <span className="font-medium text-slate-800">{cn.salesPerson}</span></p>}
                        </div>
                    </div>

                    <table className="w-full mb-10 text-left border-collapse">
                        <thead>
                            <tr style={{ borderBottom: `2px solid ${accentColor}` }} className="text-sm">
                                <th className="py-3 font-bold text-slate-800">Item & Description</th>
                                <th className="py-3 font-bold text-center text-slate-800">Qty</th>
                                <th className="py-3 font-bold text-right text-slate-800">Rate</th>
                                <th className="py-3 font-bold text-center text-slate-800">GST%</th>
                                <th className="py-3 font-bold text-right text-slate-800">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                            {items.length > 0 ? (
                                items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 text-slate-800">
                                            <div className="font-medium">{resolveItemName(item)}</div>
                                            {item.description && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                                        </td>
                                        <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                                        <td className="py-3 text-right text-slate-600">₹{fmt(item.rate)}</td>
                                        <td className="py-3 text-center text-slate-600">{item.gstPercent || 0}%</td>
                                        <td className="py-3 text-right font-semibold text-slate-900">₹{fmt(resolveAmount(item))}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="py-4 text-slate-800">
                                        <div className="font-medium">{cn.subject || 'Credit Note adjustment'}</div>
                                        <div className="text-xs text-slate-400 font-normal mt-0.5">{cn.reason}</div>
                                    </td>
                                    <td className="py-4 text-center text-slate-600">1</td>
                                    <td className="py-4 text-right text-slate-600">₹{fmt(cn.subTotal || cn.amount)}</td>
                                    <td className="py-4 text-center text-slate-600">
                                        {cn.taxTotal ? Math.round((cn.taxTotal / (cn.subTotal || cn.amount)) * 100) : 0}%
                                    </td>
                                    <td className="py-4 text-right font-semibold text-slate-900">₹{fmt(cn.amount)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="grid grid-cols-2 gap-12">
                        <div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Reason for Credit</h4>
                                    <p className="text-sm text-red-700 whitespace-pre-wrap">{cn.reason}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Sub Total</span>
                                <span className="font-medium text-slate-900">₹{fmt(cn.subTotal || cn.amount)}</span>
                            </div>
                            {getViewerTaxBreakdown(cn).map((row, idx) => (
                                <div key={idx} className="flex justify-between text-slate-600">
                                    <span>{row.label}</span>
                                    <span className="font-medium text-slate-900">₹{fmt(row.amount)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-3 mt-3" style={{ color: accentColor }}>
                                <span>Total Credit</span>
                                <span>₹{fmt(cn.amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Block */}
                    <div className="mt-8 pt-6 border-t border-slate-200 text-left space-y-6">
                        {cn.notes && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{cn.notes}</p>
                            </div>
                        )}
                        {(cn.includeTerms !== false && cn.termsAndConditions) && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Terms & Conditions</p>
                                <p className="text-sm text-slate-500 whitespace-pre-wrap">{cn.termsAndConditions}</p>
                            </div>
                        )}
                        {cn.includeBankDetails !== false && settings?.bankDetails?.accountNumber && (
                            <div className="text-xs text-slate-505 text-slate-500 pt-4 border-t border-slate-100">
                                <p className="font-bold text-slate-700 uppercase mb-1">Bank Details</p>
                                <p>Bank: {settings.bankDetails.bankName}</p>
                                <p>Account Name: {settings.bankDetails.accountName}</p>
                                <p>Account Number: {settings.bankDetails.accountNumber}</p>
                                <p>IFSC Code: {settings.bankDetails.ifscCode}</p>
                            </div>
                        )}
                        {cn.includeUpiQr !== false && settings?.upiId && (
                            <div className="text-xs text-slate-505 text-slate-500 pt-4 border-t border-slate-100">
                                <p className="font-bold text-slate-700 uppercase mb-1">UPI ID</p>
                                <p>{settings.upiId}</p>
                            </div>
                        )}
                        {cn.includeSignature && (
                            <div className="pt-8 border-t border-slate-100 flex justify-end">
                                <div className="text-center">
                                    <div className="border border-slate-200 rounded-lg p-2 w-48 h-20 flex items-center justify-center bg-slate-50 mb-2">
                                        {settings?.signature ? (
                                            <img src={getImageUrl(settings.signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <span className="text-xs text-slate-400">Signature</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-505 text-slate-500 font-bold uppercase tracking-wider">Authorized Signatory</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Email Modal ── */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in no-print">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all scale-100 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Send Credit Note via Email</h3>
                                <p className="text-slate-500 text-xs mt-0.5">Customize details before sending</p>
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

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">To (Recipient Email)</label>
                                <input
                                    type="email"
                                    value={emailTo}
                                    onChange={e => setEmailTo(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none"
                                    placeholder="customer@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={e => setEmailSubject(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
                                <textarea
                                    value={emailMessage}
                                    onChange={e => setEmailMessage(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none resize-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={sendingEmail}
                                className="px-5 py-2.5 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:opacity-95 disabled:opacity-75 flex items-center gap-2"
                                style={{ backgroundColor: accentColor }}
                            >
                                {sendingEmail ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                                ) : (
                                    'Send Email'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditNoteViewer;
