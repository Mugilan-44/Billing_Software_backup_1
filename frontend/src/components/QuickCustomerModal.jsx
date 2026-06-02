import { useState } from 'react';
import axios from '../utils/api';
import { X, Save } from 'lucide-react';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function QuickCustomerModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [customerType, setCustomerType] = useState('Business');
    const [companyName, setCompanyName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [state, setState] = useState('');

    if (!isOpen) return null;

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
                companyName: finalCompanyName,
                displayName: finalCompanyName,
                firstName: customerType === 'Individual' ? firstName : '',
                lastName: customerType === 'Individual' ? lastName : '',
                email,
                mobile,
                workPhone: mobile,
                gstNumber: customerType === 'Business' ? gstNumber : '',
                billingAddress: {
                    attention: finalCompanyName,
                    country: 'India',
                    street1: '',
                    street2: '',
                    city: '',
                    state,
                    zipCode: '',
                    phone: mobile
                },
                shippingAddress: {
                    attention: finalCompanyName,
                    country: 'India',
                    street1: '',
                    street2: '',
                    city: '',
                    state,
                    zipCode: '',
                    phone: mobile
                }
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

    return (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            {/* Backdrop overlay */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out" 
                onClick={onClose} 
            />
            
            {/* Slide-over panel */}
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right text-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Customer</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Quickly add a customer to this transaction.</p>
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Customer Type</label>
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

                        {customerType === 'Business' ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Company Name *</label>
                                <input
                                    type="text"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                    required
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">First Name *</label>
                                    <input
                                        type="text"
                                        className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        placeholder="Jane"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Last Name</label>
                                    <input
                                        type="text"
                                        className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                                <input
                                    type="email"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Mobile Number</label>
                                <input
                                    type="tel"
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={mobile}
                                    onChange={e => setMobile(e.target.value)}
                                    placeholder="10-digit mobile"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {customerType === 'Business' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">GSTIN</label>
                                    <input
                                        type="text"
                                        className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none uppercase"
                                        value={gstNumber}
                                        onChange={e => setGstNumber(e.target.value)}
                                        placeholder="22AAAAA0000A1Z5"
                                        maxLength={15}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">State</label>
                                <select
                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                >
                                    <option value="">Select State</option>
                                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
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
