import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, CreditCard, Trash2 } from 'lucide-react';

const InputRow = ({ label, required, children }) => (
    <div className="flex items-start py-3 border-b border-slate-100 last:border-0">
        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex-1">{children}</div>
    </div>
);

const PaymentForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const queryInvoiceId = searchParams.get('invoiceId') || '';
    const queryCustomerId = searchParams.get('customerId') || '';
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);

    const handleDeletePayment = async () => {
        if (window.confirm("Are you sure you want to permanently delete this payment? This will reverse invoice payments and customer outstanding balances.")) {
            try {
                await axios.delete(`/api/payments/${id}`);
                alert("Payment deleted successfully.");
                navigate('/payments');
            } catch (err) {
                console.error("Error deleting payment", err);
                alert(err.response?.data?.message || "Failed to delete payment.");
            }
        }
    };
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        customerId: '',
        invoiceId: '',
        amount: '',
        paymentMode: 'Bank',
        referenceNumber: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
        thankYouNote: 'Thank you for your business!'
    });

    useEffect(() => {
        fetchInitialData();
        if (isEdit) {
            fetchPayment();
        } else {
            setForm(prev => ({
                ...prev,
                customerId: queryCustomerId,
                invoiceId: queryInvoiceId
            }));
        }
    }, [id, queryCustomerId, queryInvoiceId]);

    const fetchInitialData = async () => {
        try {
            const [custRes, invRes] = await Promise.all([
                axios.get('/api/customers'),
                axios.get('/api/invoices')
            ]);
            setCustomers(custRes.data.data);
            const loadedInvoices = invRes.data.data;
            setInvoices(loadedInvoices);

            // Prefill amount if we are creating a new payment and invoiceId is in query
            if (!isEdit && queryInvoiceId) {
                const inv = loadedInvoices.find(i => i._id === queryInvoiceId);
                if (inv) {
                    setForm(prev => ({
                        ...prev,
                        customerId: queryCustomerId || (inv.customerId?._id || inv.customerId || ''),
                        invoiceId: queryInvoiceId,
                        amount: (inv.grandTotal || 0) - (inv.amountPaid || 0)
                    }));
                }
            }
        } catch (err) {
            console.error('Error fetching data', err);
        }
    };

    const fetchPayment = async () => {
        try {
            const res = await axios.get(`/api/payments/${id}`);
            const p = res.data.data;
            setForm({
                customerId: p.customerId?._id || p.customerId || '',
                invoiceId: p.invoiceId?._id || p.invoiceId || '',
                amount: p.amount || '',
                paymentMode: p.paymentMode === 'Bank Transfer' ? 'Bank' : (p.paymentMode === 'UPI / QR' ? 'UPI' : (p.paymentMode || 'Bank')),
                referenceNumber: p.referenceNumber || '',
                paymentDate: p.paymentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                notes: p.notes || '',
                thankYouNote: p.thankYouNote || 'Thank you for your business!'
            });
        } catch (err) {
            console.error('Error fetching payment', err);
            setError('Failed to load payment details.');
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };

            // Auto-fill amount if invoice is selected
            if (field === 'invoiceId' && value) {
                const inv = invoices.find(i => i._id === value);
                if (inv) {
                    next.amount = (inv.grandTotal || 0) - (inv.amountPaid || 0);
                }
            }

            // Clear invoice if customer changes
            if (field === 'customerId') {
                next.invoiceId = '';
            }

            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.customerId) return setError('Customer is required');
        if (!form.amount || Number(form.amount) <= 0) return setError('Valid amount is required');

        setLoading(true);
        setError('');
        try {
            if (isEdit) {
                await axios.put(`/api/payments/${id}`, form);
                setSuccess('Payment updated successfully!');
            } else {
                await axios.post('/api/payments', form);
                setSuccess('Payment recorded successfully!');
            }
            setTimeout(() => navigate('/payments'), 800);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save payment');
            setLoading(false);
        }
    };

    const availableInvoices = invoices.filter(
        i => (i.customerId?._id || i.customerId) === form.customerId && i.status !== 'Paid'
    );

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/payments')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            {isEdit ? 'Edit Payment' : 'Record Payment'}
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {isEdit ? 'Update payment receipt' : 'Record a new payment from customer'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isEdit && (
                        <button type="button" onClick={handleDeletePayment} className="p-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Delete Payment">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button type="button" onClick={() => navigate('/payments')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={loading}
                        className="btn-primary px-6 flex items-center gap-2">
                        <Save size={18} />
                        {loading ? 'Saving...' : (isEdit ? 'Update Payment' : 'Record Payment')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="px-6 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium">
                    {error}
                </div>
            )}
            {success && (
                <div className="px-6 py-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm font-medium">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white">
                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100">
                    <h3 className="text-base font-semibold text-slate-800 pb-4 flex items-center gap-2">
                        <CreditCard size={18} className="text-slate-400" /> Payment Details
                    </h3>

                    <InputRow label="Customer Name" required>
                        <select
                            className="input-field max-w-md"
                            value={form.customerId}
                            onChange={e => handleChange('customerId', e.target.value)}
                            required
                        >
                            <option value="">Select a Customer</option>
                            {customers.map(c => (
                                <option key={c._id} value={c._id}>
                                    {c.companyName} (Due: ₹{c.outstandingBalance?.toFixed(2) || 0})
                                </option>
                            ))}
                        </select>
                    </InputRow>

                    <InputRow label="Apply to Invoice">
                        <select
                            className="input-field max-w-md"
                            value={form.invoiceId}
                            onChange={e => handleChange('invoiceId', e.target.value)}
                            disabled={!form.customerId}
                        >
                            <option value="">None (Advance Payment)</option>
                            {availableInvoices.map(inv => (
                                <option key={inv._id} value={inv._id}>
                                    {inv.invoiceNumber} - Due: ₹{((inv.grandTotal || 0) - (inv.amountPaid || 0)).toFixed(2)}
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Leaves empty for advance payment</p>
                    </InputRow>

                    <InputRow label="Amount Received (₹)" required>
                        <div className="relative max-w-xs">
                            <span className="absolute left-3 top-2 text-green-600 font-bold">₹</span>
                            <input
                                type="number"
                                step="0.01"
                                className="input-field pl-8 text-lg font-bold text-green-700"
                                value={form.amount}
                                onChange={e => handleChange('amount', e.target.value)}
                                required
                            />
                        </div>
                    </InputRow>

                    <InputRow label="Payment Date" required>
                        <input
                            type="date"
                            className="input-field max-w-xs"
                            value={form.paymentDate}
                            onChange={e => handleChange('paymentDate', e.target.value)}
                            required
                        />
                    </InputRow>

                    <InputRow label="Payment Mode">
                        <select
                            className="input-field max-w-xs"
                            value={form.paymentMode}
                            onChange={e => handleChange('paymentMode', e.target.value)}
                        >
                            <option value="Bank">Bank Transfer (NEFT/RTGS)</option>
                            <option value="UPI">UPI / QR</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </InputRow>

                    <InputRow label="Reference #">
                        <input
                            type="text"
                            className="input-field max-w-md"
                            value={form.referenceNumber}
                            onChange={e => handleChange('referenceNumber', e.target.value)}
                            placeholder="UTR / Txn ID / Cheque #"
                        />
                    </InputRow>

                    <InputRow label="Internal Notes">
                        <textarea
                            className="input-field max-w-md h-20 resize-none"
                            value={form.notes}
                            onChange={e => handleChange('notes', e.target.value)}
                            placeholder="Add internal notes about this payment..."
                        />
                    </InputRow>

                    <InputRow label="Thank You Note">
                        <input
                            type="text"
                            className="input-field max-w-md"
                            value={form.thankYouNote}
                            onChange={e => handleChange('thankYouNote', e.target.value)}
                            placeholder="e.g. Thank you for your business!"
                        />
                    </InputRow>
                </div>

                <div className="bg-slate-50/50 border-t border-slate-200 px-8 py-6 flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/payments')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="btn-primary px-10 shadow-sm">
                        {loading ? 'Processing...' : 'Record Payment'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PaymentForm;
