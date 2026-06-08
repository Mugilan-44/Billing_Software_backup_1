import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, GitBranch, Building2, Search, Edit2, Trash2, X, CheckCircle } from 'lucide-react';

const Branches = () => {
    const [branches, setBranches] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [form, setForm] = useState({
        companyId: '', branchName: '', branchCode: '', address: '', phone: ''
    });

    const authHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [branchRes, companyRes] = await Promise.all([
                axios.get('/api/branches', authHeader()),
                axios.get('/api/super-admin/companies', authHeader()),
            ]);
            setBranches(branchRes.data.data || []);
            setCompanies(companyRes.data.data || []);
        } catch (e) {
            console.error('Error fetching data:', e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const resetForm = () => {
        setForm({ companyId: '', branchName: '', branchCode: '', address: '', phone: '' });
        setEditingBranch(null);
        setFormError('');
        setShowForm(false);
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch._id);
        setForm({
            companyId: branch.companyId?._id || branch.companyId || '',
            branchName: branch.branchName,
            branchCode: branch.branchCode,
            address: branch.address || '',
            phone: branch.phone || ''
        });
        setShowForm(true);
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.companyId || !form.branchName || !form.branchCode) {
            setFormError('Company, Branch Name, and Branch Code are required.');
            return;
        }
        setSaving(true); setFormError('');
        try {
            if (editingBranch) {
                await axios.put(`/api/branches/${editingBranch}`, form, authHeader());
            } else {
                await axios.post('/api/branches', form, authHeader());
            }
            await fetchAll();
            resetForm();
        } catch (e) {
            setFormError(e.response?.data?.message || 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this branch? Admins linked to it will lose their branch assignment.')) return;
        try {
            await axios.delete(`/api/branches/${id}`, authHeader());
            await fetchAll();
        } catch (e) {
            alert(e.response?.data?.message || 'Could not delete branch');
        }
    };

    const companyName = (companyId) => companies.find(c => c._id === (companyId?._id || companyId))?.name || '—';

    const filtered = branches.filter(b => {
        const matchesSearch = b.branchName.toLowerCase().includes(search.toLowerCase()) || b.branchCode.toLowerCase().includes(search.toLowerCase());
        const matchesCompany = !filterCompany || (b.companyId?._id || b.companyId) === filterCompany;
        return matchesSearch && matchesCompany;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <GitBranch size={22} className="text-indigo-400" />
                        Branch Management
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">Create and manage branches within each company.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                >
                    <Plus size={16} /> Add Branch
                </button>
            </div>

            {/* Create / Edit Form */}
            {showForm && (
                <div className="bg-slate-800 rounded-xl border border-indigo-700/50 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">{editingBranch ? 'Edit Branch' : 'Create New Branch'}</h3>
                        <button onClick={resetForm} className="text-slate-400 hover:text-white"><X size={18} /></button>
                    </div>
                    {formError && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded-lg">{formError}</p>}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Company *</label>
                            <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                disabled={!!editingBranch}>
                                <option value="">Select a company</option>
                                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Branch Name *</label>
                            <input type="text" placeholder="e.g. Chennai Main" value={form.branchName}
                                onChange={e => setForm({ ...form, branchName: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Branch Code *</label>
                            <input type="text" placeholder="e.g. CHN-01" value={form.branchCode}
                                onChange={e => setForm({ ...form, branchCode: e.target.value.toUpperCase() })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                            <input type="text" placeholder="Branch phone number" value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
                            <input type="text" placeholder="Branch address" value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div className="col-span-1 md:col-span-2 flex gap-3 mt-2">
                            <button type="submit" disabled={saving}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {saving ? 'Saving...' : (editingBranch ? 'Update Branch' : 'Create Branch')}
                            </button>
                            <button type="button" onClick={resetForm}
                                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search branches..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                </div>
                <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">All Companies</option>
                    {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
            </div>

            {/* Branches Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading branches...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-10 text-center">
                        <GitBranch size={40} className="text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No branches found. Create your first branch above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-800/80">
                                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3 tracking-wider">Branch</th>
                                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3 tracking-wider">Code</th>
                                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3 tracking-wider">Company</th>
                                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3 tracking-wider">Address</th>
                                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3 tracking-wider">Phone</th>
                                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3 tracking-wider">Status</th>
                                    <th className="text-right text-xs font-semibold text-slate-400 uppercase px-4 py-3 tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filtered.map(branch => (
                                    <tr key={branch._id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-900/40 flex items-center justify-center text-indigo-400">
                                                    <GitBranch size={14} />
                                                </div>
                                                <span className="text-white font-medium">{branch.branchName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs bg-slate-700 px-2 py-1 rounded text-indigo-300">{branch.branchCode}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-slate-300">
                                                <Building2 size={13} className="text-slate-500" />
                                                {branch.companyId?.name || companyName(branch.companyId)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px] truncate">{branch.address || '—'}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{branch.phone || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${branch.isActive !== false ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                                                <CheckCircle size={10} />
                                                {branch.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(branch)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(branch._id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            {!loading && (
                <div className="flex items-center gap-6 text-sm text-slate-400">
                    <span>{filtered.length} branch{filtered.length !== 1 ? 'es' : ''} shown</span>
                    <span>{branches.length} total</span>
                    <span>{companies.length} companies</span>
                </div>
            )}
        </div>
    );
};

export default Branches;
