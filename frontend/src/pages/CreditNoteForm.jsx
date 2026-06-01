import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileMinus, Save, User, Calendar, FileText, Info, Plus, Trash2 } from 'lucide-react';
import SearchableDropdown from '../components/SearchableDropdown';

const InputRow = ({ label, required, children, helper, error }) => (
    <div className="flex items-start py-3 border-b border-slate-100 last:border-0 font-sans">
        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex-1">
            {children}
            {helper && <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">{helper}</p>}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    </div>
);

const CreditNoteForm = () => {
    const navigate = useNavigate();

    // Data sources
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [customerId, setCustomerId] = useState('');
    const [invoiceId, setInvoiceId] = useState('');
    const [reason, setReason] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    const [subject, setSubject] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [includeTerms, setIncludeTerms] = useState(true);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [includeBankDetails, setIncludeBankDetails] = useState(true);
    const [includeUpiQr, setIncludeUpiQr] = useState(true);
    
    // Line items returning
    const [lineItems, setLineItems] = useState([]);
    const [subTotal, setSubTotal] = useState(0);
    const [taxTotal, setTaxTotal] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [custRes, invRes] = await Promise.all([
                axios.get('/api/customers'),
                axios.get('/api/invoices')
            ]);
            setCustomers(custRes.data.data);
            setInvoices(invRes.data.data);
        } catch (err) {
            console.error('Error fetching data', err);
        }
    };

    // When invoice selection changes, fetch full details and populate items
    const handleInvoiceChange = async (invId) => {
        setInvoiceId(invId);
        if (!invId) {
            setLineItems([]);
            return;
        }
        try {
            setLoading(true);
            const res = await axios.get(`/api/invoices/${invId}`);
            const fullInvoice = res.data.data;
            
            // Auto fill fields
            if (fullInvoice.salesPerson) setSalesPerson(fullInvoice.salesPerson);
            
            // Populate returned items list with default return quantity
            if (fullInvoice.lineItems?.length > 0) {
                const items = fullInvoice.lineItems.map(i => {
                    const rate = i.rate || 0;
                    const qty = i.quantity || 0;
                    const disc = i.discountPercent || 0;
                    const gst = i.gstPercent || 0;
                    
                    const discAmt = rate * qty * (disc / 100);
                    const taxable = (rate * qty) - discAmt;
                    const gstAmt = taxable * (gst / 100);
                    const amount = taxable + gstAmt;
                    
                    return {
                        itemId: i.itemId?._id || i.itemId || '',
                        name: i.name || '',
                        quantity: qty,
                        rate,
                        discountPercent: disc,
                        gstPercent: gst,
                        amount
                    };
                });
                setLineItems(items);
            }
        } catch (err) {
            console.error('Error loading invoice details', err);
            setError('Failed to load line items from selected invoice.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals whenever items list changes
    useEffect(() => {
        let sub = 0;
        let tax = 0;
        lineItems.forEach(item => {
            const discAmt = item.rate * item.quantity * (item.discountPercent / 100);
            const taxable = (item.rate * item.quantity) - discAmt;
            const gstAmt = taxable * (item.gstPercent / 100);
            sub += taxable;
            tax += gstAmt;
        });
        setSubTotal(sub);
        setTaxTotal(tax);
        setGrandTotal(sub + tax);
    }, [lineItems]);

    const handleItemQtyChange = (idx, qtyVal) => {
        const updated = [...lineItems];
        const qty = Number(qtyVal) || 0;
        updated[idx].quantity = qty;
        
        const rate = updated[idx].rate;
        const disc = updated[idx].discountPercent;
        const gst = updated[idx].gstPercent;
        
        const discAmt = rate * qty * (disc / 100);
        const taxable = (rate * qty) - discAmt;
        const gstAmt = taxable * (gst / 100);
        updated[idx].amount = taxable + gstAmt;
        
        setLineItems(updated);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!customerId) return setError('Customer is required');
        if (!invoiceId) return setError('Invoice is required');
        if (!reason) return setError('Reason for credit is required');
        if (grandTotal <= 0) return setError('Total credit amount must be greater than zero');

        setLoading(true);
        try {
            await axios.post('/api/credit-notes', {
                customerId,
                invoiceId,
                reason,
                amount: grandTotal,
                date,
                reference,
                salesPerson,
                subject,
                termsAndConditions,
                subTotal,
                taxTotal,
                lineItems,
                includeTerms,
                includeSignature,
                includeBankDetails,
                includeUpiQr
            });
            navigate('/credit-notes');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to issue Credit Note');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-red-50/30 border-b border-red-100 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/credit-notes')}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FileMinus className="text-red-500" size={20} />
                            Issue Credit Note
                        </h1>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Adjustments & Sales Returns</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/credit-notes')} className="btn-secondary border-red-100 hover:bg-red-50 text-red-600">
                        Cancel
                    </button>
                    <button type="submit" onClick={handleFormSubmit} disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-500/10">
                        <Save size={18} />
                        {loading ? 'Issuing...' : 'Issue Credit Note'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-6 mt-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm font-medium flex items-center gap-2">
                    <Info size={16} />
                    {error}
                </div>
            )}

            <form onSubmit={handleFormSubmit} className="bg-white">
                {/* Transaction Info */}
                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100">
                    <h3 className="text-base font-semibold text-slate-800 pb-4 flex items-center gap-2">
                        <User size={18} className="text-slate-400" /> Transaction details
                    </h3>

                    <InputRow label="Customer Name" required>
                        <SearchableDropdown
                            options={customers.map(c => c.companyName)}
                            value={customers.find(c => c._id === customerId)?.companyName || ''}
                            onChange={(name) => {
                                const cust = customers.find(c => c.companyName === name);
                                if (cust) {
                                    setCustomerId(cust._id);
                                    setInvoiceId('');
                                    setLineItems([]);
                                }
                            }}
                            placeholder="Select Customer"
                        />
                    </InputRow>

                    <InputRow label="Invoice Link" required helper="Select invoice to return items from">
                        <select
                            required
                            disabled={!customerId}
                            className="input-field max-w-md"
                            value={invoiceId}
                            onChange={(e) => handleInvoiceChange(e.target.value)}
                        >
                            <option value="">Select Invoice</option>
                            {invoices.filter(i => (i.customerId?._id || i.customerId) === customerId).map(inv => (
                                <option key={inv._id} value={inv._id}>
                                    #{inv.invoiceNumber} (Total: ₹{inv.grandTotal})
                                </option>
                            ))}
                        </select>
                    </InputRow>

                    <InputRow label="Credit Note Date" required>
                        <input
                            type="date"
                            className="input-field max-w-xs"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </InputRow>

                    <InputRow label="Reference #">
                        <input
                            type="text"
                            className="input-field max-w-md"
                            placeholder="e.g. REF-001"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                        />
                    </InputRow>

                    <InputRow label="Sales Person">
                        <input
                            type="text"
                            className="input-field max-w-md"
                            placeholder="Sales Executive Name"
                            value={salesPerson}
                            onChange={(e) => setSalesPerson(e.target.value)}
                        />
                    </InputRow>

                    <InputRow label="Subject">
                        <input
                            type="text"
                            className="input-field max-w-md"
                            placeholder="Brief reason or subject details"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </InputRow>
                </div>

                {/* Line Items Table */}
                {lineItems.length > 0 && (
                    <div className="border border-slate-200 rounded-lg bg-white mt-8 mx-8">
                        <div className="bg-slate-50/50 text-slate-800 font-bold text-xs px-4 py-3 border-b border-slate-200 uppercase tracking-wider">
                            Line Items Return quantities
                        </div>
                        <table className="w-full text-left table-fixed">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                    <th className="px-4 py-3 w-5/12">Item Description</th>
                                    <th className="px-4 py-3 w-2/12 text-right">Rate</th>
                                    <th className="px-4 py-3 w-2/12 text-right">GST %</th>
                                    <th className="px-4 py-3 w-2/12 text-right">Return Qty</th>
                                    <th className="px-4 py-3 w-2/12 text-right pr-6">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {lineItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/30">
                                        <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                                        <td className="p-3 text-right">₹{item.rate}</td>
                                        <td className="p-3 text-right">{item.gstPercent}%</td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full border-0 border-b border-slate-200 focus:ring-0 focus:border-red-500 text-right p-1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                                            />
                                        </td>
                                        <td className="p-3 text-right font-bold pr-6">₹{item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Notes, Terms & Recalculated Summary */}
                <div className="px-8 py-10 bg-slate-50/50 border-t border-slate-200 mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Notes and Terms Left */}
                        <div className="md:col-span-7 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason for Credit</label>
                                <textarea
                                    required
                                    className="input-field h-20 resize-none bg-white p-3 border-slate-200 focus:ring-red-500"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Add reason details..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Terms & Conditions</label>
                                <textarea
                                    className="input-field h-20 resize-none bg-white p-3 border-slate-200 focus:ring-red-500"
                                    value={termsAndConditions}
                                    onChange={(e) => setTermsAndConditions(e.target.value)}
                                    placeholder="Add standard terms of credit..."
                                />
                            </div>
                            <div className="flex flex-col gap-3 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={includeTerms}
                                        onChange={(e) => setIncludeTerms(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Include Terms & Conditions on Credit Note</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={includeSignature}
                                        onChange={(e) => setIncludeSignature(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Include Digital/Authorized Signature</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={includeBankDetails}
                                        onChange={(e) => setIncludeBankDetails(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Include Bank Details</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={includeUpiQr}
                                        onChange={(e) => setIncludeUpiQr(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Include UPI and QR Code</span>
                                </label>
                            </div>
                        </div>

                        {/* Recalculated Total Summary Right */}
                        <div className="md:col-span-5 bg-white border border-red-100 rounded-xl p-5 shadow-sm space-y-3.5 h-fit">
                            <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest pb-1 border-b border-slate-100">Credit Calculation Summary</h4>
                            
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Sub Total</span>
                                <span className="font-semibold text-slate-700">₹{subTotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Tax Total</span>
                                <span className="font-semibold text-slate-700">₹{taxTotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between text-sm font-extrabold text-red-600 pt-2 border-t border-slate-100">
                                <span>Amount to Credit</span>
                                <span>₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => navigate('/credit-notes')} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white px-10 py-2.5 rounded-lg font-bold shadow-lg shadow-red-500/10 transition-all active:scale-[0.98]">
                            {loading ? 'Issuing...' : 'Issue Credit Note'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreditNoteForm;
