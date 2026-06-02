import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Tag, Save, Info, Calendar, DollarSign, User, FileText, CreditCard } from 'lucide-react';
import SearchableDropdown from '../components/SearchableDropdown';
import QuickCustomerModal from '../components/QuickCustomerModal';
import QuickVendorModal from '../components/QuickVendorModal';

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

const ExpenseForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [vendors, setVendors] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    const [expenseCategories, setExpenseCategories] = useState([
        'Advertising And Marketing',
        'Automobile Expense',
        'Bank Fees and Charges',
        'Consultant Expense',
        'Contract Assets',
        'Credit Card Charges',
        'Depreciation And Amortisation',
        'IT and Internet Expenses',
        'Lodging',
        'Meals and Entertainment',
        'Office Supplies',
        'Postage',
        'Printing and Stationery',
        'Rent Expense',
        'Repairs & Maintenance',
        'Salaries and Employee Wages',
        'Subcontractor',
        'Telephone Expense',
        'Travel Expense',
        'Other Expenses'
    ]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Subcontractor',
        amount: '',
        vendorId: '',
        customerId: '',
        reference: '',
        notes: '',
        status: 'Paid',
        paymentMethod: 'Cash'
    });

    useEffect(() => {
        fetchVendors();
        fetchCustomers();
        if (isEdit) {
            fetchExpense();
        }
    }, [id]);

    const fetchExpense = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/expenses/${id}`);
            const exp = res.data.data;
            setFormData({
                date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                category: exp.category || 'Subcontractor',
                amount: exp.amount || '',
                vendorId: exp.vendorId || '',
                customerId: exp.customerId || '',
                reference: exp.reference || '',
                notes: exp.notes || '',
                status: exp.status || 'Paid',
                paymentMethod: exp.paymentMethod || 'Cash'
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load expense details');
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await axios.get('/api/vendors');
            setVendors(res.data.data);
        } catch (err) {
            console.error('Failed to load vendors');
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('/api/customers');
            setCustomers(res.data.data);
        } catch (err) {
            console.error('Failed to load customers');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCategoryChange = (value) => {
        setFormData(prev => ({ ...prev, category: value }));
    };

    const handleAddNewCategory = () => {
        const name = prompt("Enter new category name:");
        if (name && !expenseCategories.includes(name)) {
            setExpenseCategories(prev => [...prev, name].sort());
            setFormData(prev => ({ ...prev, category: name }));
        }
    };

    const handleVendorCreated = (newVendor) => {
        setVendors(prev => [...prev, newVendor]);
        setFormData(prev => ({ ...prev, vendorId: newVendor._id }));
    };

    const handleCustomerCreated = (newCustomer) => {
        setCustomers(prev => [...prev, newCustomer]);
        setFormData(prev => ({ ...prev, customerId: newCustomer._id }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (Number(formData.amount) <= 0) {
            setError('Please enter a valid amount greater than 0');
            setLoading(false);
            return;
        }

        try {
            const cleanedData = { ...formData, amount: Number(formData.amount) };
            cleanedData.vendorId = cleanedData.vendorId || null;
            cleanedData.customerId = cleanedData.customerId || null;

            if (isEdit) {
                await axios.put(`/api/expenses/${id}`, cleanedData);
            } else {
                await axios.post('/api/expenses', cleanedData);
            }
            navigate('/expenses');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save expense');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/expenses')}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-600 border border-transparent hover:border-slate-200 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Calculator className="text-blue-500" size={20} />
                            {isEdit ? 'Edit Expense' : 'Record New Expense'}
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Business Expenditure Tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/expenses')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" onClick={handleSubmit} disabled={loading}
                        className="btn-primary px-6 flex items-center gap-2 shadow-lg shadow-blue-500/10">
                        <Save size={18} />
                        {loading ? 'Saving...' : isEdit ? 'Update Expense' : 'Save Expense'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-6 mt-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm font-medium flex items-center gap-2">
                    <Info size={16} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white">
                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100">
                    <h3 className="text-base font-semibold text-slate-800 pb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-slate-400" /> Basic Details
                    </h3>

                    <InputRow label="Expense Date" required>
                        <div className="flex items-center gap-2 max-w-[200px]">
                            <Calendar size={16} className="text-slate-400" />
                            <input
                                type="date"
                                name="date"
                                required
                                value={formData.date}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>
                    </InputRow>

                    <InputRow label="Expense Category" required helper="Classify your expenditure for reporting">
                        <SearchableDropdown
                            options={expenseCategories}
                            value={formData.category}
                            onChange={handleCategoryChange}
                            onAddNew={handleAddNewCategory}
                            placeholder="Select Category"
                        />
                    </InputRow>

                    <InputRow label="Amount (₹)" required>
                        <div className="relative max-w-[300px]">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                            <input
                                type="number"
                                name="amount"
                                step="0.01"
                                min="0.01"
                                required
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={handleChange}
                                className="w-full pl-8 pr-3 py-2 text-xl font-black text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </InputRow>

                    <h3 className="text-base font-semibold text-slate-800 py-6 flex items-center gap-2">
                        <User size={18} className="text-slate-400" /> Payee & Payment
                    </h3>

                    <InputRow label="Vendor" helper="Associate this expense with a vendor record">
                        <SearchableDropdown
                            options={vendors.map(v => v.companyName)}
                            value={vendors.find(v => v._id === formData.vendorId)?.companyName || ''}
                            onChange={(name) => {
                                const vend = vendors.find(v => v.companyName === name);
                                setFormData(prev => ({ ...prev, vendorId: vend ? vend._id : '' }));
                            }}
                            onAddNew={() => setShowVendorModal(true)}
                            placeholder="Select Vendor"
                        />
                    </InputRow>

                    <InputRow label="Customer" helper="Associate this expense with a customer record">
                        <SearchableDropdown
                            options={customers.map(c => c.companyName)}
                            value={customers.find(c => c._id === formData.customerId)?.companyName || ''}
                            onChange={(name) => {
                                const cust = customers.find(c => c.companyName === name);
                                setFormData(prev => ({ ...prev, customerId: cust ? cust._id : '' }));
                            }}
                            onAddNew={() => setShowCustomerModal(true)}
                            placeholder="Select Customer"
                        />
                    </InputRow>

                    <InputRow label="Payment Method">
                        <div className="flex items-center gap-2 max-w-md">
                            <CreditCard size={16} className="text-slate-400" />
                            <select
                                name="paymentMethod"
                                value={formData.paymentMethod}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            >
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="UPI">UPI / Digital Wallet</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                    </InputRow>

                    <InputRow label="Reference#" helper="Receipt number or transaction ID">
                        <div className="relative max-w-md">
                            <FileText size={16} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                name="reference"
                                value={formData.reference}
                                onChange={handleChange}
                                placeholder="e.g. RCP-8821"
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    </InputRow>
                </div>

                <div className="px-8 py-10 bg-slate-50/50 border-t border-slate-200">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Tag size={14} className="text-slate-400" /> Internal Notes
                        </label>
                        <textarea
                            name="notes"
                            rows="3"
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Add internal notes about this expense..."
                            className="input-field h-24 resize-none bg-white font-sans"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => navigate('/expenses')} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary px-10 shadow-lg shadow-blue-500/10">
                            {loading ? 'Saving...' : isEdit ? 'Update Expense' : 'Save Expense'}
                        </button>
                    </div>
                </div>
            </form>

            <QuickVendorModal 
                isOpen={showVendorModal} 
                onClose={() => setShowVendorModal(false)} 
                onSuccess={handleVendorCreated} 
            />

            <QuickCustomerModal 
                isOpen={showCustomerModal} 
                onClose={() => setShowCustomerModal(false)} 
                onSuccess={handleCustomerCreated} 
            />
        </div>
    );
};

export default ExpenseForm;
