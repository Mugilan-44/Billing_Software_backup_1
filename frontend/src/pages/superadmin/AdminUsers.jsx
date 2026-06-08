import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, ToggleLeft, ToggleRight, Users, Building2, CheckCircle, BarChart3, UserPlus, Trash2, ShieldCheck } from 'lucide-react';

const AdminUsers = () => {
    // Shared State
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalCompanies: 0, totalAdmins: 0, totalCustomers: 0, activeCompanies: 0 });

    // Admins State
    const [admins, setAdmins] = useState([]);
    const [superAdmins, setSuperAdmins] = useState([]);
    const [showAdminForm, setShowAdminForm] = useState(false);
    const [showSuperAdminForm, setShowSuperAdminForm] = useState(false);
    const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', companyId: '', branchId: '' });
    const [superAdminForm, setSuperAdminForm] = useState({ name: '', email: '', password: '' });
    const [savingAdmin, setSavingAdmin] = useState(false);
    const [savingSuperAdmin, setSavingSuperAdmin] = useState(false);
    const [adminSearch, setAdminSearch] = useState('');
    const [adminFormError, setAdminFormError] = useState('');
    const [superAdminFormError, setSuperAdminFormError] = useState('');
    const [branches, setBranches] = useState([]);

    // Permissions Modal state
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [currentAdminForPermissions, setCurrentAdminForPermissions] = useState(null);
    const [tempPermissions, setTempPermissions] = useState({});

    // Companies State
    const [companies, setCompanies] = useState([]);
    const [showCompanyForm, setShowCompanyForm] = useState(false);
    const [companyForm, setCompanyForm] = useState({ name: '', email: '', phone: '', gstin: '' });
    const [savingCompany, setSavingCompany] = useState(false);
    const [companySearch, setCompanySearch] = useState('');

    const getToken = () => localStorage.getItem('token');
    const authHeader = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

    const fetchData = async () => {
        try {
            const [statsRes, adminsRes, superAdminsRes, companiesRes] = await Promise.all([
                axios.get('/api/super-admin/stats', authHeader()),
                axios.get('/api/super-admin/admins', authHeader()),
                axios.get('/api/super-admin/super-admins', authHeader()),
                axios.get('/api/super-admin/companies', authHeader())
            ]);
            setStats(statsRes.data.data);
            setAdmins(adminsRes.data.data);
            setSuperAdmins(superAdminsRes.data.data);
            setCompanies(companiesRes.data.data);
        } catch (error) {
            console.error('Error fetching combined super admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // When company is selected, load branches for that company
    const handleAdminCompanyChange = async (companyId) => {
        setAdminForm(prev => ({ ...prev, companyId, branchId: '' }));
        if (!companyId) { setBranches([]); return; }
        try {
            const res = await axios.get(`/api/branches?companyId=${companyId}`, authHeader());
            setBranches(res.data.data || []);
        } catch (e) {
            console.warn('No branches fetched:', e.message);
            setBranches([]);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password.trim() || !adminForm.companyId || !adminForm.branchId) {
            setAdminFormError('All fields including Branch are required.'); return;
        }
        setSavingAdmin(true); setAdminFormError('');
        try {
            await axios.post('/api/super-admin/admins', adminForm, authHeader());
            await fetchData();
            setAdminForm({ name: '', email: '', password: '', companyId: '', branchId: '' });
            setBranches([]);
            setShowAdminForm(false);
        } catch (e) {
            setAdminFormError(e.response?.data?.message || 'Failed to create admin');
        } finally { setSavingAdmin(false); }
    };

    const toggleAdminActive = async (id) => {
        try {
            await axios.patch(`/api/super-admin/users/${id}/toggle`, {}, authHeader());
            setAdmins(prev => prev.map(a => a._id === id ? { ...a, isActive: !a.isActive } : a));
            setSuperAdmins(prev => prev.map(a => a._id === id ? { ...a, isActive: !a.isActive } : a));
            fetchData(); // Sync everything
        } catch (e) { console.error(e); }
    };

    const handleCreateSuperAdmin = async (e) => {
        e.preventDefault();
        if (!superAdminForm.name.trim() || !superAdminForm.email.trim() || !superAdminForm.password.trim()) {
            setSuperAdminFormError('All fields are required.'); return;
        }
        setSavingSuperAdmin(true); setSuperAdminFormError('');
        try {
            await axios.post('/api/super-admin/super-admins', superAdminForm, authHeader());
            await fetchData();
            setSuperAdminForm({ name: '', email: '', password: '' });
            setShowSuperAdminForm(false);
        } catch (e) {
            setSuperAdminFormError(e.response?.data?.message || 'Failed to create super admin');
        } finally { setSavingSuperAdmin(false); }
    };

    const openPermissionsModal = (admin) => {
        setCurrentAdminForPermissions(admin);
        setTempPermissions(admin.permissions || {
            customers: true, vendors: true, items: true, quotations: true,
            salesOrders: true, invoices: true, challans: true, payments: true,
            creditNotes: true, purchaseBills: true, expenses: true, stock: true, reports: true
        });
        setShowPermissionsModal(true);
    };

    const handleSavePermissions = async () => {
        try {
            await axios.patch(`/api/super-admin/admins/${currentAdminForPermissions._id}/permissions`, { permissions: tempPermissions }, authHeader());
            fetchData();
            setShowPermissionsModal(false);
        } catch (e) {
            console.error('Error saving permissions', e);
            alert('Failed to save permissions');
        }
    };

    // --- Company Functions ---
    const handleCreateCompany = async (e) => {
        e.preventDefault();
        if (!companyForm.name.trim()) return;
        setSavingCompany(true);
        try {
            await axios.post('/api/super-admin/companies', companyForm, authHeader());
            setCompanyForm({ name: '', email: '', phone: '', gstin: '' });
            setShowCompanyForm(false);
            await fetchData();
        } catch (e) { console.error(e); }
        finally { setSavingCompany(false); };
    };

    const handleDeleteCompany = async (id) => {
        if (!window.confirm('Delete this company and all its data?')) return;
        await axios.delete(`/api/super-admin/companies/${id}`, authHeader());
        await fetchData();
    };

    const toggleCompanyActive = async (id) => {
        // Assuming there's a toggle endpoint or we just rely on delete/edit.
        // We will just keep the delete for companies based on previous logic.
    };

    const filteredAdmins = admins.filter(a => a.name.toLowerCase().includes(adminSearch.toLowerCase()) || a.email.toLowerCase().includes(adminSearch.toLowerCase()));
    const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()));

    const cards = [
        { label: 'Total Companies', value: stats.totalCompanies, icon: <Building2 size={22} />, color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
        { label: 'Active Companies', value: stats.activeCompanies, icon: <CheckCircle size={22} />, color: 'bg-green-100 text-green-700', border: 'border-green-200' },
        { label: 'Admin Users', value: stats.totalAdmins, icon: <Users size={22} />, color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
        { label: 'Customers', value: stats.totalCustomers, icon: <BarChart3 size={22} />, color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
    ];

    return (
        <div className="space-y-8">
            {/* Header & Main Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Super Admin Control Panel</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Manage companies, admin users, and global system metrics.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => { setShowCompanyForm(!showCompanyForm); setShowAdminForm(false); setShowSuperAdminForm(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors">
                        <Plus size={16} /> Add Company
                    </button>
                    <button onClick={() => { setShowAdminForm(!showAdminForm); setShowCompanyForm(false); setShowSuperAdminForm(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                        <Plus size={16} /> Add Admin
                    </button>
                    <button onClick={() => { setShowSuperAdminForm(!showSuperAdminForm); setShowAdminForm(false); setShowCompanyForm(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20">
                        <Plus size={16} /> Create Super Admin
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map(card => (
                    <div key={card.label} className={`bg-slate-800 rounded-xl border ${card.border} p-5`}>
                        <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>{card.icon}</div>
                        <div className="text-2xl font-bold text-white">{loading ? '—' : card.value}</div>
                        <div className="text-sm text-slate-400 mt-0.5">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Hidden Forms */}
            {/* 0. Super Admin Form */}
            {showSuperAdminForm && (
                <div className="bg-slate-800 rounded-xl border border-indigo-700/50 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <h3 className="text-white font-semibold mb-4">Create New Super Admin</h3>
                    {superAdminFormError && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded-lg">{superAdminFormError}</p>}
                    <form onSubmit={handleCreateSuperAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { field: 'name', label: 'Full Name *', placeholder: 'Root Admin', type: 'text' },
                            { field: 'email', label: 'Email *', placeholder: 'super@company.com', type: 'email' },
                            { field: 'password', label: 'Password *', placeholder: 'Min 6 chars', type: 'password' },
                        ].map(f => (
                            <div key={f.field}>
                                <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                                <input type={f.type} placeholder={f.placeholder} value={superAdminForm[f.field]}
                                    onChange={e => setSuperAdminForm({ ...superAdminForm, [f.field]: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                            </div>
                        ))}
                        <div className="col-span-1 md:col-span-3 flex gap-3 mt-2">
                            <button type="submit" disabled={savingSuperAdmin} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                {savingSuperAdmin ? 'Creating...' : 'Submit Super Admin'}
                            </button>
                            <button type="button" onClick={() => { setShowSuperAdminForm(false); setSuperAdminFormError(''); }} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* 1. Admin Form */}
            {showAdminForm && (
                <div className="bg-slate-800 rounded-xl border border-blue-700/50 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <h3 className="text-white font-semibold mb-4">Create Admin User</h3>
                    {adminFormError && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded-lg">{adminFormError}</p>}
                    <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { field: 'name', label: 'Full Name *', placeholder: 'John Smith', type: 'text' },
                            { field: 'email', label: 'Email *', placeholder: 'admin@company.com', type: 'email' },
                            { field: 'password', label: 'Password *', placeholder: 'Min 6 characters', type: 'password' },
                        ].map(f => (
                            <div key={f.field}>
                                <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                                <input type={f.type} placeholder={f.placeholder} value={adminForm[f.field]}
                                    onChange={e => setAdminForm({ ...adminForm, [f.field]: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                            </div>
                        ))}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Company *</label>
                            <select value={adminForm.companyId} onChange={e => handleAdminCompanyChange(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                                <option value="">Select a company</option>
                                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Branch *</label>
                            <select value={adminForm.branchId} onChange={e => setAdminForm({ ...adminForm, branchId: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                disabled={!adminForm.companyId}>
                                <option value="">{adminForm.companyId ? 'Select a branch' : 'Select company first'}</option>
                                {branches.map(b => <option key={b._id} value={b._id}>{b.branchName} ({b.branchCode})</option>)}
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-2 flex gap-3 mt-2">
                            <button type="submit" disabled={savingAdmin} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                {savingAdmin ? 'Creating...' : 'Submit Admin'}
                            </button>
                            <button type="button" onClick={() => { setShowAdminForm(false); setAdminFormError(''); }} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* 2. Company Form */}
            {showCompanyForm && (
                <div className="bg-slate-800 rounded-xl border border-purple-700/50 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                    <h3 className="text-white font-semibold mb-4">Create New Company</h3>
                    <form onSubmit={handleCreateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { field: 'name', label: 'Company Name *', placeholder: 'Acme Pvt. Ltd.' },
                            { field: 'email', label: 'Email', placeholder: 'info@acme.com' },
                            { field: 'phone', label: 'Phone', placeholder: '+91 9000000000' },
                            { field: 'gstin', label: 'GSTIN', placeholder: '22AAAAA0000A1Z5' },
                        ].map(f => (
                            <div key={f.field}>
                                <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                                <input type="text" placeholder={f.placeholder} value={companyForm[f.field]}
                                    onChange={e => setCompanyForm({ ...companyForm, [f.field]: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500" />
                            </div>
                        ))}
                        <div className="col-span-1 md:col-span-2 flex gap-3 mt-2">
                            <button type="submit" disabled={savingCompany} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                {savingCompany ? 'Creating...' : 'Submit Company'}
                            </button>
                            <button type="button" onClick={() => setShowCompanyForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-6">
                {/* Super Admins List */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col min-h-[300px]">
                    <div className="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4 bg-slate-800/80 shrink-0">
                        <h2 className="text-white font-semibold flex items-center gap-2">
                            <ShieldCheck size={18} className="text-indigo-400" />
                            SUPER ADMINS <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full ml-1">{superAdmins.length}</span>
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase">
                                    <th className="px-6 py-4 text-left">Admin Details</th>
                                    <th className="px-6 py-4 text-left">Email</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 text-left">Created At</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {loading && superAdmins.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500 text-sm">Loading...</td></tr>
                                ) : superAdmins.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500 text-sm">No super admin users found.</td></tr>
                                ) : superAdmins.map(a => (
                                    <tr key={a._id} className="hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-bold leading-none">{a.name?.[0]?.toUpperCase()}</div>
                                                <div>
                                                    <div className="text-white text-sm font-semibold">{a.name}</div>
                                                    <div className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mt-0.5">ADMINID: #{a._id.slice(-4)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 text-sm">{a.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${a.isActive ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-sm">{new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => toggleAdminActive(a._id)} className="p-2 text-slate-500 hover:text-white transition-opacity group-hover:opacity-100 opacity-60">
                                                {a.isActive ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Admins List */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4 bg-slate-800/80 shrink-0">
                        <h2 className="text-white font-semibold flex items-center gap-2">
                            <Users size={18} className="text-blue-400" />
                            ADMINS <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full ml-1">{admins.length}</span>
                        </h2>
                        <div className="relative max-w-[240px] w-full">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" placeholder="Search admins..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase">
                                    <th className="px-6 py-4 text-left">Admin Details</th>
                                    <th className="px-6 py-4 text-left">Email</th>
                                    <th className="px-6 py-4 text-left">Branch / Firm</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 text-left">Created At</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {loading && admins.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-sm">Loading...</td></tr>
                                ) : filteredAdmins.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-sm">No admin users found.</td></tr>
                                ) : filteredAdmins.map(a => (
                                    <tr key={a._id} className="hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 shrink-0 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold leading-none">{a.name?.[0]?.toUpperCase()}</div>
                                                <div>
                                                    <div className="text-white text-sm font-semibold">{a.name}</div>
                                                    <div className="text-slate-500 text-[10px] tracking-wider uppercase font-bold mt-0.5">ADMINID: #{a._id.slice(-4)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 text-sm">{a.email}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-200 text-xs font-medium">{a.companyId?.name || '—'}</div>
                                            <div className="text-slate-500 text-[10px] mt-0.5">{a.branchId?.branchName || 'No Branch'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${a.isActive ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                {a.isActive ? 'ACTIVE' : 'BLOCKED'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-sm">{new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openPermissionsModal(a)} className="p-2 text-blue-400 hover:bg-blue-900/40 rounded-lg transition-colors" title="Module Permissions">
                                                    <ShieldCheck size={20} />
                                                </button>
                                                <button onClick={() => toggleAdminActive(a._id)} className="p-2 text-slate-500 hover:text-white transition-opacity group-hover:opacity-100 opacity-60">
                                                    {a.isActive ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Companies/Branches List */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4 bg-slate-800/80 shrink-0">
                        <h2 className="text-white font-semibold flex items-center gap-2">
                            <Building2 size={18} className="text-purple-400" />
                            Registered Branches <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full ml-1">{companies.length}</span>
                        </h2>
                        <div className="relative max-w-[200px] w-full">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" placeholder="Search branches..." value={companySearch} onChange={e => setCompanySearch(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-slate-800 shadow-sm z-10">
                                <tr className="border-b border-slate-700">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Branch Details</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Information</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {loading && companies.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-500 text-sm">Loading...</td></tr>
                                ) : filteredCompanies.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-500 text-sm">No branches found.</td></tr>
                                ) : filteredCompanies.map(c => (
                                    <tr key={c._id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-purple-700 shrink-0 flex items-center justify-center text-white text-xs font-bold leading-none">{c.name?.[0]?.toUpperCase()}</div>
                                                <div className="text-white text-sm font-medium line-clamp-1">{c.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-300 text-xs truncate max-w-[150px]">{c.email || '—'}</div>
                                            <div className="text-slate-500 text-[11px] font-mono mt-0.5">{c.gstin || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleDeleteCompany(c._id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Module Permissions Modal */}
            {showPermissionsModal && currentAdminForPermissions && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                            <div>
                                <h3 className="text-[17px] font-black tracking-tight text-slate-900 uppercase">Module Permissions</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">{currentAdminForPermissions.name}</p>
                            </div>
                            <button onClick={() => setShowPermissionsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-3">
                            {[
                                { key: 'customers', label: 'Customers', slug: 'customers' },
                                { key: 'vendors', label: 'Vendors', slug: 'vendors' },
                                { key: 'items', label: 'Items', slug: 'items' },
                                { key: 'quotations', label: 'Quotations', slug: 'quotations' },
                                { key: 'salesOrders', label: 'Sales Orders', slug: 'salesOrders' },
                                { key: 'invoices', label: 'Invoices', slug: 'invoices' },
                                { key: 'challans', label: 'Delivery Challans', slug: 'challans' },
                                { key: 'payments', label: 'Payments', slug: 'payments' },
                                { key: 'creditNotes', label: 'Credit Notes', slug: 'credit-notes' },
                                { key: 'purchaseBills', label: 'Purchase Bills', slug: 'purchase-bills' },
                                { key: 'expenses', label: 'Expenses', slug: 'expenses' },
                                { key: 'stock', label: 'Stock Management', slug: 'stock' },
                                { key: 'reports', label: 'Reports & Analytics', slug: 'reports' },
                            ].map(mod => (
                                <div key={mod.key}
                                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                                    onClick={() => setTempPermissions({ ...tempPermissions, [mod.key]: !tempPermissions[mod.key] })}
                                >
                                    <div>
                                        <div className="text-[13px] font-bold text-slate-800 uppercase tracking-tight">{mod.label}</div>
                                        <div className="text-[10px] text-slate-400 font-semibold tracking-wide">Slug: {mod.slug}</div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${tempPermissions[mod.key] ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white'}`}>
                                        {tempPermissions[mod.key] && <div className="w-2 h-2 rounded-full bg-white scale-in duration-200" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 sticky bottom-0 z-10">
                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => {
                                        const allOn = {};
                                        Object.keys(tempPermissions).forEach(k => allOn[k] = true);
                                        setTempPermissions(allOn);
                                    }}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black tracking-tight text-slate-600 hover:bg-slate-50 transition-colors uppercase"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => {
                                        const allOff = {};
                                        Object.keys(tempPermissions).forEach(k => allOff[k] = false);
                                        setTempPermissions(allOff);
                                    }}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black tracking-tight text-slate-600 hover:bg-slate-50 transition-colors uppercase"
                                >
                                    Clear All
                                </button>
                            </div>
                            <button
                                onClick={handleSavePermissions}
                                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Building2 size={18} />
                                SAVE PERMISSIONS
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
