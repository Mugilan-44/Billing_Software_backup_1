import { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Settings as SettingsIcon, Save, Image as ImageIcon, CreditCard, QrCode, Building2, MapPin, Hash, Sun, Moon, Palette } from 'lucide-react';

const SectionCard = ({ icon: Icon, title, children }) => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Icon size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        <div className="px-6 py-5">{children}</div>
    </div>
);

const FieldRow = ({ label, hint, children }) => (
    <div className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0">
        <div className="w-44 shrink-0 pt-2">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <div className="flex-1">{children}</div>
    </div>
);

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingUpiQr, setUploadingUpiQr] = useState(false);
    const [uploadingSignature, setUploadingSignature] = useState(false);

    const { register, handleSubmit, reset, watch, setValue } = useForm();
    const logoUrl = watch('logoUrl');
    const upiQrUrl = watch('upiQrUrl');
    const upiId = watch('upiId');
    const signature = watch('signature');
    const theme = watch('theme') || 'light';

    useEffect(() => {
        if (!theme) return;
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            reset(res.data.data);
        } catch (error) {
            console.error('Error fetching settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        setUploadingLogo(true);
        try {
            const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setValue('logoUrl', res.data.url, { shouldDirty: true });
        } catch (err) {
            alert('Failed to upload logo. Please try again.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleUpiQrUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        setUploadingUpiQr(true);
        try {
            const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setValue('upiQrUrl', res.data.url, { shouldDirty: true });
        } catch (err) {
            alert('Failed to upload UPI QR code image. Please try again.');
        } finally {
            setUploadingUpiQr(false);
        }
    };
    const handleSignatureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        setUploadingSignature(true);
        try {
            const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setValue('signature', res.data.url, { shouldDirty: true });
        } catch (err) {
            alert('Failed to upload signature. Please try again.');
        } finally {
            setUploadingSignature(false);
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setSuccess('');
        try {
            await axios.put('/api/settings', data);
            setSuccess('Settings updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error updating settings', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !success) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-slate-500 text-sm">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-12">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Company Settings</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Configure your business details, branding, and payment options.</p>
                </div>
                <SettingsIcon className="text-slate-300" size={32} />
            </div>

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl flex items-center gap-2 font-medium text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {success}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {/* ── Logo ── */}
                <SectionCard icon={ImageIcon} title="Company Logo">
                    <div className="flex items-start gap-6">
                        <div className="relative w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                                <div className="text-center">
                                    <ImageIcon size={24} className="text-slate-300 mx-auto mb-1" />
                                    <span className="text-xs text-slate-400">No Logo</span>
                                </div>
                            )}
                            {uploadingLogo && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-600 mb-3">Upload your company logo. It will appear on all invoices, quotations, and PDFs.</p>
                            <p className="text-xs text-slate-400 mb-4">Recommended: 300×100px, Max 2MB, PNG/JPG</p>
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-semibold text-sm cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
                                <ImageIcon size={14} />
                                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                                <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                            </label>
                            {logoUrl && (
                                <button type="button" onClick={() => setValue('logoUrl', '', { shouldDirty: true })} className="ml-3 text-sm text-red-500 hover:text-red-700 font-medium">Remove</button>
                            )}
                        </div>
                    </div>
                </SectionCard>

                {/* ── Signature ── */}
                <SectionCard icon={ImageIcon} title="Authorized Signature">
                    <div className="flex items-start gap-6">
                        <div className="relative w-32 h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                            {signature ? (
                                <img src={signature} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                                <div className="text-center">
                                    <ImageIcon size={20} className="text-slate-300 mx-auto mb-1" />
                                    <span className="text-xs text-slate-400">No Signature</span>
                                </div>
                            )}
                            {uploadingSignature && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-600 mb-3">Upload your signature photo. If you check "Include Digital/Authorized Signature" on the invoice, this image will be rendered.</p>
                            <p className="text-xs text-slate-400 mb-4">Recommended: Transparent background PNG, Max 2MB</p>
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-semibold text-sm cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
                                <ImageIcon size={14} />
                                {uploadingSignature ? 'Uploading...' : 'Upload Signature'}
                                <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleSignatureUpload} disabled={uploadingSignature} />
                            </label>
                            {signature && (
                                <button type="button" onClick={() => setValue('signature', '', { shouldDirty: true })} className="ml-3 text-sm text-red-500 hover:text-red-700 font-medium">Remove</button>
                            )}
                        </div>
                    </div>
                </SectionCard>

                {/* ── Theme Preference ── */}
                <SectionCard icon={Palette} title="App Appearance">
                    <p className="text-sm text-slate-600 mb-4">Choose your preferred interface theme. This preference will be applied across all dashboard screens.</p>
                    <div className="flex gap-4">
                        <label className={`flex-1 max-w-[200px] border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all duration-300 ${theme === 'light' ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/5' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === 'light' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <Sun size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Light Mode</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Default styling</p>
                                </div>
                            </div>
                            <input type="radio" value="light" {...register('theme')} className="accent-blue-600 w-4 h-4 cursor-pointer" />
                        </label>

                        <label className={`flex-1 max-w-[200px] border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all duration-300 ${theme === 'dark' ? 'border-blue-500 bg-blue-900/10 shadow-md shadow-blue-500/5' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-blue-950 text-blue-400' : 'bg-slate-100 text-slate-500'}`}>
                                    <Moon size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Dark Mode</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Eye-friendly theme</p>
                                </div>
                            </div>
                            <input type="radio" value="dark" {...register('theme')} className="accent-blue-600 w-4 h-4 cursor-pointer" />
                        </label>
                    </div>
                </SectionCard>

                {/* ── General Details ── */}
                <SectionCard icon={Building2} title="General Details">
                    <div className="space-y-0">
                        <FieldRow label="Company Name">
                            <input {...register('companyName')} className="input-field max-w-md" placeholder="Your Company Name" />
                        </FieldRow>
                        <FieldRow label="GSTIN">
                            <input {...register('gstNumber')} className="input-field max-w-md font-mono" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                        </FieldRow>
                        <FieldRow label="Email">
                            <input type="email" {...register('email')} className="input-field max-w-md" placeholder="billing@company.com" />
                        </FieldRow>
                        <FieldRow label="Phone">
                            <input {...register('phone')} className="input-field max-w-xs" placeholder="+91 98765 43210" />
                        </FieldRow>
                        <FieldRow label="Website">
                            <input {...register('website')} className="input-field max-w-md" placeholder="https://www.yourcompany.com" />
                        </FieldRow>
                    </div>
                </SectionCard>

                {/* ── Prefixes & Currency ── */}
                <SectionCard icon={Hash} title="Number Formats & Currency">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Invoice Prefix</label>
                            <input {...register('invoicePrefix')} className="input-field" placeholder="INV/" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Challan Prefix</label>
                            <input {...register('challanPrefix')} className="input-field" placeholder="CHL/" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Prefix</label>
                            <input {...register('paymentPrefix')} className="input-field" placeholder="PAY/" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Currency Symbol</label>
                            <input {...register('currency.symbol')} className="input-field" placeholder="₹" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── Address ── */}
                <SectionCard icon={MapPin} title="Business Address">
                    <div className="space-y-0">
                        <FieldRow label="Street Address">
                            <input {...register('address.street')} className="input-field max-w-lg" placeholder="123, Main Street" />
                        </FieldRow>
                        <FieldRow label="City">
                            <input {...register('address.city')} className="input-field max-w-xs" />
                        </FieldRow>
                        <FieldRow label="State">
                            <input {...register('address.state')} className="input-field max-w-xs" />
                        </FieldRow>
                        <FieldRow label="PIN Code">
                            <input {...register('address.zipCode')} className="input-field max-w-[160px]" placeholder="600001" />
                        </FieldRow>
                    </div>
                </SectionCard>

                {/* ── Bank Details ── */}
                <SectionCard icon={CreditCard} title="Bank Account Details">
                    <p className="text-xs text-slate-400 mb-4">These details will appear on invoice PDFs for customer payment reference.</p>
                    <div className="space-y-0">
                        <FieldRow label="Bank Name">
                            <input {...register('bankDetails.bankName')} className="input-field max-w-md" placeholder="State Bank of India" />
                        </FieldRow>
                        <FieldRow label="Account Holder">
                            <input {...register('bankDetails.accountName')} className="input-field max-w-md" />
                        </FieldRow>
                        <FieldRow label="Account Number">
                            <input {...register('bankDetails.accountNumber')} className="input-field max-w-xs font-mono" />
                        </FieldRow>
                        <FieldRow label="IFSC Code">
                            <input {...register('bankDetails.ifscCode')} className="input-field max-w-xs font-mono uppercase" />
                        </FieldRow>
                        <FieldRow label="Branch">
                            <input {...register('bankDetails.branch')} className="input-field max-w-md" placeholder="Main Branch" />
                        </FieldRow>
                    </div>
                </SectionCard>

                {/* ── UPI Payment ── */}
                <SectionCard icon={QrCode} title="UPI Payment Settings">
                    <p className="text-xs text-slate-400 mb-5">Add your UPI ID and/or QR code so customers can pay directly from invoices.</p>
                    <div className="space-y-0">
                        <FieldRow label="UPI ID" hint="e.g. yourname@upi">
                            <input
                                {...register('upiId')}
                                className="input-field max-w-sm font-mono"
                                placeholder="yourname@paytm / 9876543210@upi"
                            />
                            {upiId && (
                                <p className="text-xs text-emerald-600 mt-1.5 font-medium flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                    UPI ID will appear on all invoices
                                </p>
                            )}
                        </FieldRow>
                        <FieldRow label="UPI QR Code" hint="Upload scanner image from your bank app">
                            <div className="flex items-start gap-5">
                                <div className="relative w-28 h-28 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                                    {upiQrUrl ? (
                                        <img src={upiQrUrl} alt="UPI QR" className="max-w-full max-h-full object-contain p-1" />
                                    ) : (
                                        <div className="text-center">
                                            <QrCode size={24} className="text-slate-300 mx-auto mb-1" />
                                            <span className="text-xs text-slate-400">QR Code</span>
                                        </div>
                                    )}
                                    {uploadingUpiQr && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 mb-3">Upload the QR code image from your banking app (Google Pay, PhonePe, Paytm, etc.)</p>
                                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-semibold text-sm cursor-pointer hover:bg-purple-100 transition-colors border border-purple-200">
                                        <QrCode size={14} />
                                        {uploadingUpiQr ? 'Uploading...' : 'Upload QR Image'}
                                        <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleUpiQrUpload} disabled={uploadingUpiQr} />
                                    </label>
                                    {upiQrUrl && (
                                        <button type="button" onClick={() => setValue('upiQrUrl', '', { shouldDirty: true })} className="ml-3 text-sm text-red-500 hover:text-red-700 font-medium">Remove</button>
                                    )}
                                </div>
                            </div>
                        </FieldRow>
                    </div>
                </SectionCard>

                {/* ── Save ── */}
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-8 shadow-lg shadow-blue-200 text-base font-bold py-3">
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
