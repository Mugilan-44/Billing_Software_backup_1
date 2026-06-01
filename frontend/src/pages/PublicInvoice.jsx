import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/api';
import { Download, FileText, CheckCircle } from 'lucide-react';

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

const PublicInvoice = () => {
    const { id } = useParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await axios.get(`/api/public/invoices/${id}`);
                setInvoiceData(res.data.data);
            } catch (err) {
                setError('Invoice not found or access denied.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [id]);

    const handleDownloadPDF = () => {
        window.location.href = `/api/public/invoices/${id}/download`;
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-500">Loading Invoice...</div>;
    if (error) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-red-500 font-medium">{error}</div>;

    const { invoice, settings } = invoiceData;
    const { customerId: customer } = invoice;

    return (
        <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center print:hidden">
                    <h1 className="text-xl font-bold flex items-center text-gray-800">
                        <FileText className="mr-2 text-primary-600" /> Invoice {invoice.invoiceNumber}
                    </h1>
                    <button onClick={handleDownloadPDF} className="btn-primary flex items-center shadow-lg">
                        <Download size={18} className="mr-2" /> Download Document
                    </button>
                </div>

                {invoice.status === 'Paid' && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center max-w-4xl print:hidden">
                        <CheckCircle size={24} className="mr-3 text-green-600" />
                        <div>
                            <h4 className="font-bold">This invoice is marked as PAID</h4>
                            <p className="text-sm">Thank you for your payment!</p>
                        </div>
                    </div>
                )}

                <div className="bg-white p-10 rounded-xl shadow-xl border border-gray-200 print:shadow-none print:border-none print:p-0">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
                        <div>
                            {settings?.logoUrl ? (
                                <img src={`${settings.logoUrl}`} alt="Company Logo" className="h-16 object-contain mb-4" />
                            ) : (
                                <h1 className="text-2xl font-black text-gray-900 mb-2">{settings?.companyName || 'Transport Company'}</h1>
                            )}
                            <p className="text-gray-600 text-sm whitespace-pre-wrap">{[settings?.address?.street, settings?.address?.city, settings?.address?.state].filter(Boolean).join(', ')}</p>
                            <p className="text-gray-600 text-sm">GSTIN: <span className="font-medium text-gray-800">{settings?.gstNumber || 'N/A'}</span></p>
                            <p className="text-gray-600 text-sm">Email: {settings?.email || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-black text-primary-900 tracking-tight uppercase mb-4">Tax Invoice</h2>
                            <p className="text-gray-600 text-sm mb-1">Invoice No: <span className="font-bold text-gray-900">{invoice.invoiceNumber}</span></p>
                            <p className="text-gray-600 text-sm mb-1">Date: <span className="font-medium text-gray-900">{new Date(invoice.date).toLocaleDateString()}</span></p>
                            {invoice.dueDate && <p className="text-gray-600 text-sm">Due Date: <span className="font-medium text-red-600">{new Date(invoice.dueDate).toLocaleDateString()}</span></p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Billed To</p>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{customer?.companyName}</h3>
                            {invoice.billingAddress ? (
                                <p className="text-gray-600 text-sm mb-1 whitespace-pre-wrap">{invoice.billingAddress}</p>
                            ) : (
                                formatCustomerAddress(customer?.billingAddress, customer?.address) && (
                                    <p className="text-gray-600 text-sm mb-1">
                                        {formatCustomerAddress(customer?.billingAddress, customer?.address)}
                                    </p>
                                )
                            )}
                            <p className="text-gray-600 text-sm">GSTIN: <span className="font-medium">{customer?.gstNumber || 'URD'}</span></p>
                        </div>
                        {invoice.transportDetails?.vehicleNumber && (
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dispatch Details</p>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-1 text-sm">
                                    <p className="text-gray-600">Vehicle: <span className="font-bold text-gray-900">{invoice.transportDetails.vehicleNumber}</span></p>
                                    <p className="text-gray-600">Route: <span className="font-medium text-gray-900">{invoice.transportDetails.route || 'N/A'}</span></p>
                                    {invoice.transportDetails.tripDate && <p className="text-gray-600">Trip Date: <span className="font-medium text-gray-900">{new Date(invoice.transportDetails.tripDate).toLocaleDateString()}</span></p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <table className="w-full mb-10 text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-primary-800 text-primary-900 text-sm">
                                <th className="py-3 font-bold">Item & Description</th>
                                <th className="py-3 font-bold text-center">Qty</th>
                                <th className="py-3 font-bold text-right">Rate</th>
                                <th className="py-3 font-bold text-center">GST</th>
                                <th className="py-3 font-bold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {invoice.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-100">
                                    <td className="py-4 font-medium text-gray-800 w-2/5">
                                        {item.name || (item.itemId ? item.itemId.name : 'Item')}
                                        {(item.hsnCode || item.itemId?.hsnCode) && <p className="text-xs text-gray-400 mt-1 font-normal">HSN: {item.hsnCode || item.itemId.hsnCode}</p>}
                                    </td>
                                    <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                    <td className="py-4 text-right text-gray-600">{settings?.currency?.symbol || '₹'}{item.rate.toFixed(2)}</td>
                                    <td className="py-4 text-center text-gray-600">{item.gstPercentage}%</td>
                                    <td className="py-4 text-right font-medium text-gray-900">{settings?.currency?.symbol || '₹'}{item.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals & Bank Details */}
                    <div className="grid grid-cols-2 gap-12">
                        {/* Bank Info */}
                        <div>
                            {settings?.bankDetails?.accountNumber ? (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Details</p>
                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700">
                                        <p className="mb-1"><strong>Bank:</strong> {settings.bankDetails.bankName}</p>
                                        <p className="mb-1"><strong>Account Name:</strong> {settings.bankDetails.accountName}</p>
                                        <p className="mb-1"><strong>Account No:</strong> {settings.bankDetails.accountNumber}</p>
                                        <p><strong>IFSC:</strong> {settings.bankDetails.ifscCode}</p>
                                    </div>
                                </div>
                            ) : <div />}
                        </div>

                        {/* Summary */}
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Sub Total</span>
                                <span className="font-medium text-gray-900">{settings?.currency?.symbol || '₹'}{invoice.subTotal.toFixed(2)}</span>
                            </div>
                            {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                                <div className="flex justify-between text-red-500">
                                    <span>Discount (-)</span>
                                    <span className="font-medium">-{settings?.currency?.symbol || '₹'}{(invoice.discount || invoice.discountAmount).toFixed(2)}</span>
                                </div>
                            )}
                            {((invoice.taxAmount ?? invoice.taxTotal?.totalTax ?? (invoice.cgst + invoice.sgst) ?? 0) > 0) && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Total Value Added Tax (GST)</span>
                                    <span className="font-medium text-gray-900">{settings?.currency?.symbol || '₹'}{(invoice.taxAmount ?? invoice.taxTotal?.totalTax ?? (invoice.cgst + invoice.sgst) ?? 0).toFixed(2)}</span>
                                </div>
                            )}
                            {invoice.roundOff !== 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Round Off</span>
                                    <span className="font-medium text-gray-900">{settings?.currency?.symbol || '₹'}{invoice.roundOff.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-4 border-t border-gray-200 text-lg">
                                <span className="font-bold text-gray-900">Grand Total</span>
                                <span className="font-black text-primary-700">{settings?.currency?.symbol || '₹'}{invoice.grandTotal.toFixed(2)}</span>
                            </div>
                            {invoice.amountPaid > 0 && (
                                <div className="flex justify-between text-green-600 bg-green-50 p-2 rounded -mx-2 mt-2">
                                    <span className="font-medium">Amount Paid</span>
                                    <span className="font-bold">{settings?.currency?.symbol || '₹'}{invoice.amountPaid.toFixed(2)}</span>
                                </div>
                            )}
                            {['Partially Paid', 'Sent'].includes(invoice.status) && (
                                <div className="flex justify-between text-red-600 font-medium pt-2">
                                    <span>Balance Due</span>
                                    <span className="font-bold">{settings?.currency?.symbol || '₹'}{(invoice.grandTotal - invoice.amountPaid).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicInvoice;
