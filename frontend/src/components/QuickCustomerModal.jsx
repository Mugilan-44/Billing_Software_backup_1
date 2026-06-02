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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
                <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X size={18} />
                </button>
                
                <h3 className="text-lg font-bold tracking-tight mb-2">Create New Customer</h3>
                <p className="text-xs text-slate-400 mb-6">Quickly add a customer to use in this transaction.</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/30">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Customer Type</label>
                        <div className="flex gap-4">
                            {['Business', 'Individual'].map(t => (
                                <label key={t} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="modalCustomerType"
                                        value={t}
                                        checked={customerType === t}
                                        onChange={() => setCustomerType(t)}
                                        className="accent-blue-600 w-4 h-4"
                                    />
                                    <span className="text-sm">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {customerType === 'Business' ? (
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Company Name *</label>
                            <input
                                type="text"
                                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                placeholder="e.g. Acme Corp"
                                required
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">First Name *</label>
                                <input
                                    type="text"
                                    className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    placeholder="Jane"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Last Name</label>
                                <input
                                    type="text"
                                    className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                            <input
                                type="email"
                                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Mobile Number</label>
                            <input
                                type="tel"
                                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                value={mobile}
                                onChange={e => setMobile(e.target.value)}
                                placeholder="10-digit mobile"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {customerType === 'Business' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">GSTIN</label>
                                <input
                                    type="text"
                                    className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm uppercase"
                                    value={gstNumber}
                                    onChange={e => setGstNumber(e.target.value)}
                                    placeholder="22AAAAA0000A1Z5"
                                    maxLength={15}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">State</label>
                            <select
                                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                value={state}
                                onChange={e => setState(e.target.value)}
                            >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary px-6 flex items-center gap-2">
                            <Save size={16} />
                            {loading ? 'Saving...' : 'Save Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
