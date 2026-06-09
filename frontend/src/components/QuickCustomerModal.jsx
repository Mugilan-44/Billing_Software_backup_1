import { useState } from 'react';
import axios from '../utils/api';
import { X, Save, Plus, Trash2, Copy } from 'lucide-react';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry'
];

const PAYMENT_TERMS = [
    'Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90', 'End of Month',
    'End of Next Month', 'Custom'
];

const SALUTATIONS = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];

const emptyAddress = {
    attention: '', country: 'India', street1: '', street2: '',
    city: '', state: '', zipCode: '', phone: '', fax: ''
};

const emptyContactPerson = {
    salutation: '', firstName: '', lastName: '', email: '', workPhone: '', mobile: ''
};

export default function QuickCustomerModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('other');

    // General Form Fields
    const [customerType, setCustomerType] = useState('Business');
    const [salutation, setSalutation] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [gstNumber, setGstNumber] = useState('');
    const [email, setEmail] = useState('');
    const [workPhone, setWorkPhone] = useState('');
    const [mobile, setMobile] = useState('');

    // Tab Fields
    const [panNumber, setPanNumber] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
    const [creditPeriod, setCreditPeriod] = useState(15);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [status, setStatus] = useState('Active');
    const [remarks, setRemarks] = useState('');
    const [billingAddress, setBillingAddress] = useState({ ...emptyAddress });
    const [shippingAddress, setShippingAddress] = useState({ ...emptyAddress });
    const [contactPersons, setContactPersons] = useState([{ ...emptyContactPerson }]);

    if (!isOpen) return null;

    const handleAddressChange = (type, field, value) => {
        if (type === 'billingAddress') {
            setBillingAddress(prev => ({ ...prev, [field]: value }));
        } else {
            setShippingAddress(prev => ({ ...prev, [field]: value }));
        }
    };

    const copyBillingToShipping = () => {
        setShippingAddress({ ...billingAddress });
    };

    const handleContactPersonChange = (index, field, value) => {
        const updated = [...contactPersons];
        if (updated[index]) {
            updated[index] = { ...updated[index], [field]: value };
            setContactPersons(updated);
        }
    };

    const addContactPerson = () => {
        setContactPersons(prev => [...prev, { ...emptyContactPerson }]);
    };

    const removeContactPerson = (index) => {
        const updated = contactPersons.filter((_, i) => i !== index);
        setContactPersons(updated.length > 0 ? updated : [{ ...emptyContactPerson }]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const finalCompanyName = customerType === 'Individual' 
            ? [firstName, lastName].filter(Boolean).join(' ') 
            : companyName;

        if (!finalCompanyName.trim()) {
            setError(customerType === 'Individual' 
                ? 'Please enter at least a first name.' 
                : 'Company Name is required.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customerType,
                salutation,
                firstName: customerType === 'Individual' ? firstName : '',
                lastName: customerType === 'Individual' ? lastName : '',
                companyName: finalCompanyName,
                displayName: displayName || finalCompanyName,
                currency,
                gstNumber: customerType === 'Business' ? gstNumber : '',
                email,
                workPhone,
                mobile,
                panNumber,
                paymentTerms,
                creditPeriod: Number(creditPeriod) || 0,
                openingBalance: Number(openingBalance) || 0,
                status,
                remarks,
                billingAddress,
                shippingAddress,
                contactPersons: contactPersons.filter(cp => cp.firstName?.trim() || cp.lastName?.trim() || cp.email?.trim())
            };

            const res = await axios.post('/api/customers', payload);
            onSuccess(res.data.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create customer');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'other', label: 'Other Details' },
        { id: 'address', label: 'Address' },
        { id: 'contacts', label: 'Contact Persons' },
        { id: 'remarks', label: 'Remarks' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            {/* Backdrop overlay */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out" 
                onClick={onClose} 
            />
            
            {/* Slide-over panel */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right text-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Customer</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Quickly add a customer to this transaction with full details.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold border border-red-100 dark:border-red-900/30">
                        {error}
                    </div>
                )}

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Customer Type */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Customer Type</label>
                            <div className="flex gap-4">
                                {['Business', 'Individual'].map(t => (
                                    <label key={t} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="modalCustomerType"
                                            value={t}
                                            checked={customerType === t}
                                            onChange={() => setCustomerType(t)}
                                            className="accent-blue-600 w-4 h-4"
                                        />
                                        <span className="text-sm font-medium">{t}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Primary Contact */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Primary Contact</label>
                            <div className="flex gap-2">
                                <select
                                    className="block w-28 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={salutation}
                                    onChange={e => setSalutation(e.target.value)}
                                >
                                    <option value="">Salutation</option>
                                    {SALUTATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    className="block flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    required={customerType === 'Individual'}
                                />
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    className="block flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Company Name & Display Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                    {customerType === 'Individual' ? 'Company Name (optional)' : 'Company Name *'}
                                </label>
                                <input
                                    type="text"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={companyName}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setCompanyName(val);
                                        if (!displayName || displayName === companyName) {
                                            setDisplayName(val);
                                        }
                                    }}
                                    placeholder={customerType === 'Individual' ? 'Leave blank to auto-fill' : 'Company / Business Name'}
                                    required={customerType === 'Business'}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Display Name *</label>
                                <input
                                    type="text"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="Selected Display Name"
                                />
                            </div>
                        </div>

                        {/* Currency & GSTIN */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Currency</label>
                                <select
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={currency}
                                    onChange={e => setCurrency(e.target.value)}
                                >
                                    <option value="INR">INR - Indian Rupee</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">GSTIN</label>
                                <input
                                    type="text"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none uppercase"
                                    value={gstNumber}
                                    onChange={e => setGstNumber(e.target.value)}
                                    placeholder="22AAAAA0000A1Z5"
                                    maxLength={15}
                                />
                            </div>
                        </div>

                        {/* Email & Phone numbers */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Email Address</label>
                                <input
                                    type="email"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Work Phone</label>
                                <input
                                    type="tel"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={workPhone}
                                    onChange={e => setWorkPhone(e.target.value)}
                                    placeholder="Work Phone"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Mobile</label>
                                <input
                                    type="tel"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={mobile}
                                    onChange={e => setMobile(e.target.value)}
                                    placeholder="Mobile Number"
                                />
                            </div>
                        </div>

                        {/* Tabs Bar */}
                        <div className="border-b border-slate-200 dark:border-slate-700">
                            <div className="flex gap-2">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Contents */}
                        <div className="py-2 min-h-[220px]">
                            {/* Tab 1: Other Details */}
                            {activeTab === 'other' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">PAN</label>
                                        <input
                                            type="text"
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                            value={panNumber}
                                            onChange={e => setPanNumber(e.target.value)}
                                            placeholder="ABCDE1234F"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Payment Terms</label>
                                        <select
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                            value={paymentTerms}
                                            onChange={e => setPaymentTerms(e.target.value)}
                                        >
                                            {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Credit Period (Days)</label>
                                        <input
                                            type="number"
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                            value={creditPeriod}
                                            onChange={e => setCreditPeriod(Number(e.target.value))}
                                            min={0}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Opening Balance (₹)</label>
                                        <input
                                            type="number"
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                            value={openingBalance}
                                            onChange={e => setOpeningBalance(Number(e.target.value))}
                                            step="0.01"
                                            min={0}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Status</label>
                                        <select
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                            value={status}
                                            onChange={e => setStatus(e.target.value)}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Addresses */}
                            {activeTab === 'address' && (
                                <div className="space-y-6">
                                    {/* Billing Address */}
                                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 mb-3 uppercase tracking-wider">Billing Address</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="col-span-1 md:col-span-2">
                                                <input
                                                    type="text"
                                                    placeholder="Attention / Contact Name"
                                                    className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                    value={billingAddress.attention || ''}
                                                    onChange={e => handleAddressChange('billingAddress', 'attention', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <textarea
                                                    placeholder="Street address 1"
                                                    className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none resize-none h-12"
                                                    value={billingAddress.street1 || ''}
                                                    onChange={e => handleAddressChange('billingAddress', 'street1', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <textarea
                                                    placeholder="Street address 2"
                                                    className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none resize-none h-12"
                                                    value={billingAddress.street2 || ''}
                                                    onChange={e => handleAddressChange('billingAddress', 'street2', e.target.value)}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="City"
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={billingAddress.city || ''}
                                                onChange={e => handleAddressChange('billingAddress', 'city', e.target.value)}
                                            />
                                            <select
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={billingAddress.state || ''}
                                                onChange={e => handleAddressChange('billingAddress', 'state', e.target.value)}
                                            >
                                                <option value="">Select State</option>
                                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Pin Code"
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={billingAddress.zipCode || ''}
                                                onChange={e => handleAddressChange('billingAddress', 'zipCode', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Phone"
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={billingAddress.phone || ''}
                                                onChange={e => handleAddressChange('billingAddress', 'phone', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Fax Number"
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={billingAddress.fax || ''}
                                                onChange={e => handleAddressChange('billingAddress', 'fax', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Shipping Address */}
                                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Shipping Address</h4>
                                            <button
                                                type="button"
                                                onClick={copyBillingToShipping}
                                                className="flex items-center text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wide"
                                            >
                                                <Copy size={11} className="mr-1" /> Copy billing address
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="col-span-1 md:col-span-2">
                                                <input
                                                    type="text"
                                                    placeholder="Attention / Contact Name"
                                                    className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                    value={shippingAddress.attention || ''}
                                                    onChange={e => handleAddressChange('shippingAddress', 'attention', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <textarea
                                                    placeholder="Street address 1"
                                                    className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none resize-none h-12"
                                                    value={shippingAddress.street1 || ''}
                                                    onChange={e => handleAddressChange('shippingAddress', 'street1', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <textarea
                                                    placeholder="Street address 2"
                                                    className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none resize-none h-12"
                                                    value={shippingAddress.street2 || ''}
                                                    onChange={e => handleAddressChange('shippingAddress', 'street2', e.target.value)}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="City"
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={shippingAddress.city || ''}
                                                onChange={e => handleAddressChange('shippingAddress', 'city', e.target.value)}
                                            />
                                            <select
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={shippingAddress.state || ''}
                                                onChange={e => handleAddressChange('shippingAddress', 'state', e.target.value)}
                                            >
                                                <option value="">Select State</option>
                                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Pin Code"
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={shippingAddress.zipCode || ''}
                                                onChange={e => handleAddressChange('shippingAddress', 'zipCode', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Phone"
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={shippingAddress.phone || ''}
                                                onChange={e => handleAddressChange('shippingAddress', 'phone', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Fax Number"
                                                className="block w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                                value={shippingAddress.fax || ''}
                                                onChange={e => handleAddressChange('shippingAddress', 'fax', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Contact Persons */}
                            {activeTab === 'contacts' && (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
                                                    <th className="px-2 py-2 font-bold w-16">Title</th>
                                                    <th className="px-2 py-2 font-bold">First Name</th>
                                                    <th className="px-2 py-2 font-bold">Last Name</th>
                                                    <th className="px-2 py-2 font-bold">Email</th>
                                                    <th className="px-2 py-2 font-bold">Work Phone</th>
                                                    <th className="px-2 py-2 font-bold">Mobile</th>
                                                    <th className="w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {contactPersons.map((cp, idx) => (
                                                    <tr key={idx} className="align-middle">
                                                        <td className="p-1">
                                                            <select
                                                                className="w-full bg-transparent border-b border-slate-200 p-1 text-[11px] outline-none"
                                                                value={cp.salutation || ''}
                                                                onChange={e => handleContactPersonChange(idx, 'salutation', e.target.value)}
                                                            >
                                                                <option value=""></option>
                                                                {SALUTATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="p-1">
                                                            <input
                                                                type="text"
                                                                className="w-full bg-transparent border-b border-slate-200 p-1 outline-none"
                                                                value={cp.firstName || ''}
                                                                onChange={e => handleContactPersonChange(idx, 'firstName', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-1">
                                                            <input
                                                                type="text"
                                                                className="w-full bg-transparent border-b border-slate-200 p-1 outline-none"
                                                                value={cp.lastName || ''}
                                                                onChange={e => handleContactPersonChange(idx, 'lastName', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-1">
                                                            <input
                                                                type="email"
                                                                className="w-full bg-transparent border-b border-slate-200 p-1 outline-none"
                                                                value={cp.email || ''}
                                                                onChange={e => handleContactPersonChange(idx, 'email', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-1">
                                                            <input
                                                                type="tel"
                                                                className="w-full bg-transparent border-b border-slate-200 p-1 outline-none"
                                                                value={cp.workPhone || ''}
                                                                onChange={e => handleContactPersonChange(idx, 'workPhone', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-1">
                                                            <input
                                                                type="tel"
                                                                className="w-full bg-transparent border-b border-slate-200 p-1 outline-none"
                                                                value={cp.mobile || ''}
                                                                onChange={e => handleContactPersonChange(idx, 'mobile', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-1 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeContactPerson(idx)}
                                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addContactPerson}
                                        className="flex items-center text-xs text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider"
                                    >
                                        <Plus size={14} className="mr-1" /> Add Contact Person
                                    </button>
                                </div>
                            )}

                            {/* Tab 4: Remarks */}
                            {activeTab === 'remarks' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Remarks / Notes</label>
                                    <textarea
                                        placeholder="Internal notes, customer preferences, etc."
                                        className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none h-32 resize-none"
                                        value={remarks}
                                        onChange={e => setRemarks(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors">
                            <Save size={14} />
                            {loading ? 'Saving...' : 'Save Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
