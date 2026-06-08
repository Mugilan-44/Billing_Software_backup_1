import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../utils/api';
import { API_URL } from '../utils/api';
import { ArrowLeft, Download, Share2, Edit, Mail, Printer, FileCheck, Trash2 } from 'lucide-react';
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

const SalesOrderViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [orderData, setOrderData] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const quoteRef = useRef(null);

    const handleDeleteOrder = async () => {
        if (window.confirm("Are you sure you want to permanently delete this sales order?")) {
            try {
                await axios.delete(`/api/sales-orders/${id}`);
                alert("Sales Order deleted successfully.");
                navigate('/orders');
            } catch (err) {
                console.error("Error deleting sales order", err);
                alert(err.response?.data?.message || "Failed to delete sales order.");
            }
        }
    };

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await axios.get(`/api/public/orders/${id}`);
                setOrderData(res.data.data);
            } catch (err) {
                console.error("Error fetching order", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const handleDownloadPDF = () => {
        setDownloading(true);
        const token = localStorage.getItem('token')
            || (() => { try { return JSON.parse(localStorage.getItem('user'))?.token; } catch { return ''; } })()
            || '';
        window.location.href = `${API_URL}/api/sales-orders/${id}/download?token=${token}`;
        showToast('PDF download started!', 'success');
        setTimeout(() => {
            setDownloading(false);
        }, 3000);
    };

    const handleSendEmail = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/sales-orders/${id}/send`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            alert('Sales Order emailed successfully!');
        } catch (err) {
            console.error('Email send failed:', err);
            handleShareEmail();
        }
    };

    const handleShareEmail = () => {
        const link = `${window.location.origin}/public/order/${id}`;
        const subject = `Sales Order ${orderData.order.orderNumber} from ${orderData.settings?.companyName || 'Billing System'}`;
        const body = `Hello ${orderData.order.customerId?.companyName || 'Customer'},\n\nPlease find our sales order (${orderData.order.orderNumber}) for the amount of ₹${orderData.order.grandTotal.toFixed(2)}.\n\nYou can view it here: ${link}\n\nBest regards,\n${orderData.settings?.companyName || 'Sales Team'}`;
        window.location.href = `mailto:${orderData.order.customerId?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };



    if (loading) return <div className="p-8 text-center text-slate-500">Loading Order Viewer...</div>;
    if (!orderData) return <div className="p-8 text-center text-red-500">Order not found.</div>;

    const { order, settings } = orderData;
    const customer = order.customerId;

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4 font-sans text-slate-800">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/orders')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{order.orderNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm ${order.status === 'Confirmed' ? 'bg-emerald-500 text-white' : order.status === 'Cancelled' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                                {order.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Customer: <span className="text-slate-900">{customer?.companyName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate(`/orders/${order._id}/edit`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Edit Sales Order">
                        <Edit size={20} />
                    </button>

                    <button onClick={handleDeleteOrder} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title="Delete Sales Order">
                        <Trash2 size={20} />
                    </button>

                    <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Print Sales Order">
                        <Printer size={20} />
                    </button>

                    <button onClick={handleSendEmail} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Share via Email">
                        <Mail size={20} />
                    </button>



                    <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all disabled:opacity-75">
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
                <div className="w-full max-w-4xl bg-white p-12 rounded-xl shadow-sm border border-slate-200" ref={quoteRef}>
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
                            <h2 className="text-4xl font-black text-purple-600 tracking-tight uppercase mb-4">Sales Order</h2>
                            <p className="text-slate-500 text-sm mb-1">Order No: <span className="font-bold text-slate-900">{order.orderNumber}</span></p>
                            <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(order.createdAt).toLocaleDateString()}</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Order For</p>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName}</h3>
                            <p className="text-slate-500 text-sm">{formatCustomerAddress(customer?.billingAddress, customer?.address)}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            {order.buyersRef && (
                                <p className="text-slate-500 text-sm">
                                    Buyer's Ref: <span className="font-bold text-slate-900">{order.buyersRef}</span>
                                </p>
                            )}
                            {order.modeOfPayment && (
                                <p className="text-slate-500 text-sm">
                                    Payment Mode: <span className="font-medium text-slate-900">{order.modeOfPayment}</span>
                                </p>
                            )}
                            {order.expectedDeliveryDate && (
                                <p className="text-slate-500 text-sm">
                                    Expected Delivery: <span className="font-medium text-slate-900">{new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <table className="w-full mb-10 text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                                <th className="py-3 font-bold">Item</th>
                                <th className="py-3 font-bold text-center">Qty</th>
                                <th className="py-3 font-bold text-right">Rate</th>
                                <th className="py-3 font-bold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {order.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-4 font-medium text-slate-800">{item.name || (item.itemId?.name)}</td>
                                    <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-4 text-right text-slate-600">₹{(item.rate || 0).toFixed(2)}</td>
                                    <td className="py-4 text-right font-medium text-slate-900">₹{(item.amount || (item.quantity * item.rate) || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end">
                        <div className="w-1/3 space-y-3 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Sub Total</span>
                                <span className="font-medium text-slate-900">₹{(order.subTotal || order.subtotal || 0).toFixed(2)}</span>
                            </div>
                             {getViewerTaxBreakdown(order).map((row, idx) => (
                                <div key={idx} className="flex justify-between text-slate-600">
                                    <span>{row.label}</span>
                                    <span>₹{(row.amount || 0).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-3 mt-3">
                                <span>Order Total</span>
                                <span className="text-purple-600">₹{(order.grandTotal || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {order.notes && (
                        <div className="mt-10 pt-6 border-t border-slate-100">
                            <p className="text-sm font-semibold text-slate-800 mb-1">Customer Notes</p>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
                        </div>
                    )}

                    {order.includeTerms !== false && order.termsAndConditions && (
                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <p className="text-sm font-semibold text-slate-800 mb-1">Terms & Conditions</p>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.termsAndConditions}</p>
                        </div>
                    )}

                    {order.includeBankDetails !== false && settings?.bankDetails && (
                        <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-600">
                            <p className="font-semibold text-slate-800 mb-1">Bank Details</p>
                            <p>Bank: {settings.bankDetails.bankName}</p>
                            <p>Account Name: {settings.bankDetails.accountName}</p>
                            <p>Account Number: {settings.bankDetails.accountNumber}</p>
                            <p>IFSC Code: {settings.bankDetails.ifscCode}</p>
                        </div>
                    )}

                    {order.includeUpiQr !== false && settings?.upiId && (
                        <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-600">
                            <p className="font-semibold text-slate-800 mb-1">UPI ID</p>
                            <p>{settings.upiId}</p>
                        </div>
                    )}

                    {order.includeSignature && (
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
            </div>

            <style jsx="true">{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
};

export default SalesOrderViewer;
