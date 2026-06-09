import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy } from 'lucide-react';

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

const InputRow = ({ label, required, children }) => (
    <div className="flex items-start py-3 border-b border-slate-100 last:border-0">
        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex-1">{children}</div>
    </div>
);

const AddressPanel = ({ type, label, form, handleAddressChange, copyBillingToShipping }) => (
    <div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">{label}</h3>
            {type === 'shippingAddress' && (
                <button type="button" onClick={copyBillingToShipping}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                    <Copy size={14} className="mr-1" /> Copy billing address
                </button>
            )}
        </div>
        <div className="space-y-3">
            {[
                { field: 'attention', label: 'Attention', type: 'text' },
                { field: 'street1', label: 'Street 1', type: 'textarea' },
                { field: 'street2', label: 'Street 2', type: 'textarea' },
                { field: 'city', label: 'City', type: 'text' },
                { field: 'zipCode', label: 'Pin Code', type: 'text' },
                { field: 'phone', label: 'Phone', type: 'text' },
                { field: 'fax', label: 'Fax Number', type: 'text' },
            ].map(f => (
                <div key={f.field} className="flex items-start gap-3">
                    <label className="w-32 shrink-0 text-sm text-slate-600 pt-2">{f.label}</label>
                    {f.type === 'textarea' ? (
                        <textarea
                            className="input-field resize-none h-16"
                            value={form[type]?.[f.field] || ''}
                            onChange={e => handleAddressChange(type, f.field, e.target.value)}
                        />
                    ) : (
                        <input
                            type="text"
                            className="input-field"
                            value={form[type]?.[f.field] || ''}
                            onChange={e => handleAddressChange(type, f.field, e.target.value)}
                        />
                    )}
                </div>
            ))}
            <div className="flex items-start gap-3">
                <label className="w-32 shrink-0 text-sm text-slate-600 pt-2">State</label>
                <select
                    className="input-field"
                    value={form[type]?.state || ''}
                    onChange={e => handleAddressChange(type, 'state', e.target.value)}
                >
                    <option value="">Select or type to add</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>
    </div>
);

const CustomerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const [activeTab, setActiveTab] = useState('other');
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');

    const [form, setForm] = useState({
        customerType: 'Business',
        salutation: '',
        firstName: '',
        lastName: '',
        companyName: '',
        displayName: '',
        currency: 'INR',
        email: '',
        workPhone: '',
        mobile: '',
        gstNumber: '',
        panNumber: '',
        paymentTerms: 'Due on Receipt',
        creditPeriod: 15,
        openingBalance: 0,
        status: 'Active',
        remarks: '',
        billingAddress: { ...emptyAddress },
        shippingAddress: { ...emptyAddress },
        contactPersons: [{ ...emptyContactPerson }],
    });

    useEffect(() => {
        if (isEdit) {
            fetchCustomer();
        }
    }, [id]);

    const fetchCustomer = async () => {
        try {
            const res = await axios.get(`/api/customers/${id}`);
            const c = res.data.data;
            setForm({
                customerType: c.customerType || 'Business',
                salutation: c.salutation || '',
                firstName: c.firstName || '',
                lastName: c.lastName || '',
                companyName: c.companyName || '',
                displayName: c.displayName || '',
                currency: c.currency || 'INR',
                email: c.email || '',
                workPhone: c.workPhone || c.phone || '',
                mobile: c.mobile || '',
                gstNumber: c.gstNumber || '',
                panNumber: c.panNumber || '',
                paymentTerms: c.paymentTerms || 'Due on Receipt',
                creditPeriod: c.creditPeriod || 15,
                openingBalance: c.openingBalance || 0,
                status: c.status || 'Active',
                remarks: c.remarks || '',
                billingAddress: c.billingAddress || { ...emptyAddress },
                shippingAddress: c.shippingAddress || { ...emptyAddress },
                contactPersons: c.contactPersons?.length > 0 ? c.contactPersons : [{ ...emptyContactPerson }],
            });
        } catch (err) {
            console.error('Error fetching customer', err);
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'companyName') {
                if (!prev.displayName || prev.displayName === prev.companyName) {
                    updated.displayName = value;
                }
            }
            return updated;
        });
    };

    const handleAddressChange = (type, field, value) => {
        setForm(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
    };

    const copyBillingToShipping = () => {
        setForm(prev => ({ ...prev, shippingAddress: { ...prev.billingAddress } }));
    };

    const handleContactPersonChange = (index, field, value) => {
        const updated = [...(form?.contactPersons || [])];
        if (updated[index]) {
            updated[index] = { ...updated[index], [field]: value };
            setForm(prev => ({ ...prev, contactPersons: updated }));
        }
    };

    const addContactPerson = () => {
        setForm(prev => ({ ...prev, contactPersons: [...(prev?.contactPersons || []), { ...emptyContactPerson }] }));
    };

    const removeContactPerson = (index) => {
        const updated = (form?.contactPersons || []).filter((_, i) => i !== index);
        setForm(prev => ({ ...prev, contactPersons: updated.length > 0 ? updated : [{ ...emptyContactPerson }] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Auto-fill companyName from name for Individual customers
        const submitForm = { ...form };
        if (submitForm.customerType === 'Individual' && !submitForm.companyName?.trim()) {
            const fullName = [submitForm.firstName, submitForm.lastName].filter(Boolean).join(' ');
            if (!fullName.trim()) {
                setSaveError('Please enter at least a first name for Individual customers.');
                return;
            }
            submitForm.companyName = fullName;
            submitForm.displayName = fullName;
            setForm(prev => ({ ...prev, companyName: fullName, displayName: fullName }));
        }
        
        if (submitForm.customerType === 'Business' && !submitForm.companyName?.trim()) {
            setSaveError('Company Name is required for Business customers.');
            return;
        }
        setLoading(true);
        setSaveError('');
        try {
            let savedCustomerId = id;
            if (isEdit) {
                await axios.put(`/api/customers/${id}`, submitForm);
                setSaveSuccess('Customer updated successfully!');
            } else {
                const res = await axios.post('/api/customers', submitForm);
                savedCustomerId = res.data.data._id;
                setSaveSuccess('Customer created successfully!');
            }

            // Check if user account needs to be created, but for now we'll do this on the edit view or let them click a button.

            setTimeout(() => navigate('/customers'), 800);
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                setSaveError(`Validation Error: ${errorData.errors.join(' | ')}`);
            } else {
                setSaveError(errorData?.message || 'Failed to save customer. Please try again.');
            }
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
        <div className="max-w-5xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/customers')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            {isEdit ? 'Edit Customer' : 'New Customer'}
                        </h1>
                        <p className="text-xs text-slate-500">
                            {isEdit ? 'Update customer information' : 'Create a new customer account'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isEdit && (
                        <button type="button" onClick={async () => {
                            try {
                                const res = await axios.post(`/api/customers/${id}/user`, {
                                    email: form.email,
                                    password: 'Customer@123'
                                });
                                setSaveSuccess(`Web portal enabled! Login: ${res.data.data.email} | Pass: ${res.data.data.password}`);
                            } catch (e) {
                                setSaveError(e.response?.data?.message || 'Failed to generate web portal login');
                            }
                        }} className="btn-secondary flex items-center gap-1.5" title="Generate login portal credentials">
                            Enable Web Access
                        </button>
                    )}
                    <button type="button" onClick={() => navigate('/customers')} className="btn-secondary">
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

                {/* ─── Top Section ─── */}
                <div className="px-8 py-6 border-b border-slate-200">
                    {/* Customer Type */}
                    <InputRow label="Customer Type">
                        <div className="flex items-center gap-6 pt-1.5">
                            {['Business', 'Individual'].map(type => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="customerType"
                                        value={type}
                                        checked={form.customerType === type}
                                        onChange={() => handleChange('customerType', type)}
                                        className="accent-blue-600 w-4 h-4"
                                    />
                                    <span className="text-sm text-slate-700">{type}</span>
                                </label>
                            ))}
                        </div>
                    </InputRow>

                    {/* Primary Contact */}
                    <InputRow label="Primary Contact">
                        <div className="flex gap-2">
                            <select
                                className="input-field w-28"
                                value={form.salutation}
                                onChange={e => handleChange('salutation', e.target.value)}
                            >
                                <option value="">Salutation</option>
                                {SALUTATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="First Name"
                                className="input-field"
                                value={form.firstName}
                                onChange={e => handleChange('firstName', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                className="input-field"
                                value={form.lastName}
                                onChange={e => handleChange('lastName', e.target.value)}
                            />
                        </div>
                    </InputRow>

                    {/* Company Name */}
                    <InputRow label={form.customerType === 'Individual' ? 'Company Name (optional)' : 'Company Name'} required={form.customerType === 'Business'}>
                        <input
                            type="text"
                            className="input-field max-w-md"
                            value={form.companyName}
                            onChange={e => handleChange('companyName', e.target.value)}
                            placeholder={form.customerType === 'Individual' ? 'Leave blank to auto-fill from name' : 'Company / Business Name'}
                        />
                        {form.customerType === 'Individual' && (
                            <p className="text-xs text-slate-400 mt-1">If blank, will use First + Last Name</p>
                        )}
                    </InputRow>

                    {/* Display Name */}
                    <InputRow label="Display Name" required>
                        <input
                            type="text"
                            className="input-field max-w-md"
                            value={form.displayName}
                            onChange={e => handleChange('displayName', e.target.value)}
                            placeholder="Select or type to add"
                        />
                    </InputRow>

                    {/* Currency */}
                    <InputRow label="Currency">
                        <select className="input-field max-w-xs" value={form.currency} onChange={e => handleChange('currency', e.target.value)}>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                        </select>
                    </InputRow>

                    {/* GSTIN */}
                    <InputRow label="GSTIN">
                        <input
                            type="text"
                            className="input-field max-w-md"
                            value={form.gstNumber}
                            onChange={e => handleChange('gstNumber', e.target.value)}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                        />
                    </InputRow>

                    {/* Email */}
                    <InputRow label="Email Address">
                        <input
                            type="email"
                            className="input-field max-w-md"
                            value={form.email}
                            onChange={e => handleChange('email', e.target.value)}
                            placeholder="customer@example.com"
                        />
                    </InputRow>

                    {/* Phone */}
                    <InputRow label="Phone">
                        <div className="flex gap-3">
                            <div className="flex gap-1.5 items-center">
                                <span className="text-sm text-slate-500 bg-slate-100 border border-slate-300 px-2 py-2 rounded-md">+91</span>
                                <input
                                    type="tel"
                                    placeholder="Work Phone"
                                    className="input-field w-44"
                                    value={form.workPhone}
                                    onChange={e => handleChange('workPhone', e.target.value)}
                                />
                            </div>
                            <div className="flex gap-1.5 items-center">
                                <span className="text-sm text-slate-500 bg-slate-100 border border-slate-300 px-2 py-2 rounded-md">+91</span>
                                <input
                                    type="tel"
                                    placeholder="Mobile"
                                    className="input-field w-44"
                                    value={form.mobile}
                                    onChange={e => handleChange('mobile', e.target.value)}
                                />
                            </div>
                        </div>
                    </InputRow>
                </div>

                {/* ─── Tabs ─── */}
                <div className="border-b border-slate-200 px-8">
                    <div className="flex gap-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Tab Content ─── */}
                <div className="px-8 py-6 min-h-80">

                    {/* Other Details Tab */}
                    {activeTab === 'other' && (
                        <div className="max-w-xl space-y-0 divide-y divide-slate-100">
                            <InputRow label="PAN">
                                <input
                                    type="text"
                                    className="input-field max-w-xs"
                                    value={form.panNumber}
                                    onChange={e => handleChange('panNumber', e.target.value)}
                                    placeholder="ABCDE1234F"
                                    maxLength={10}
                                />
                            </InputRow>
                            <InputRow label="Payment Terms">
                                <select className="input-field max-w-xs" value={form.paymentTerms} onChange={e => handleChange('paymentTerms', e.target.value)}>
                                    {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </InputRow>
                            <InputRow label="Credit Period (Days)">
                                <input
                                    type="number"
                                    className="input-field max-w-xs"
                                    value={form.creditPeriod}
                                    onChange={e => handleChange('creditPeriod', Number(e.target.value))}
                                    min={0}
                                />
                            </InputRow>
                            <InputRow label="Opening Balance (₹)">
                                <input
                                    type="number"
                                    className="input-field max-w-xs"
                                    value={form.openingBalance}
                                    onChange={e => handleChange('openingBalance', Number(e.target.value))}
                                    step="0.01"
                                    min={0}
                                />
                            </InputRow>
                            <InputRow label="Status">
                                <select className="input-field max-w-xs" value={form.status} onChange={e => handleChange('status', e.target.value)}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </InputRow>
                        </div>
                    )}

                    {/* Address Tab */}
                    {activeTab === 'address' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <AddressPanel type="billingAddress" label="Billing Address" form={form} handleAddressChange={handleAddressChange} />
                            <AddressPanel type="shippingAddress" label="Shipping Address" form={form} handleAddressChange={handleAddressChange} copyBillingToShipping={copyBillingToShipping} />

                        </div>
                    )}

                    {/* Contact Persons Tab */}
                    {activeTab === 'contacts' && (
                        <div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-y border-slate-200">
                                            <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Salutation</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">First Name</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Name</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Address</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Work Phone</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mobile</th>
                                            <th className="w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(Array.isArray(form?.contactPersons) ? form.contactPersons : []).map((cp, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-2 py-2">
                                                    <select className="input-field py-1.5 text-xs" value={cp.salutation} onChange={e => handleContactPersonChange(idx, 'salutation', e.target.value)}>
                                                        <option value=""></option>
                                                        {(Array.isArray(SALUTATIONS) ? SALUTATIONS : []).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-2"><input type="text" className="input-field py-1.5 text-sm" value={cp.firstName || ''} onChange={e => handleContactPersonChange(idx, 'firstName', e.target.value)} /></td>
                                                <td className="px-2 py-2"><input type="text" className="input-field py-1.5 text-sm" value={cp.lastName || ''} onChange={e => handleContactPersonChange(idx, 'lastName', e.target.value)} /></td>
                                                <td className="px-2 py-2"><input type="email" className="input-field py-1.5 text-sm" value={cp.email || ''} onChange={e => handleContactPersonChange(idx, 'email', e.target.value)} /></td>
                                                <td className="px-2 py-2"><input type="tel" className="input-field py-1.5 text-sm" value={cp.workPhone || ''} onChange={e => handleContactPersonChange(idx, 'workPhone', e.target.value)} /></td>
                                                <td className="px-2 py-2"><input type="tel" className="input-field py-1.5 text-sm" value={cp.mobile || ''} onChange={e => handleContactPersonChange(idx, 'mobile', e.target.value)} /></td>
                                                <td className="px-2 py-2 text-center">
                                                    <button type="button" onClick={() => removeContactPerson(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button type="button" onClick={addContactPerson}
                                className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                                <Plus size={16} className="mr-1.5" /> Add Contact Person
                            </button>
                        </div>
                    )}

                    {/* Remarks Tab */}
                    {activeTab === 'remarks' && (
                        <div className="max-w-2xl">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Remarks / Notes</label>
                            <textarea
                                className="input-field resize-none h-36"
                                placeholder="Internal notes, payment preferences, or any additional information..."
                                value={form.remarks}
                                onChange={e => handleChange('remarks', e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <div className="bg-slate-50/50 border-t border-slate-200 px-8 py-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400">All fields marked with <span className="text-red-500">*</span> are required</span>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => navigate('/customers')} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary px-8">
                            {loading ? 'Saving...' : 'Save Customer'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CustomerForm;
