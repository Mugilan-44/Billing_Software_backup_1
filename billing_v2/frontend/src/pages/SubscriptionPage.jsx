import { useEffect, useState } from 'react';
import axios from '../utils/api';
import { Calendar, ShieldCheck, Building2, MapPin, Phone, Mail, Award, Clock } from 'lucide-react';

const SubscriptionPage = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ company: null, subscription: null });
    const [error, setError] = useState('');

    const fetchSubscriptionDetails = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setData(res.data.data);
            } else {
                setError('Failed to load subscription details.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error fetching subscription.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptionDetails();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    const { company, subscription } = data;
    if (!subscription || !company) {
        return (
            <div className="p-6 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                <p className="font-semibold">No Subscription Record</p>
                <p className="text-sm">There is no company or subscription record associated with your account.</p>
            </div>
        );
    }

    // Calculations
    const startDateStr = subscription.startDate ? new Date(subscription.startDate).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
    }) : 'N/A';
    const expiryDateStr = subscription.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
    }) : 'N/A';

    const expiryDateObj = new Date(subscription.expiryDate);
    const startDateObj = new Date(subscription.startDate);
    const todayObj = new Date();

    const totalDays = Math.ceil((expiryDateObj - startDateObj) / (1000 * 60 * 60 * 24)) || 365;
    const daysLeft = Math.max(0, Math.ceil((expiryDateObj - todayObj) / (1000 * 60 * 60 * 24)));
    const percentRemaining = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));

    const address = company.address || {};
    const formattedAddress = [
        address.street,
        address.city,
        address.state,
        address.zipCode,
        address.country
    ].filter(Boolean).join(', ') || 'No address details provided.';

    const isStatusActive = subscription.status?.toUpperCase() === 'ACTIVE';

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Subscription & Plan</h1>
                <p className="text-sm text-slate-500">Manage your subscription, renew billing cycles, and review company profile details.</p>
            </div>

            {/* Plan Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3">
                {/* Visual Status */}
                <div className="p-6 md:p-8 bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-white/20 text-white text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                {subscription.plan || 'Premium'}
                            </span>
                            {isStatusActive && (
                                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <ShieldCheck size={12} /> Active
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">{daysLeft}</h2>
                        <p className="text-violet-200 text-xs font-medium uppercase tracking-wider mt-1">Days remaining</p>
                    </div>

                    <div className="mt-8 md:mt-0 pt-4 border-t border-white/10 text-xs text-violet-100 space-y-1">
                        <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="font-bold">{subscription.status || 'ACTIVE'}</span>
                        </div>

                    </div>
                </div>

                {/* Progress Details */}
                <div className="p-6 md:p-8 md:col-span-2 flex flex-col justify-between space-y-6">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Subscription Progress</h3>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-3.5 mb-2 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-violet-500 to-indigo-600 h-3.5 rounded-full transition-all duration-500" 
                                style={{ width: `${percentRemaining}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 font-medium">
                            <span>Started: {startDateStr}</span>
                            <span>Expires: {expiryDateStr}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                                <Calendar size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Renewal Date</p>
                                <p className="text-xs font-semibold text-slate-700">{expiryDateStr}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Clock size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Subscription Term</p>
                                <p className="text-xs font-semibold text-slate-700">1 Year (12 Months)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Company Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                        <Building2 size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Company & Representative Profile</h3>
                        <p className="text-xs text-slate-400">Information registered on account registration.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company Name</p>
                        <p className="text-sm font-semibold text-slate-800">{company.businessName || 'N/A'}</p>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Representative Name</p>
                        <p className="text-sm font-semibold text-slate-800">{company.ownerName || 'N/A'}</p>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GSTIN / Tax ID</p>
                        <p className="text-sm font-semibold text-slate-800">{company.gstNumber || company.gstin || 'N/A'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <Mail size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Business Email</p>
                            <p className="text-xs font-semibold text-slate-700">{company.email || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <Phone size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</p>
                            <p className="text-xs font-semibold text-slate-700">{company.phone || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex items-start gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                            <MapPin size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Address</p>
                            <p className="text-xs font-semibold text-slate-700 leading-relaxed">{formattedAddress}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
