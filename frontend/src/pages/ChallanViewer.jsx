import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { API_URL } from '../utils/api';
import { ArrowLeft, Download, Share2, Printer, Edit, Trash2, Mail, Copy } from 'lucide-react';
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

const ChallanViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [challanData, setChallanData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const quoteRef = useRef(null);

    const handleDeleteChallan = async () => {
        if (window.confirm("Are you sure you want to permanently delete this challan? This will restore stock inventory.")) {
            try {
                await axios.delete(`/api/challans/${id}`);
                showToast("Challan deleted successfully.", "success");
                navigate('/challans');
            } catch (err) {
                console.error("Error deleting challan", err);
                showToast(err.response?.data?.message || "Failed to delete challan.", "error");
            }
        }
    };

    useEffect(() => {
        const fetchChallan = async () => {
            try {
                const res = await axios.get(`/api/public/challans/${id}`);
                setChallanData(res.data.data);
            } catch (err) {
                console.error("Error fetching challan", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChallan();
    }, [id]);

    const handleDownloadPDF = () => {
        const token = localStorage.getItem('token')
            || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
            || '';
        window.location.href = `${API_URL}/api/challans/${id}/download?token=${token}`;
        showToast('PDF download started!', 'success');
    };

    const openEmailModal = () => {
        if (!challanData) return;
        const { challan, settings } = challanData;
        const customer = challan.customerId;
        
        setEmailTo(customer?.email || '');
        setEmailSubject(`Delivery Challan ${challan.challanNumber} from ${settings?.companyName || 'Prolync Billing'}`);
        setEmailMessage(`Hello ${customer?.companyName || customer?.name || 'Customer'},\n\nPlease find attached Delivery Challan ${challan.challanNumber}.\n\nThank you,\n${settings?.companyName || 'Prolync Billing'}`);
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

            await axios.post(`/api/challans/${id}/send`, {
                to: emailTo,
                subject: emailSubject,
                message: emailMessage
            }, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            showToast('Challan email sent successfully!', 'success');
            setIsEmailModalOpen(false);
        } catch (err) {
            console.error('Email send failed:', err);
            alert(err.response?.data?.message || 'Failed to send email. Please check your SMTP configuration in backend .env');
        } finally {
            setSendingEmail(false);
        }
    };



    const handleCopyDetails = () => {
        if (!challanData) return;
        const { challan } = challanData;
        const text = `Challan: ${challan.challanNumber}\nCustomer: ${challan.customerId?.companyName || challan.customerId?.name || 'Customer'}\nAmount: ₹${(challan.grandTotal || 0).toFixed(2)}`;
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('Challan details copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Failed to copy', err);
            });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Challan Viewer...</div>;
    if (!challanData) return <div className="p-8 text-center text-red-500">Challan not found.</div>;

    const { challan, settings } = challanData;
    const customer = challan.customerId;

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/challans')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{challan.challanNumber}</h1>
                            <span className="text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm bg-blue-500 text-white">
                                {challan.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Recipient: <span className="text-slate-900">{customer?.companyName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate(`/challans/${challan._id}/edit`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Edit Challan">
                        <Edit size={20} />
                    </button>

                    <button onClick={handleDeleteChallan} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title="Delete Challan">
                        <Trash2 size={20} />
                    </button>

                    <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Print">
                        <Printer size={20} />
                    </button>

                    <button onClick={handleCopyDetails} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Copy Details">
                        <Copy size={20} />
                    </button>

                    <button onClick={openEmailModal} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Send Email">
                        <Mail size={20} />
                    </button>



                    <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all">
                        <Download size={18} /> {downloading ? 'Downloading...' : 'Download'}
                    </button>
                </div>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-4xl bg-white p-12 rounded-xl shadow-sm border border-slate-200 font-sans text-slate-800" ref={quoteRef}>
                    <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                        <div>
                            {settings?.logoUrl ? (
                                <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="h-16 object-contain mb-4" />
                            ) : (
                                <h1 className="text-2xl font-black text-slate-900 mb-2">{settings?.companyName || 'Transport Company'}</h1>
                            )}
                            <p className="text-slate-500 text-sm">{[settings?.address?.street, settings?.address?.city].filter(Boolean).join(', ')}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-black text-blue-500 tracking-tight uppercase mb-4">Delivery Challan</h2>
                            <p className="text-slate-500 text-sm mb-1">Challan No: <span className="font-bold text-slate-900">{challan.challanNumber}</span></p>
                            <p className="text-slate-500 text-sm mb-1">Type: <span className="font-bold text-slate-900">{challan.challanType || 'Supply'}</span></p>
                            <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(challan.date || challan.createdAt).toLocaleDateString()}</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Deliver To</p>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName}</h3>
                            <p className="text-slate-500 text-sm">{formatCustomerAddress(customer?.billingAddress, customer?.address)}</p>
                        </div>
                        {(challan.transportDetails?.vehicleNumber || challan.vehicleNumber) && (
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Transport Info</p>
                                <p className="text-slate-700 text-sm">Vehicle No: <span className="font-bold">{challan.transportDetails?.vehicleNumber || challan.vehicleNumber}</span></p>
                                {challan.transportDetails?.driverName && <p className="text-slate-700 text-sm mt-0.5">Driver: <span className="font-medium">{challan.transportDetails?.driverName}</span></p>}
                                {challan.transportDetails?.route && <p className="text-slate-700 text-sm mt-0.5">Route: <span className="font-medium">{challan.transportDetails?.route}</span></p>}
                            </div>
                        )}
                    </div>

                    <table className="w-full mb-6 text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                                <th className="py-3 font-bold w-4/12">Item Description</th>
                                <th className="py-3 font-bold text-center w-2/12">Quantity</th>
                                <th className="py-3 font-bold text-right w-2/12">Rate</th>
                                <th className="py-3 font-bold text-right w-2/12">GST</th>
                                <th className="py-3 font-bold text-right w-2/12">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {challan.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-4 font-medium text-slate-800">{item.name || (item.itemId?.name)}</td>
                                    <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-4 text-right text-slate-600">₹{(item.rate || 0).toFixed(2)}</td>
                                    <td className="py-4 text-right text-slate-600">{item.gstPercent ?? item.gstPercentage ?? 0}%</td>
                                    <td className="py-4 text-right font-semibold text-slate-800">₹{(item.amount || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end mb-10">
                        <div className="w-80 bg-slate-50 rounded-xl p-5 border border-slate-200">
                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <span>Sub Total</span>
                                    <span className="font-semibold text-slate-900">₹{(challan.subtotal || 0).toFixed(2)}</span>
                                </div>
                                {getViewerTaxBreakdown(challan).map((row, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{row.label}</span>
                                        <span className="font-semibold text-slate-900">₹{(row.amount || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-base text-slate-900">
                                    <span>Grand Total</span>
                                    <span className="text-blue-600">₹{(challan.grandTotal || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {(challan.notes || (challan.includeTerms !== false && challan.termsAndConditions)) && (
                        <div className="grid grid-cols-2 gap-8 text-xs mb-10 border-t border-slate-100 pt-6">
                            {challan.notes && (
                                <div>
                                    <p className="font-bold text-slate-405 text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                                    <p className="text-slate-600 whitespace-pre-wrap">{challan.notes}</p>
                                </div>
                            )}
                            {(challan.includeTerms !== false && challan.termsAndConditions) && (
                                <div>
                                    <p className="font-bold text-slate-405 text-slate-500 uppercase tracking-wider mb-1">Terms & Conditions</p>
                                    <p className="text-slate-600 whitespace-pre-wrap">{challan.termsAndConditions}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {challan.includeBankDetails !== false && settings?.bankDetails?.accountNumber && (
                        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                            <p className="font-bold text-slate-700 uppercase mb-1">Bank Details</p>
                            <p>Bank: {settings.bankDetails.bankName}</p>
                            <p>Account Name: {settings.bankDetails.accountName}</p>
                            <p>Account Number: {settings.bankDetails.accountNumber}</p>
                            <p>IFSC Code: {settings.bankDetails.ifscCode}</p>
                        </div>
                    )}

                    {challan.includeUpiQr !== false && settings?.upiId && (
                        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                            <p className="font-bold text-slate-700 uppercase mb-1">UPI ID</p>
                            <p>{settings.upiId}</p>
                        </div>
                    )}

                    {challan.includeSignature ? (
                        <div className="mt-16 flex justify-end">
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
                    ) : (
                        <div className="mt-20 flex justify-between">
                            <div className="text-center">
                                <div className="w-40 border-b border-slate-300 mb-2"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Received By</p>
                            </div>
                            <div className="text-center">
                                <div className="w-40 border-b border-slate-300 mb-2"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase">For {settings?.companyName}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Email Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in no-print">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all scale-100 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Send Delivery Challan via Email</h3>
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
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
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
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
                                <textarea
                                    value={emailMessage}
                                    onChange={e => setEmailMessage(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none resize-none"
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
                                className="px-5 py-2.5 text-white bg-blue-600 rounded-xl font-bold text-sm shadow-md transition-all hover:bg-blue-700 disabled:opacity-75 flex items-center gap-2"
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

export default ChallanViewer;
