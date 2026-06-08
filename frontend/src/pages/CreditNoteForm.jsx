import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileMinus, Search, Save, User, Calendar, FileText, Info } from 'lucide-react';
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
    const [formData, setFormData] = useState({
        customerId: '',
        invoiceId: '',
        reason: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

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
            console.error('Error fetching data');
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const selectedInvoice = invoices.find(inv => inv._id === formData.invoiceId);
        if (!selectedInvoice) {
            setError('Please select a valid invoice from the list');
            setLoading(false);
            return;
        }

        if (Number(formData.amount) > selectedInvoice.grandTotal) {
            setError(`Credit amount cannot exceed the invoice grand total of ₹${selectedInvoice.grandTotal}`);
            setLoading(false);
            return;
        }

        try {
            await axios.post('/api/credit-notes', {
                ...formData,
                amount: Number(formData.amount)
            });
            navigate('/credit-notes');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create Credit Note');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header - Red Themed for Credit Note */}
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
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Against Sales Return / Adjustments</p>
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
                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100">
                    <h3 className="text-base font-semibold text-slate-800 pb-4 flex items-center gap-2">
                        <User size={18} className="text-slate-400" /> Transaction Basis
                    </h3>

                    <InputRow label="Customer Name" required>
                        <SearchableDropdown
                            options={customers.map(c => c.companyName)}
                            value={customers.find(c => c._id === formData.customerId)?.companyName || ''}
                            onChange={(name) => {
                                const cust = customers.find(c => c.companyName === name);
                                if (cust) setFormData({ ...formData, customerId: cust._id, invoiceId: '' });
                            }}
                            placeholder="Search for a customer"
                        />
                    </InputRow>

                    <InputRow label="Credit Note Date" required>
                        <div className="flex items-center gap-2 max-w-[200px]">
                            <Calendar size={16} className="text-slate-400" />
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    </InputRow>

                    <InputRow label="Invoice Selection" required helper="Select the original invoice to apply credit against">
                        <div className="relative max-w-md">
                            <FileText size={16} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                            <select
                                required
                                disabled={!formData.customerId}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 transition-all cursor-pointer"
                                value={formData.invoiceId}
                                onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                            >
                                <option value="">Select Invoice</option>
                                {invoices.filter(i => (i.customerId._id || i.customerId) === formData.customerId).map(inv => (
                                    <option key={inv._id} value={inv._id}>
                                        #{inv.invoiceNumber} — ₹{inv.grandTotal.toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </InputRow>
                </div>

                <div className="px-8 py-10 bg-slate-50/50 border-t border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Reason for Credit</label>
                            <textarea
                                required
                                rows="4"
                                className="input-field h-32 resize-none bg-white p-3 border-slate-200 focus:ring-red-500 focus:border-red-500"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="e.g., Goods returned, partial refund, calculation error..."
                            />
                        </div>

                        <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm overflow-hidden border-l-4">
                            <label className="block text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Amount to Credit</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-red-500 font-bold text-xl">₹</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full pl-8 pr-4 py-3 text-3xl font-black text-red-600 border border-transparent border-b-slate-100 focus:border-b-red-400 focus:ring-0 transition-all placeholder:text-red-100"
                                />
                            </div>
                            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
                                <Info size={14} className="text-red-400 mt-0.5" />
                                <p className="text-[10px] text-red-600 font-medium">This amount will be deducted from the customer's outstanding balance for the selected invoice.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-12 pt-6 border-t border-slate-100">
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
