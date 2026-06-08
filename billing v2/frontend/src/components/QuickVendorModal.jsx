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

export default function QuickVendorModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('details');

    // Vendor Fields
    const [companyName, setCompanyName] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // Address & Terms
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [openingBalance, setOpeningBalance] = useState(0);
    const [creditPeriod, setCreditPeriod] = useState(30);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!companyName.trim()) {
            setError('Company Name is required.');
            return;
        }
        if (!phone.trim()) {
            setError('Phone number is required.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                companyName,
                gstNumber,
                contactPerson,
                phone,
                email,
                billingAddress: {
                    street,
                    city,
                    state,
                    pincode
                },
                openingBalance: Number(openingBalance) || 0,
                creditPeriod: Number(creditPeriod) || 30
            };
            const res = await axios.post('/api/vendors', payload);
            onSuccess(res.data.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create vendor');
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
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right text-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Vendor</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Quickly add a supplier with full profiles.</p>
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
                        
                        {/* Tabs Navigation */}
                        <div className="border-b border-slate-200 dark:border-slate-700">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    onClick={() => setActiveTab('details')}
                                >
                                    Supplier Details
                                </button>
                                <button
                                    type="button"
                                    className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 ${activeTab === 'terms' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    onClick={() => setActiveTab('terms')}
                                >
                                    Address & Payment Terms
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="space-y-4">
                            {activeTab === 'details' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Company Name *</label>
                                        <input
                                            type="text"
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                            placeholder="Supplier / Company Name"
                                            required
                                        />
                                    </div>

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

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Contact Person</label>
                                        <input
                                            type="text"
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                            value={contactPerson}
                                            onChange={e => setContactPerson(e.target.value)}
                                            placeholder="Primary contact person name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Phone *</label>
                                            <input
                                                type="tel"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                placeholder="Supplier phone number"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                                            <input
                                                type="email"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="supplier@company.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'terms' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Street Address</label>
                                        <textarea
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none resize-none h-16"
                                            value={street}
                                            onChange={e => setStreet(e.target.value)}
                                            placeholder="Street name, landmark, etc."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">City</label>
                                            <input
                                                type="text"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={city}
                                                onChange={e => setCity(e.target.value)}
                                                placeholder="City"
                                            />
                                        </div>
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
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Pincode</label>
                                            <input
                                                type="text"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={pincode}
                                                onChange={e => setPincode(e.target.value)}
                                                placeholder="Pincode"
                                                maxLength={6}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Opening Balance (₹)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={openingBalance}
                                                onChange={e => setOpeningBalance(e.target.value)}
                                                min={0}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Credit Period (Days)</label>
                                            <input
                                                type="number"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={creditPeriod}
                                                onChange={e => setCreditPeriod(e.target.value)}
                                                min={0}
                                            />
                                        </div>
                                    </div>
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
                            {loading ? 'Saving...' : 'Save Vendor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
