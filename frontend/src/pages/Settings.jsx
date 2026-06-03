import { useState, useEffect, useRef } from 'react';
import axios, { API_URL } from '../utils/api';
import { useForm } from 'react-hook-form';

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    const cleanUrl = url.replace(/^\/+/, '');
    if (API_URL) {
        return `${API_URL}/${cleanUrl}`;
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return `http://localhost:5050/${cleanUrl}`;
    }
    return `/${cleanUrl}`;
};

const resizeAndCropImage = (file, targetWidth, targetHeight, mode = 'contain') => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (mode === 'crop') {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    const ctx = canvas.getContext('2d');
                    
                    const imgRatio = width / height;
                    const targetRatio = targetWidth / targetHeight;
                    
                    let sx = 0, sy = 0, sWidth = width, sHeight = height;
                    if (imgRatio > targetRatio) {
                        sWidth = height * targetRatio;
                        sx = (width - sWidth) / 2;
                    } else {
                        sHeight = width / targetRatio;
                        sy = (height - sHeight) / 2;
                    }
                    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
                } else {
                    const ratio = Math.min(targetWidth / width, targetHeight / height);
                    const scale = Math.min(ratio, 1);
                    canvas.width = Math.round(width * scale);
                    canvas.height = Math.round(height * scale);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }

                canvas.toBlob((blob) => {
                    if (blob) {
                        const croppedFile = new File([blob], file.name, {
                            type: file.type || 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(croppedFile);
                    } else {
                        reject(new Error('Canvas toBlob failed'));
                    }
                }, file.type || 'image/jpeg', 0.9);
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(file);
    });
};
import { 
    Settings as SettingsIcon, Save, Image as ImageIcon, CreditCard, QrCode, 
    Building2, MapPin, Hash, Sun, Moon, Palette, UserPlus, Trash2, Edit2, AlertCircle, CheckCircle2 
} from 'lucide-react';

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
    <div className="flex items-start gap-4 py-3 border-b border-slate-55 last:border-0">
        <div className="w-44 shrink-0 pt-2">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <div className="flex-1">{children}</div>
    </div>
);

