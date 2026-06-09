import { useState, useEffect } from 'react';
import axios from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
    Plus, Search, ToggleLeft, ToggleRight, Users, ShieldAlert,
    Building2, CheckCircle, Edit3, Trash2, Key, Calendar, MapPin,
    Lock, Unlock, RefreshCw, X, ShieldCheck
} from 'lucide-react';

const AdminUsers = () => {
    const { user: currentUser } = useAuth();
    // States
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalAdmins: 0, activeAdmins: 0, deactiveAdmins: 0 });
    const [admins, setAdmins] = useState([]);
    const [search, setSearch] = useState('');

    // Create Admin Form Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        companyName: '',
        ownerName: '', // Representative Name
        phone: '',
        email: '', // Business Email
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        subscriptionMonths: 12,
        loginEmail: '', // Account ID
        password: ''
    });

    // Edit Admin Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [editForm, setEditForm] = useState({
        companyName: '',
        ownerName: '',
        phone: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        password: '', // blank unless changing
        renewMonths: 0 // 0 means no renewal, 12 means renew 1 year
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    // Permissions Modal state (kept for system capabilities)
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [currentAdminForPermissions, setCurrentAdminForPermissions] = useState(null);
    const [tempPermissions, setTempPermissions] = useState({});

    const getToken = () => localStorage.getItem('token');
    const authHeader = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

    const fetchData = async () => {
        try {
            const [statsRes, adminsRes] = await Promise.all([
                axios.get('/api/super-admin/stats', authHeader()),
                axios.get('/api/super-admin/admins', authHeader())
            ]);
            setStats(statsRes.data.data);
            setAdmins(adminsRes.data.data);
        } catch (error) {
            console.error('Error fetching Prolync Admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Create Admin + Company Handler
    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.companyName.trim() || !form.ownerName.trim() || !form.loginEmail.trim() || !form.password.trim()) {
            setError('Company Name, Representative Name, Account ID, and Password are required.');
            return;
        }
        setSaving(true);
        try {
            await axios.post('/api/super-admin/admins/create-combined', form, authHeader());
            await fetchData();
            setForm({
                companyName: '',
                ownerName: '',
                phone: '',
                email: '',
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: 'India',
                subscriptionMonths: 12,
                loginEmail: '',
                password: ''
            });
            setShowCreateModal(false);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to register company account');
        } finally {
            setSaving(false);
        }
    };

    // Edit / Update Admin Handler
    const handleUpdateAdmin = async (e) => {
        e.preventDefault();
        setEditError('');
        setSavingEdit(true);
        try {
            await axios.put(`/api/super-admin/admins/${editingAdmin._id}/update-combined`, editForm, authHeader());
            await fetchData();
            setShowEditModal(false);
            setEditingAdmin(null);
        } catch (e) {
            setEditError(e.response?.data?.message || 'Failed to update company account');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleOpenEditModal = (admin) => {
        setEditingAdmin(admin);
        const company = admin.companyId || {};
        const address = company.address || {};
        setEditForm({
            companyName: company.businessName || '',
            ownerName: admin.name || '',
            phone: company.phone || '',
            email: company.email || '',
            street: address.street || '',
            city: address.city || '',
            state: address.state || '',
            zipCode: address.zipCode || '',
            country: address.country || 'India',
            password: '',
            renewMonths: 0
        });
        setShowEditModal(true);
    };

    const toggleAdminActive = async (id) => {
        try {
            await axios.patch(`/api/super-admin/users/${id}/toggle`, {}, authHeader());
            fetchData();
        } catch (e) {
            console.error('Error toggling status', e);
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (window.confirm('Are you sure you want to permanently delete this company account and all associated tenant data? This cannot be undone.')) {
            try {
                await axios.delete(`/api/super-admin/users/${id}`, authHeader());
                fetchData();
            } catch (e) {
                console.error('Failed to delete user', e);
                alert('Deletion failed');
            }
        }
    };

    // Permissions Modals
    const openPermissionsModal = (admin) => {
        setCurrentAdminForPermissions(admin);
        const defaults = {
            customers: true, vendors: true, items: true, quotations: true,
            salesOrders: true, invoices: true, challans: true, payments: true,
            creditNotes: true, purchaseBills: true, expenses: true, stock: true, reports: true,
            overallTax: true, withTax: true, noTax: true
        };
        setTempPermissions({
            ...defaults,
            ...(admin.permissions || {})
        });
        setShowPermissionsModal(true);
    };

    const handleSavePermissions = async () => {
        try {
            await axios.patch(`/api/super-admin/admins/${currentAdminForPermissions._id}/permissions`, { 
                permissions: tempPermissions
            }, authHeader());
            fetchData();
            setShowPermissionsModal(false);
        } catch (e) {
            console.error('Error saving permissions', e);
            alert('Failed to save permissions');
        }
    };

    const filteredAdmins = (admins || []).filter(a =>
        a && (
            (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.companyId?.businessName || '').toLowerCase().includes(search.toLowerCase())
        )
    );

    const sortedAdmins = [...filteredAdmins].sort((a, b) => {
        if (!a || !b) return 0;
        const dateA = a.subscription?.expiryDate && !isNaN(new Date(a.subscription.expiryDate).getTime()) ? new Date(a.subscription.expiryDate) : new Date(8640000000000000);
        const dateB = b.subscription?.expiryDate && !isNaN(new Date(b.subscription.expiryDate).getTime()) ? new Date(b.subscription.expiryDate) : new Date(8640000000000000);
        return dateA - dateB;
    });

    const cards = [
        { label: 'Total Companies', value: stats?.totalAdmins ?? 0, icon: <Users size={20} />, color: 'bg-slate-50 border-slate-200/60 text-[#1d1d1f]' },
        { label: 'Active Companies', value: stats?.activeAdmins ?? 0, icon: <CheckCircle size={20} />, color: 'bg-[#34c759]/10 border-[#34c759]/20 text-[#34c759]' },
        { label: 'Deactive Companies', value: stats?.deactiveAdmins ?? 0, icon: <ShieldAlert size={20} />, color: 'bg-[#ff3b30]/10 border-[#ff3b30]/20 text-[#ff3b30]' },
    ];

    const getSubscriptionProgress = (sub) => {
        if (!sub || !sub.startDate || !sub.expiryDate) {
            return { text: 'No Subscription', dateStr: 'Ends: —', color: 'text-slate-400', pct: 0, daysLeft: 0, status: 'EXPIRED' };
        }
        const now = new Date();
        const start = new Date(sub.startDate);
        const expiry = new Date(sub.expiryDate);

        if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
            return { text: 'Invalid Dates', dateStr: 'Ends: —', color: 'text-slate-400', pct: 0, daysLeft: 0, status: 'EXPIRED' };
        }
        
        const totalDuration = expiry - start;
        const elapsed = now - start;
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        let pct = 0;
        if (totalDuration > 0) {
            pct = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
        }
        
        const dateStr = `Ends: ${expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

        if (daysLeft <= 0) {
            return { text: 'Expired', dateStr, color: 'text-[#ff3b30]', pct: 100, daysLeft: 0, status: 'EXPIRED' };
        } else if (daysLeft <= 30) {
            return { text: `${daysLeft} days left`, dateStr, color: 'text-[#ff9500]', pct, daysLeft, status: 'EXPIRING' };
        } else {
            return { text: `${daysLeft} days left`, dateStr, color: 'text-[#34c759]', pct, daysLeft, status: 'ACTIVE' };
        }
    };

    return (
        <div className="space-y-10 font-sans bg-[#f5f5f7] text-[#1d1d1f] p-6 md:p-10 min-h-screen">
            {/* Header & Primary Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-[#1d1d1f] sm:text-5xl">Prolync Company Control</h1>
                    <p className="text-[#86868b] text-base mt-2 font-medium">Unified license manager, client deployments, and subscription controls.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-bold transition-all shadow-md shadow-[#0071e3]/10 transform active:scale-95">
                        <Plus size={16} /> Add Company
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map(card => (
                    <div key={card.label} className={`bg-white hover:bg-white/80 transition-all duration-300 rounded-3xl border border-slate-100 p-8 flex items-center justify-between shadow-lg shadow-slate-100/40`}>
                        <div>
                            <div className="text-xs font-bold text-[#86868b] uppercase tracking-widest">{card.label}</div>
                            <div className="text-4xl font-black text-[#1d1d1f] mt-3 tracking-tight">{loading ? '—' : card.value}</div>
                        </div>
                        <div className={`p-4 rounded-2xl ${card.color.split(' ')[0]} ${card.color.split(' ')[2]}`}>
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main unified table: Prolync Admin Control */}
            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden flex flex-col shadow-xl shadow-slate-150/40">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#f9f9fb]">
                    <div>
                        <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                            <Building2 size={20} className="text-[#0071e3]" />
                            Prolync Company Control <span className="bg-[#f5f5f7] text-slate-600 text-xs px-3 py-1 rounded-full font-bold ml-1">{admins.length}</span>
                        </h2>
                    </div>
                    <div className="relative max-w-[280px] w-full">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search by name, email, company..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[#f5f5f7] border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-[#1d1d1f] text-sm placeholder-slate-450 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-[#86868b] bg-[#f9f9fb]">
                                <th className="px-6 py-4">Client / Representative</th>
                                <th className="px-6 py-4">Business Details</th>
                                <th className="px-6 py-4">Subscription Progress</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-[#424245]">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-16 text-center text-[#86868b] font-medium">Loading control dashboard...</td></tr>
                            ) : sortedAdmins.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-16 text-center text-[#86868b] font-medium">No company accounts found matching your search.</td></tr>
                            ) : sortedAdmins.map(a => {
                                const subInfo = getSubscriptionProgress(a.subscription);
                                return (
                                    <tr key={a._id} className="hover:bg-slate-50/50 transition-all duration-150">
                                        {/* Representative details */}
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 text-[#1d1d1f] border border-slate-200 flex items-center justify-center font-black text-sm">
                                                    {a.name?.[0]?.toUpperCase() || 'A'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[#1d1d1f] text-sm leading-snug">{a.name}</div>
                                                    <div className="text-[#86868b] text-xs font-semibold mt-0.5">{a.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Business / Company Details */}
                                        <td className="px-6 py-6">
                                            <div className="font-bold text-[#1d1d1f]">{a.companyId?.businessName || 'N/A'}</div>
                                            <div className="text-[#86868b] text-xs mt-1 font-semibold">{a.companyId?.phone || '—'}</div>
                                        </td>

                                        {/* Subscription progress */}
                                        <td className="px-6 py-6">
                                            <div className="flex items-center justify-between text-xs mb-2 gap-4">
                                                <span className={`font-bold ${subInfo.color}`}>{subInfo.text}</span>
                                                <div className="text-right text-[10px] text-slate-400 font-medium">
                                                    <div>Subscribed: <span className="text-slate-700 font-bold">{a.subscription?.startDate && !isNaN(new Date(a.subscription.startDate).getTime()) ? new Date(a.subscription.startDate).toLocaleDateString('en-GB') : '—'}</span></div>
                                                    <div>Ends: <span className="text-slate-700 font-bold">{a.subscription?.expiryDate && !isNaN(new Date(a.subscription.expiryDate).getTime()) ? new Date(a.subscription.expiryDate).toLocaleDateString('en-GB') : '—'}</span></div>
                                                </div>
                                            </div>
                                            <div className="w-40 bg-slate-100 h-1 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${subInfo.status === 'EXPIRED' ? 'bg-[#ff3b30]' : subInfo.status === 'EXPIRING' ? 'bg-[#ff9500]' : 'bg-[#34c759]'}`} style={{ width: `${subInfo.pct}%` }} />
                                            </div>
                                        </td>

                                        {/* Account Active State */}
                                        <td className="px-6 py-6">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${a.isActive && subInfo.status !== 'EXPIRED' ? 'bg-[#34c759]/5 text-[#34c759] border-[#34c759]/20' : 'bg-[#ff3b30]/5 text-[#ff3b30] border-[#ff3b30]/20'}`}>
                                                {a.isActive && subInfo.status !== 'EXPIRED' ? 'ACTIVE' : 'LOCKED'}
                                            </span>
                                        </td>

                                        {/* Actions list */}
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => openPermissionsModal(a)} className="p-2 text-slate-400 hover:text-[#1d1d1f] hover:bg-slate-100 rounded-full transition-all" title="Module Access">
                                                    <ShieldCheck size={18} />
                                                </button>
                                                <button onClick={() => handleOpenEditModal(a)} className="p-2 text-slate-400 hover:text-[#1d1d1f] hover:bg-slate-100 rounded-full transition-all" title="Edit / Renew">
                                                    <Edit3 size={18} />
                                                </button>
                                                <button onClick={() => toggleAdminActive(a._id)} className="p-2 text-slate-400 hover:text-[#1d1d1f] rounded-full transition-all" title={a.isActive ? 'Lock Account' : 'Unlock Account'}>
                                                    {a.isActive ? <ToggleRight size={22} className="text-[#34c759]" /> : <ToggleLeft size={22} className="text-slate-400" />}
                                                </button>
                                                <button onClick={() => handleDeleteAdmin(a._id)} className="p-2 text-slate-450 hover:text-[#ff3b30] hover:bg-[#ff3b30]/5 rounded-full transition-all" title="Delete Account">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* CREATE ADMIN MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-[#1d1d1f]">Create New Company Account</h3>
                                <p className="text-[#86868b] text-xs mt-1 font-semibold">Register a fresh client company and generate their admin credentials.</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-[#1d1d1f] p-2 rounded-full hover:bg-slate-100 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleCreateAdmin} className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-[#1d1d1f]">
                            {error && <p className="text-[#ff3b30] text-sm bg-[#ff3b30]/5 border border-[#ff3b30]/10 px-4 py-3 rounded-2xl font-semibold">{error}</p>}

                            {/* Section: Company Info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-[#0071e3] border-b border-slate-100 pb-2">Company Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Company Name *</label>
                                        <input type="text" placeholder="Acme Corporation" value={form.companyName}
                                            onChange={e => setForm({ ...form, companyName: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Representative Name *</label>
                                        <input type="text" placeholder="John Doe (Owner)" value={form.ownerName}
                                            onChange={e => setForm({ ...form, ownerName: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Phone Number</label>
                                        <input type="text" placeholder="+91 9876543210" value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Business Email</label>
                                        <input type="email" placeholder="contact@acme.com" value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                </div>
                                
                                {/* Address Box */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Street Address</label>
                                        <input type="text" placeholder="123 Technology Park" value={form.street}
                                            onChange={e => setForm({ ...form, street: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">City</label>
                                        <input type="text" placeholder="Chennai" value={form.city}
                                            onChange={e => setForm({ ...form, city: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">State</label>
                                        <input type="text" placeholder="Tamil Nadu" value={form.state}
                                            onChange={e => setForm({ ...form, state: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Subscription Duration</label>
                                        <select value={form.subscriptionMonths} onChange={e => setForm({ ...form, subscriptionMonths: Number(e.target.value) })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all">
                                            <option value={1}>1 Month Trial</option>
                                            <option value={3}>3 Months</option>
                                            <option value={6}>6 Months</option>
                                            <option value={12}>1 Year (12 Months)</option>
                                            <option value={24}>2 Years (24 Months)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Box: Add Account */}
                            <div className="bg-[#f5f5f7]/60 p-6 rounded-3xl border border-slate-200/80 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-[#34c759] flex items-center gap-1.5">
                                    <Key size={14} /> Add Account Credentials
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Account ID (Login Email) *</label>
                                        <input type="email" placeholder="admin@acme.com" value={form.loginEmail}
                                            onChange={e => setForm({ ...form, loginEmail: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#34c759] focus:ring-1 focus:ring-[#34c759] transition-all" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Password *</label>
                                        <input type="password" placeholder="••••••••" value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#34c759] focus:ring-1 focus:ring-[#34c759] transition-all" required />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 bg-[#f5f5f7] hover:bg-slate-200/60 text-[#1d1d1f] rounded-full text-sm font-bold transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="px-8 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-sm font-bold transition-all shadow-md shadow-[#0071e3]/10">
                                    {saving ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT ADMIN / COMPANY & RENEW SUBSCRIPTION MODAL */}
            {showEditModal && editingAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Edit Company Details</h3>
                                <p className="text-[#86868b] text-xs mt-1 font-semibold">Modify information, reset password, or renew subscription period.</p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setEditingAdmin(null); }} className="text-slate-400 hover:text-[#1d1d1f] p-2 rounded-full hover:bg-slate-100 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleUpdateAdmin} className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-[#1d1d1f]">
                            {editError && <p className="text-[#ff3b30] text-sm bg-[#ff3b30]/5 border border-[#ff3b30]/10 px-4 py-3 rounded-2xl font-semibold">{editError}</p>}

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-[#0071e3] border-b border-slate-100 pb-2">Edit Client Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Company Name</label>
                                        <input type="text" value={editForm.companyName}
                                            onChange={e => setEditForm({ ...editForm, companyName: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Representative Name</label>
                                        <input type="text" value={editForm.ownerName}
                                            onChange={e => setEditForm({ ...editForm, ownerName: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Phone Number</label>
                                        <input type="text" value={editForm.phone}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Business Email</label>
                                        <input type="email" value={editForm.email}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Street Address</label>
                                        <input type="text" value={editForm.street}
                                            onChange={e => setEditForm({ ...editForm, street: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">City</label>
                                        <input type="text" value={editForm.city}
                                            onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                            className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* Renew Subscription Section */}
                            <div className="bg-[#f5f5f7]/60 p-5 rounded-3xl border border-slate-200/85 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-[#ff9500] shrink-0" size={24} />
                                    <div>
                                        <div className="font-bold text-[#1d1d1f] text-sm">Renew / Extend Subscription</div>
                                        <div className="text-[#86868b] text-xs mt-1 font-semibold">Extend the business license ending timeline.</div>
                                    </div>
                                </div>
                                <select value={editForm.renewMonths} onChange={e => setEditForm({ ...editForm, renewMonths: Number(e.target.value) })}
                                    className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm focus:outline-none focus:border-[#0071e3] min-w-[160px]">
                                    <option value={0}>Do not extend</option>
                                    <option value={1}>Extend 1 Month</option>
                                    <option value={3}>Extend 3 Months</option>
                                    <option value={6}>Extend 6 Months</option>
                                    <option value={12}>Extend 1 Year (12M)</option>
                                    <option value={24}>Extend 2 Years (24M)</option>
                                </select>
                            </div>

                            {/* Reset Password Box */}
                            <div className="bg-[#f5f5f7]/60 p-5 rounded-3xl border border-slate-200/85 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Key className="text-[#ff3b30] shrink-0" size={24} />
                                    <div>
                                        <div className="font-bold text-[#1d1d1f] text-sm">Change Log Password</div>
                                        <div className="text-[#86868b] text-xs mt-1 font-semibold">Input a new password to update account credentials.</div>
                                    </div>
                                </div>
                                <input type="password" placeholder="Enter new password (leave blank to keep current)" value={editForm.password}
                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm placeholder-slate-400 focus:outline-none focus:border-[#ff3b30]" />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => { setShowEditModal(false); setEditingAdmin(null); }} className="px-6 py-3 bg-[#f5f5f7] hover:bg-slate-200/60 text-[#1d1d1f] rounded-full text-sm font-bold transition-all">Cancel</button>
                                <button type="submit" disabled={savingEdit} className="px-8 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-sm font-bold transition-all shadow-lg">
                                    {savingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODULE PERMISSIONS MODAL */}
            {showPermissionsModal && currentAdminForPermissions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-[440px] overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-bold text-[#1d1d1f] uppercase tracking-wider">Module Permissions</h3>
                                <p className="text-[#86868b] text-xs mt-1 font-semibold">{currentAdminForPermissions.name}</p>
                            </div>
                            <button onClick={() => setShowPermissionsModal(false)} className="text-slate-400 hover:text-[#1d1d1f] p-2 rounded-full hover:bg-slate-100 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar text-[#1d1d1f]">
                            <div className="grid grid-cols-1 gap-3">
                                {Object.keys(tempPermissions).map(key => (
                                    <label key={key} className="flex items-center justify-between bg-[#f5f5f7]/60 p-4 rounded-2xl border border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-all">
                                        <span className="text-xs font-bold text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        <input type="checkbox" checked={tempPermissions[key]}
                                            onChange={e => setTempPermissions({ ...tempPermissions, [key]: e.target.checked })}
                                            className="w-4.5 h-4.5 rounded bg-white text-[#0071e3] border-slate-300 focus:ring-0 cursor-pointer" />
                                    </label>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowPermissionsModal(false)} className="px-5 py-2.5 bg-[#f5f5f7] hover:bg-slate-200/60 text-[#1d1d1f] rounded-full text-sm font-bold">Cancel</button>
                                <button type="button" onClick={handleSavePermissions} className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-sm font-bold shadow-lg">Save Permissions</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
