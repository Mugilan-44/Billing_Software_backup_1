import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry'
];

const InputRow = ({ label, required, children }) => (
    <div className="flex items-start py-3 border-b border-slate-100 last:border-0">
        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex-1">{children}</div>
    </div>
);

const VendorForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');

    const [form, setForm] = useState({
        companyName: '',
        gstNumber: '',
        contactPerson: '',
        email: '',
        phone: '',
        billingAddress: {
            street: '',
            city: '',
            state: '',
            pincode: ''
        },
        openingBalance: 0,
        creditPeriod: 30
    });

    useEffect(() => {
        if (isEdit) {
            fetchVendor();
        }
    }, [id]);

    const fetchVendor = async () => {
        try {
            const res = await axios.get(`/api/vendors/${id}`);
            const v = res.data.data;
            setForm({
                companyName: v.companyName || '',
                gstNumber: v.gstNumber || '',
                contactPerson: v.contactPerson || '',
                email: v.email || '',
                phone: v.phone || '',
                billingAddress: v.billingAddress || { street: '', city: '', state: '', pincode: '' },
                openingBalance: v.openingBalance || 0,
                creditPeriod: v.creditPeriod || 30
            });
        } catch (err) {
            console.error('Error fetching vendor', err);
            setSaveError('Failed to load vendor details.');
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            billingAddress: { ...prev.billingAddress, [field]: value }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.companyName.trim()) {
            setSaveError('Company Name is required.');
            return;
        }
        if (!form.phone.trim()) {
            setSaveError('Phone number is required.');
            return;
        }

        setLoading(true);
        setSaveError('');
        try {
            if (isEdit) {
                await axios.put(`/api/vendors/${id}`, form);
                setSaveSuccess('Vendor updated successfully!');
            } else {
                await axios.post('/api/vendors', form);
                setSaveSuccess('Vendor created successfully!');
            }
            setTimeout(() => navigate('/vendors'), 800);
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                setSaveError(`Validation Error: ${errorData.errors.join(' | ')}`);
            } else {
                setSaveError(errorData?.message || 'Failed to save vendor. Please try again.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/vendors')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            {isEdit ? 'Edit Vendor' : 'New Vendor'}
                        </h1>
                        <p className="text-xs text-slate-500">
                            {isEdit ? 'Update vendor information' : 'Add a new supplier profile'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/vendors')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={loading}
                        className="btn-primary px-6">
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {saveError && (
                <div className="mx-0 px-6 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                    {saveError}
                </div>
            )}
            {saveSuccess && (
                <div className="mx-0 px-6 py-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm">
                    {saveSuccess}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white">
                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100">
                    <h3 className="text-base font-semibold text-slate-800 pb-4">Basic Details</h3>

                    <InputRow label="Company Name" required>
                        <input
                            type="text"
                            className="input-field max-w-md"
                            value={form.companyName}
                            onChange={e => handleChange('companyName', e.target.value)}
                            placeholder="Supplier / Company Name"
                            required
                        />
                    </InputRow>

                    <InputRow label="GSTIN">
                        <input
                            type="text"
                            className="input-field max-w-md uppercase"
                            value={form.gstNumber}
                            onChange={e => handleChange('gstNumber', e.target.value)}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                        />
                    </InputRow>

                    <InputRow label="Contact Person">
                        <input
                            type="text"
                            className="input-field max-w-md"
                            value={form.contactPerson}
                            onChange={e => handleChange('contactPerson', e.target.value)}
                            placeholder="Primary Contact Person"
                        />
                    </InputRow>

                    <InputRow label="Phone" required>
                        <div className="flex gap-1.5 items-center">
                            <span className="text-sm text-slate-500 bg-slate-100 border border-slate-300 px-2 py-2 rounded-md">+91</span>
                            <input
                                type="tel"
                                placeholder="Work Phone"
                                className="input-field max-w-xs"
                                value={form.phone}
                                onChange={e => handleChange('phone', e.target.value)}
                                required
                            />
                        </div>
                    </InputRow>

                    <InputRow label="Email Address">
                        <input
                            type="email"
                            className="input-field max-w-md"
                            value={form.email}
                            onChange={e => handleChange('email', e.target.value)}
                            placeholder="vendor@example.com"
                        />
                    </InputRow>

                    <h3 className="text-base font-semibold text-slate-800 pb-4 pt-8">Billing & Terms</h3>

                    <InputRow label="Street Address">
                        <textarea
                            className="input-field max-w-md resize-none h-20"
                            value={form.billingAddress.street}
                            onChange={e => handleAddressChange('street', e.target.value)}
                            placeholder="Street, Area, etc."
                        />
                    </InputRow>

                    <InputRow label="City">
                        <input
                            type="text"
                            className="input-field max-w-xs"
                            value={form.billingAddress.city}
                            onChange={e => handleAddressChange('city', e.target.value)}
                        />
                    </InputRow>

                    <InputRow label="State">
                        <select
                            className="input-field max-w-xs"
                            value={form.billingAddress.state}
                            onChange={e => handleAddressChange('state', e.target.value)}
                        >
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </InputRow>

                    <InputRow label="Pincode">
                        <input
                            type="text"
                            className="input-field max-w-xs"
                            value={form.billingAddress.pincode}
                            onChange={e => handleAddressChange('pincode', e.target.value)}
                            placeholder="6 digits"
                            maxLength={6}
                        />
                    </InputRow>

                    <InputRow label="Opening Balance (₹)">
                        <input
                            type="number"
                            step="0.01"
                            className="input-field max-w-xs"
                            value={form.openingBalance}
                            onChange={e => handleChange('openingBalance', Number(e.target.value))}
                        />
                    </InputRow>

                    <InputRow label="Credit Period (Days)">
                        <input
                            type="number"
                            className="input-field max-w-xs"
                            value={form.creditPeriod}
                            onChange={e => handleChange('creditPeriod', Number(e.target.value))}
                        />
                    </InputRow>
                </div>

                <div className="bg-slate-50/50 border-t border-slate-200 px-8 py-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400">All fields marked with <span className="text-red-500">*</span> are required</span>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => navigate('/vendors')} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary px-8">
                            {loading ? 'Saving...' : 'Save Vendor'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default VendorForm;
