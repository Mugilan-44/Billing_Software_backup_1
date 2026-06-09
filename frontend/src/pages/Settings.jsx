import { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Settings as SettingsIcon, Save, Image as ImageIcon, PenTool, QrCode } from 'lucide-react';

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const { register, handleSubmit, reset, watch, setValue } = useForm();
    const logoUrl = watch('logoUrl');
    const signatureUrl = watch('signatureUrl');
    const upiQrUrl = watch('upiQrUrl');

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
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setValue('logoUrl', res.data.url, { shouldDirty: true });
        } catch (err) {
            console.error('Error uploading logo:', err);
            alert('Failed to upload logo. Please try again.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSignatureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setValue('signatureUrl', res.data.url, { shouldDirty: true });
        } catch (err) {
            console.error('Error uploading signature:', err);
            alert('Failed to upload signature.');
        }
    };

    const handleUpiQrUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setValue('upiQrUrl', res.data.url, { shouldDirty: true });
        } catch (err) {
            console.error('Error uploading UPI QR:', err);
            alert('Failed to upload UPI QR code.');
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
        return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Company Settings</h1>
                    <p className="text-sm text-gray-500">Manage business details, logos, and invoice numbering.</p>
                </div>
                <SettingsIcon className="text-gray-400" size={28} />
            </div>

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                <div className="card">
                    <h3 className="text-lg font-medium text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center">
                        <ImageIcon size={18} className="mr-2 text-primary-500" /> Company Logo
                    </h3>
                    <div className="flex items-center space-x-6">
                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                            {logoUrl ? (
                                <img src={`${logoUrl}`} alt="Company Logo" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                                <span className="text-gray-400 text-sm">No Logo</span>
                            )}
                            {uploadingLogo && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                    <span className="text-sm font-medium animate-pulse">Uploading...</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-3">Upload your company logo for professional invoices.<br />Recommended size: 300x100px (Max 2MB, JPG/PNG).</p>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="block w-full text-sm text-gray-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-md file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-primary-50 file:text-primary-700
                                  hover:file:bg-primary-100 cursor-pointer"
                                onChange={handleLogoUpload}
                                disabled={uploadingLogo}
                            />
                        </div>
                    </div>
                </div>

                {/* Signature Upload */}
                <div className="card">
                    <h3 className="text-lg font-medium text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center">
                        <PenTool size={18} className="mr-2 text-primary-500" /> Authorised Signature
                    </h3>
                    <div className="flex items-center space-x-6">
                        <div className="w-40 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                            {signatureUrl ? (
                                <img src={`${signatureUrl}`} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                                <span className="text-gray-400 text-sm">No Signature</span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-3">Upload your authorised signature for invoices.<br />Recommended: transparent PNG (Max 2MB).</p>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                                onChange={handleSignatureUpload}
                            />
                        </div>
                    </div>
                </div>

                {/* UPI QR Upload */}
                <div className="card">
                    <h3 className="text-lg font-medium text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center">
                        <QrCode size={18} className="mr-2 text-primary-500" /> UPI QR Code
                    </h3>
                    <div className="flex items-center space-x-6">
                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                            {upiQrUrl ? (
                                <img src={`${upiQrUrl}`} alt="UPI QR" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                                <span className="text-gray-400 text-sm text-center">No QR Code</span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-3">Upload your UPI QR code for payment collection.<br />This will appear on invoices (Max 2MB, PNG/JPG).</p>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                                onChange={handleUpiQrUpload}
                            />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-medium text-gray-800 border-b border-gray-100 pb-3 mb-4">General Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company Name</label>
                            <input {...register('companyName')} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">GSTIN</label>
                            <input {...register('gstNumber')} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" {...register('email')} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <input {...register('phone')} className="mt-1 input-field" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-medium text-gray-800 border-b border-gray-100 pb-3 mb-4">Formats & Prefixes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Invoice Prefix</label>
                            <input {...register('invoicePrefix')} className="mt-1 input-field" placeholder="INV/" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Challan Prefix</label>
                            <input {...register('challanPrefix')} className="mt-1 input-field" placeholder="CHL/" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Prefix</label>
                            <input {...register('paymentPrefix')} className="mt-1 input-field" placeholder="PAY/" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Currency Symbol</label>
                            <input {...register('currency.symbol')} className="mt-1 input-field" placeholder="₹" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-medium text-gray-800 border-b border-gray-100 pb-3 mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Street Address</label>
                            <input {...register('address.street')} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">City</label>
                            <input {...register('address.city')} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">State</label>
                            <input {...register('address.state')} className="mt-1 input-field" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-medium text-gray-800 border-b border-gray-100 pb-3 mb-4">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                            <input {...register('bankDetails.bankName')} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Account Name</label>
                            <input {...register('bankDetails.accountName')} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Account Number</label>
                            <input {...register('bankDetails.accountNumber')} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                            <input {...register('bankDetails.ifscCode')} className="mt-1 input-field" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={loading} className="btn-primary flex items-center shadow-md">
                        <Save size={18} className="mr-2" />
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