const Settings = () => {
    const [activeTab, setActiveTab] = useState('business');
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingUpiQr, setUploadingUpiQr] = useState(false);
    const [uploadingSignature, setUploadingSignature] = useState(false);

    // Co-Admin State
    const [coAdmin, setCoAdmin] = useState(null);
    const [coAdminLoading, setCoAdminLoading] = useState(false);
    const [coAdminError, setCoAdminError] = useState('');
    const [coAdminSuccess, setCoAdminSuccess] = useState('');
    const [coAdminName, setCoAdminName] = useState('');
    const [coAdminEmail, setCoAdminEmail] = useState('');
    const [coAdminPassword, setCoAdminPassword] = useState('');
    const [editingCoAdmin, setEditingCoAdmin] = useState(false);

    const { register, handleSubmit, reset, watch, setValue } = useForm();
    const logoUrl = watch('logoUrl');
    const upiQrUrl = watch('upiQrUrl');
    const upiId = watch('upiId');
    const signature = watch('signature');
    const theme = watch('theme') || 'light';

    const docTypes = [
        { key: 'invoice', label: 'Invoice' },
        { key: 'quotation', label: 'Quotation' },
        { key: 'challan', label: 'Challan' },
        { key: 'salesOrder', label: 'Sales Order' },
        { key: 'purchaseBill', label: 'Purchase Bill' },
        { key: 'creditNote', label: 'Credit Note' }
    ];

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

    useEffect(() => {
        if (activeTab === 'coadmin') {
            fetchCoAdmin();
        }
    }, [activeTab]);

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

    const fetchCoAdmin = async () => {
        setCoAdminLoading(true);
        setCoAdminError('');
        try {
            const res = await axios.get('/api/settings/co-admin');
            if (res.data.success && res.data.data) {
                setCoAdmin(res.data.data);
                setCoAdminName(res.data.data.name || '');
                setCoAdminEmail(res.data.data.email || '');
            } else {
                setCoAdmin(null);
                setCoAdminName('');
                setCoAdminEmail('');
            }
        } catch (err) {
            console.error('Error fetching co-admin', err);
            if (err.response?.status !== 404) {
                setCoAdminError('Failed to load co-admin profile.');
            }
        } finally {
            setCoAdminLoading(false);
        }
    };

    const handleSaveCoAdmin = async (e) => {
        e.preventDefault();
        setCoAdminLoading(true);
        setCoAdminError('');
        setCoAdminSuccess('');
        try {
            if (coAdmin) {
                const payload = { name: coAdminName, email: coAdminEmail };
                if (coAdminPassword) payload.password = coAdminPassword;
                const res = await axios.put('/api/settings/co-admin', payload);
                if (res.data.success) {
                    setCoAdminSuccess('Co-Admin updated successfully!');
                    setCoAdmin(res.data.data);
                    setCoAdminPassword('');
                    setEditingCoAdmin(false);
                }
            } else {
                if (!coAdminPassword) {
                    setCoAdminError('Password is required when creating a Co-Admin.');
                    setCoAdminLoading(false);
                    return;
                }
                const res = await axios.post('/api/settings/co-admin', {
                    name: coAdminName,
                    email: coAdminEmail,
                    password: coAdminPassword
                });
                if (res.data.success) {
                    setCoAdminSuccess('Co-Admin created successfully!');
                    setCoAdmin(res.data.data);
                    setCoAdminPassword('');
                    setEditingCoAdmin(false);
                }
            }
        } catch (err) {
            console.error('Error saving co-admin', err);
            setCoAdminError(err.response?.data?.message || 'Failed to save Co-Admin settings.');
        } finally {
            setCoAdminLoading(false);
        }
    };

    const handleDeleteCoAdmin = async () => {
        if (!window.confirm('Are you sure you want to delete this Co-Admin account? This action cannot be undone.')) return;
        setCoAdminLoading(true);
        setCoAdminError('');
        setCoAdminSuccess('');
        try {
            const res = await axios.delete('/api/settings/co-admin');
            if (res.data.success) {
                setCoAdminSuccess('Co-Admin deleted successfully.');
                setCoAdmin(null);
                setCoAdminName('');
                setCoAdminEmail('');
                setCoAdminPassword('');
                setEditingCoAdmin(false);
            }
        } catch (err) {
            console.error('Error deleting co-admin', err);
            setCoAdminError(err.response?.data?.message || 'Failed to delete Co-Admin.');
        } finally {
            setCoAdminLoading(false);
        }
    };

    // Cropper State
    const [cropperOpen, setCropperOpen] = useState(false);
    const [cropperImage, setCropperImage] = useState(null);
    const [cropperParams, setCropperParams] = useState({ targetWidth: 300, targetHeight: 100, cropWidth: 300, cropHeight: 100 });
    const [cropperType, setCropperType] = useState(''); // 'logo', 'signature', 'upiQr'
    const [originalFileName, setOriginalFileName] = useState('');

    const triggerCropper = (file, type, targetWidth, targetHeight, cropWidth, cropHeight) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setCropperImage(e.target.result);
            setCropperType(type);
            setCropperParams({ targetWidth, targetHeight, cropWidth, cropHeight });
            setOriginalFileName(file.name);
            setCropperOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        triggerCropper(file, 'logo', 300, 100, 300, 100);
        e.target.value = '';
    };

    const handleUpiQrUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        triggerCropper(file, 'upiQr', 250, 250, 200, 200);
        e.target.value = '';
    };

    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        triggerCropper(file, 'signature', 300, 100, 300, 100);
        e.target.value = '';
    };

    const handleCropComplete = async (blob) => {
        setCropperOpen(false);
        const file = new File([blob], originalFileName || 'image.png', { type: 'image/png' });
        const formData = new FormData();
        formData.append('image', file);

        if (cropperType === 'logo') {
            setUploadingLogo(true);
            try {
                const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                setValue('logoUrl', res.data.url, { shouldDirty: true });
            } catch (err) {
                console.error('Logo upload error:', err);
                alert('Failed to upload logo. Please try again.');
            } finally {
                setUploadingLogo(false);
            }
        } else if (cropperType === 'upiQr') {
            setUploadingUpiQr(true);
            try {
                const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                setValue('upiQrUrl', res.data.url, { shouldDirty: true });
            } catch (err) {
                console.error('QR code upload error:', err);
                alert('Failed to upload UPI QR code image. Please try again.');
            } finally {
                setUploadingUpiQr(false);
            }
        } else if (cropperType === 'signature') {
            setUploadingSignature(true);
            try {
                const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                setValue('signature', res.data.url, { shouldDirty: true });
            } catch (err) {
                console.error('Signature upload error:', err);
                alert('Failed to upload signature. Please try again.');
            } finally {
                setUploadingSignature(false);
            }
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
                    <h1 className="text-xl font-bold text-slate-900 font-sans">Company Settings</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Configure your business details, custom document sequences, and Co-Admins.</p>
                </div>
                <SettingsIcon className="text-slate-300" size={32} />
            </div>

            {/* Custom Tab Bar */}
            <div className="flex border border-slate-200 bg-white rounded-2xl p-1 shadow-sm gap-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('business')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 ${activeTab === 'business' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                    Business Settings
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('numbering')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 ${activeTab === 'numbering' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                    Numbering Formats
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('coadmin')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 ${activeTab === 'coadmin' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                    Co-Admin Management
                </button>
            </div>

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl flex items-center gap-2 font-medium text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {success}
                </div>
            )}

            {/* ── Business Settings Tab ── */}
            {activeTab === 'business' && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Logo */}
                    <SectionCard icon={ImageIcon} title="Company Logo">
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="relative w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                                {logoUrl ? (
                                    <img src={getImageUrl(logoUrl)} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
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
                                <p className="text-sm text-slate-650 mb-3">Upload your company logo. It will appear on all invoices, quotations, and PDFs.</p>
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

                    {/* Signature */}
                    <SectionCard icon={ImageIcon} title="Authorized Signature">
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="relative w-32 h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                                {signature ? (
                                    <img src={getImageUrl(signature)} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
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
                                <p className="text-sm text-slate-650 mb-3">Upload your signature photo. If enabled, this image will be rendered on document PDFs.</p>
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

                    {/* App Appearance */}
                    <SectionCard icon={Palette} title="App Appearance">
                        <p className="text-sm text-slate-650 mb-4">Choose your preferred interface theme. This preference will be applied across all dashboard screens.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <label className={`flex-1 border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all duration-300 ${theme === 'light' ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/5' : 'border-slate-200 hover:border-slate-300'}`}>
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

                            <label className={`flex-1 border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all duration-300 ${theme === 'dark' ? 'border-blue-500 bg-blue-900/10 shadow-md shadow-blue-500/5' : 'border-slate-200 hover:border-slate-300'}`}>
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

                    {/* General Details */}
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

                    {/* Address */}
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

                    {/* Bank Account */}
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

                    {/* UPI Settings */}
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
                                <div className="flex flex-col sm:flex-row items-start gap-5">
                                    <div className="relative w-28 h-28 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                                        {upiQrUrl ? (
                                            <img src={getImageUrl(upiQrUrl)} alt="UPI QR" className="max-w-full max-h-full object-contain p-1" />
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
                                        <p className="text-sm text-slate-650 mb-3">Upload the QR code image from your banking app (Google Pay, PhonePe, Paytm, etc.)</p>
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

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="btn-primary flex items-center gap-2 px-8 shadow-lg shadow-blue-200 text-base font-bold py-3">
                            <Save size={18} />
                            Save Settings
                        </button>
                    </div>
                </form>
            )}

            {/* ── Numbering Formats Tab ── */}
            {activeTab === 'numbering' && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-5">
                        <div className="flex items-center gap-3 mb-3">
                            <Hash className="text-blue-600" size={20} />
                            <h3 className="text-base font-bold text-slate-800">Auto-Numbering Configurations</h3>
                        </div>
                        <p className="text-sm text-slate-550 leading-relaxed">
                            Configure automatic document number sequences separately for <strong>Tax</strong> and <strong>Tax Free</strong> systems. 
                            If <strong>Auto Generate</strong> is checked, document numbers are generated incrementally (e.g. prefix + starting number padded to standard length). 
                            If unchecked, you can type values manually for that mode during creation.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {docTypes.map(doc => (
                            <div key={doc.key} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-slate-800">{doc.label} Numbering Format</h4>
                                </div>
                                <div className="p-6 divide-y divide-slate-105">
                                    {/* With Tax System */}
                                    <div className="py-4 first:pt-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax (WT) System Settings</span>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                                    {...register(`numberingSettings.${doc.key}.withTax.auto`)} 
                                                />
                                                <span className="text-xs font-semibold text-slate-700">Auto Generate</span>
                                            </label>
                                        </div>
                                        {watch(`numberingSettings.${doc.key}.withTax.auto`) && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prefix</label>
                                                    <input {...register(`numberingSettings.${doc.key}.withTax.prefix`)} className="input-field font-mono" placeholder="INV-WT-" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Next Number</label>
                                                    <input type="number" {...register(`numberingSettings.${doc.key}.withTax.nextNumber`, { valueAsNumber: true })} className="input-field" placeholder="1" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Digit Padding (Digits)</label>
                                                    <input type="number" {...register(`numberingSettings.${doc.key}.withTax.digits`, { valueAsNumber: true })} className="input-field" placeholder="4" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Without Tax System */}
                                    <div className="py-4 last:pb-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax Free (NT) System Settings</span>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                                    {...register(`numberingSettings.${doc.key}.withoutTax.auto`)} 
                                                />
                                                <span className="text-xs font-semibold text-slate-700">Auto Generate</span>
                                            </label>
                                        </div>
                                        {watch(`numberingSettings.${doc.key}.withoutTax.auto`) && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prefix</label>
                                                    <input {...register(`numberingSettings.${doc.key}.withoutTax.prefix`)} className="input-field font-mono" placeholder="INV-NT-" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Next Number</label>
                                                    <input type="number" {...register(`numberingSettings.${doc.key}.withoutTax.nextNumber`, { valueAsNumber: true })} className="input-field" placeholder="1" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Digit Padding (Digits)</label>
                                                    <input type="number" {...register(`numberingSettings.${doc.key}.withoutTax.digits`, { valueAsNumber: true })} className="input-field" placeholder="4" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="btn-primary flex items-center gap-2 px-8 shadow-lg shadow-blue-200 text-base font-bold py-3">
                            <Save size={18} />
                            Save Numbering Rules
                        </button>
                    </div>
                </form>
            )}

            {/* ── Co-Admin Management Tab ── */}
            {activeTab === 'coadmin' && (
                <div className="space-y-5">
                    {/* Overview Box */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <UserPlus className="text-blue-600" size={20} />
                            <h3 className="text-base font-bold text-slate-800">Co-Admin Provisioning</h3>
                        </div>
                        <p className="text-sm text-slate-550 leading-relaxed mb-2">
                            To assist with daily operations, you can register a single Co-Admin account. 
                            This Co-Admin shares your company space, configurations, transaction histories, clients, items, and billing/tax setups.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 mt-4">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                            <div className="text-xs text-amber-800 leading-normal">
                                <strong>System Limitation:</strong> You are allowed a maximum of <strong>one (1) Co-Admin account</strong> per company. To invite a different user, you must delete the current Co-Admin profile.
                            </div>
                        </div>
                    </div>

                    {coAdminSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl flex items-center gap-2 font-medium text-sm">
                            <CheckCircle2 size={16} />
                            {coAdminSuccess}
                        </div>
                    )}

                    {coAdminError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3 rounded-xl flex items-center gap-2 font-medium text-sm">
                            <AlertCircle size={16} />
                            {coAdminError}
                        </div>
                    )}

                    {coAdminLoading && !coAdmin && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <span className="text-xs text-slate-400">Retrieving account status...</span>
                        </div>
                    )}

                    {/* Account Info Profile or Empty Form */}
                    {!coAdminLoading && (
                        <>
                            {coAdmin && !editingCoAdmin ? (
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <h4 className="text-sm font-bold text-slate-800">Active Co-Admin Account</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setEditingCoAdmin(true)} 
                                                className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1 bg-white hover:bg-slate-50"
                                            >
                                                <Edit2 size={12} />
                                                Edit Credentials
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={handleDeleteCoAdmin} 
                                                className="btn-danger px-3 py-1.5 text-xs flex items-center gap-1"
                                            >
                                                <Trash2 size={12} />
                                                Revoke Account
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</span>
                                                <span className="text-sm font-semibold text-slate-800">{coAdmin.name}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Username</span>
                                                <span className="text-sm font-semibold text-slate-800 font-mono">{coAdmin.email}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">System Privilege</span>
                                                <span className="inline-block text-[10px] font-bold bg-blue-100 text-blue-750 px-2 py-0.5 rounded">ADMIN (CO-ADMIN)</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Created At</span>
                                                <span className="text-sm font-semibold text-slate-600">{new Date(coAdmin.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-800">
                                            {coAdmin ? 'Edit Co-Admin Credentials' : 'Provision Co-Admin Account'}
                                        </h4>
                                        {coAdmin && (
                                            <button 
                                                type="button" 
                                                onClick={() => { setEditingCoAdmin(false); fetchCoAdmin(); }} 
                                                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                                            >
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>
                                    <form onSubmit={handleSaveCoAdmin} className="p-6 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                                                <input 
                                                    type="text" 
                                                    className="input-field" 
                                                    placeholder="John Doe" 
                                                    required 
                                                    value={coAdminName} 
                                                    onChange={e => setCoAdminName(e.target.value)} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                                                <input 
                                                    type="email" 
                                                    className="input-field" 
                                                    placeholder="coadmin@company.com" 
                                                    required 
                                                    value={coAdminEmail} 
                                                    onChange={e => setCoAdminEmail(e.target.value)} 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                Password {coAdmin && <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>}
                                            </label>
                                            <input 
                                                type="password" 
                                                className="input-field max-w-sm" 
                                                placeholder="••••••••" 
                                                required={!coAdmin} 
                                                value={coAdminPassword} 
                                                onChange={e => setCoAdminPassword(e.target.value)} 
                                                minLength={6}
                                            />
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            <button 
                                                type="submit" 
                                                disabled={coAdminLoading} 
                                                className="btn-primary flex items-center gap-2 px-6 shadow-md"
                                            >
                                                <Save size={16} />
                                                {coAdminLoading ? 'Saving...' : coAdmin ? 'Update Co-Admin' : 'Create Co-Admin'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <ImageCropperModal
                isOpen={cropperOpen}
                imageSrc={cropperImage}
                targetWidth={cropperParams.targetWidth}
                targetHeight={cropperParams.targetHeight}
                cropWidth={cropperParams.cropWidth}
                cropHeight={cropperParams.cropHeight}
                onCrop={handleCropComplete}
                onClose={() => setCropperOpen(false)}
            />
        </div>
    );
};

const ImageCropperModal = ({ isOpen, imageSrc, targetWidth, targetHeight, cropWidth: initialCropWidth, cropHeight: initialCropHeight, onCrop, onClose }) => {
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(0.1);
    const [maxScale, setMaxScale] = useState(2);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
    const [isLoaded, setIsLoaded] = useState(false);
    const [containerSize, setContainerSize] = useState({ width: 340, height: 280 });
    
    const containerRef = useRef(null);
    const imgRef = useRef(null);

    // Calculate crop dimensions inside container dynamically
    const aspectRatio = targetWidth / targetHeight;
    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;
    
    // We want the crop box to have some margin (e.g. 24px) from container edges
    const maxCropWidth = containerWidth - 48;
    const maxCropHeight = containerHeight - 48;
    
    let cropWidth = initialCropWidth;
    let cropHeight = initialCropHeight;
    
    if (cropWidth > maxCropWidth || cropHeight > maxCropHeight) {
        if (maxCropWidth / aspectRatio <= maxCropHeight) {
            cropWidth = maxCropWidth;
            cropHeight = maxCropWidth / aspectRatio;
        } else {
            cropHeight = maxCropHeight;
            cropWidth = maxCropHeight * aspectRatio;
        }
    }
    
    const B_X = (containerWidth - cropWidth) / 2;
    const B_Y = (containerHeight - cropHeight) / 2;

    // Measure container size on mount/open
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const w = rect.width || 340;
            const h = Math.min(300, w * 0.85); // responsive height
            setContainerSize({ width: w, height: h });
            setIsLoaded(false);
        }
    }, [isOpen, imageSrc]);

    // Handle image loading
    const handleImageLoad = (e) => {
        const img = e.target || imgRef.current;
        if (!img) return;
        
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        if (!naturalW || !naturalH) return;
        
        setImgDimensions({ width: naturalW, height: naturalH });
        
        // Calculate min scale to fully cover crop box
        const minS = Math.max(cropWidth / naturalW, cropHeight / naturalH);
        setMinScale(minS);
        setMaxScale(Math.max(minS * 4, 3));
        
        // Set initial scale to cover crop box
        setScale(minS);
        
        // Center the image
        const renderW = naturalW * minS;
        const renderH = naturalH * minS;
        const initialX = B_X + (cropWidth - renderW) / 2;
        const initialY = B_Y + (cropHeight - renderH) / 2;
        setOffset({ x: initialX, y: initialY });
        setIsLoaded(true);
    };

    // If image complete check (for cached images)
    useEffect(() => {
        if (isOpen && imgRef.current && imgRef.current.complete) {
            handleImageLoad({ target: imgRef.current });
        }
    }, [isOpen, imageSrc, imgRef.current]);

    const handleMouseDown = (e) => {
        if (!isLoaded) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !isLoaded) return;
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        const clamped = clampOffset(newX, newY, scale, imgDimensions.width, imgDimensions.height, cropWidth, cropHeight, B_X, B_Y);
        setOffset(clamped);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e) => {
        if (!isLoaded) return;
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging || !isLoaded || e.touches.length !== 1) return;
        const newX = e.touches[0].clientX - dragStart.x;
        const newY = e.touches[0].clientY - dragStart.y;
        const clamped = clampOffset(newX, newY, scale, imgDimensions.width, imgDimensions.height, cropWidth, cropHeight, B_X, B_Y);
        setOffset(clamped);
    };

    const handleZoomChange = (newScale) => {
        const centerX = B_X + cropWidth / 2;
        const centerY = B_Y + cropHeight / 2;
        
        const newX = centerX - (centerX - offset.x) * (newScale / scale);
        const newY = centerY - (centerY - offset.y) * (newScale / scale);
        
        const clamped = clampOffset(newX, newY, newScale, imgDimensions.width, imgDimensions.height, cropWidth, cropHeight, B_X, B_Y);
        setScale(newScale);
        setOffset(clamped);
    };

    const clampOffset = (x, y, currentScale, imgW, imgH, cropW, cropH, bx, by) => {
        const renderedW = imgW * currentScale;
        const renderedH = imgH * currentScale;
        
        let minX = bx - (renderedW - cropW);
        let maxX = bx;
        let minY = by - (renderedH - cropH);
        let maxY = by;
        
        if (renderedW < cropW) {
            minX = bx + (cropW - renderedW) / 2;
            maxX = minX;
        }
        if (renderedH < cropH) {
            minY = by + (cropH - renderedH) / 2;
            maxY = minY;
        }
        
        return {
            x: Math.min(Math.max(x, minX), maxX),
            y: Math.min(Math.max(y, minY), maxY)
        };
    };

    const handleSave = () => {
        if (!isLoaded || !imgDimensions.width || !imgDimensions.height) return;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        const img = imgRef.current;

        // Math to crop precisely
        const sx = (B_X - offset.x) / scale;
        const sy = (B_Y - offset.y) / scale;
        const sWidth = cropWidth / scale;
        const sHeight = cropHeight / scale;

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        canvas.toBlob((blob) => {
            if (blob) {
                onCrop(blob);
            }
        }, 'image/png');
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider font-sans">Crop Image</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 text-xs font-semibold">Cancel</button>
                </div>
                <div className="p-6 flex flex-col items-center space-y-6">
                    <div 
                        ref={containerRef}
                        className="relative bg-slate-950 overflow-hidden cursor-move select-none rounded-2xl border border-slate-200 dark:border-slate-800 w-full flex items-center justify-center"
                        style={{ height: containerHeight }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUp}
                    >
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Crop Preview"
                            onLoad={handleImageLoad}
                            draggable="false"
                            className="absolute max-w-none origin-top-left select-none pointer-events-none"
                            style={{
                                width: imgDimensions.width * scale,
                                height: imgDimensions.height * scale,
                                left: offset.x,
                                top: offset.y,
                                opacity: isLoaded ? 1 : 0,
                                transition: isLoaded ? 'opacity 0.2s ease-in' : 'none'
                            }}
                        />
                        {!isLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        {isLoaded && (
                            <>
                                <div className="absolute bg-black/60 pointer-events-none" style={{ left: 0, top: 0, width: containerWidth, height: B_Y }} />
                                <div className="absolute bg-black/60 pointer-events-none" style={{ left: 0, bottom: 0, width: containerWidth, height: containerHeight - B_Y - cropHeight }} />
                                <div className="absolute bg-black/60 pointer-events-none" style={{ left: 0, top: B_Y, width: B_X, height: cropHeight }} />
                                <div className="absolute bg-black/60 pointer-events-none" style={{ right: 0, top: B_Y, width: containerWidth - B_X - cropWidth, height: cropHeight }} />
                                <div 
                                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.15)] pointer-events-none" 
                                    style={{ left: B_X, top: B_Y, width: cropWidth, height: cropHeight }}
                                >
                                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
                                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
                                </div>
                            </>
                        )}
                    </div>

                    {isLoaded && (
                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">
                                <span>Adjust Zoom</span>
                                <span>{Math.round((scale / minScale) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min={minScale}
                                max={maxScale}
                                step={(maxScale - minScale) / 100}
                                value={scale}
                                onChange={(e) => handleZoomChange(Number(e.target.value))}
                                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none"
                            />
                        </div>
                    )}

                    <button 
                        type="button"
                        onClick={handleSave} 
                        disabled={!isLoaded}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all active:scale-[0.98] text-sm font-sans"
                    >
                        Crop & Upload
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
