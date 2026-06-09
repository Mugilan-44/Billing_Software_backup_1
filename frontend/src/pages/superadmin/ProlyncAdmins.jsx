import { useState, useEffect } from 'react';
import axios from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
    Plus, ToggleLeft, ToggleRight, ShieldCheck, X
} from 'lucide-react';

const ProlyncAdmins = () => {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [superAdmins, setSuperAdmins] = useState([]);
    const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
    const [superAdminForm, setSuperAdminForm] = useState({ name: '', email: '', password: '' });
    const [savingSuperAdmin, setSavingSuperAdmin] = useState(false);
    const [superAdminError, setSuperAdminError] = useState('');

    const getToken = () => localStorage.getItem('token');
    const authHeader = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

    const fetchSuperAdmins = async () => {
        try {
            const res = await axios.get('/api/super-admin/super-admins', authHeader());
            setSuperAdmins(res.data.data);
        } catch (error) {
            console.error('Error fetching Prolync Super Admins:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuperAdmins();
    }, []);

    const toggleAdminActive = async (id) => {
        try {
            await axios.patch(`/api/super-admin/users/${id}/toggle`, {}, authHeader());
            fetchSuperAdmins();
        } catch (e) {
            console.error('Error toggling admin status', e);
        }
    };

    const handleCreateSuperAdmin = async (e) => {
        e.preventDefault();
        setSuperAdminError('');
        if (!superAdminForm.name.trim() || !superAdminForm.email.trim() || !superAdminForm.password.trim()) {
            setSuperAdminError('All fields are required.');
            return;
        }
        setSavingSuperAdmin(true);
        try {
            await axios.post('/api/super-admin/super-admins', superAdminForm, authHeader());
            await fetchSuperAdmins();
            setSuperAdminForm({ name: '', email: '', password: '' });
            setShowSuperAdminModal(false);
        } catch (e) {
            setSuperAdminError(e.response?.data?.message || 'Failed to create Prolync Admin');
        } finally {
            setSavingSuperAdmin(false);
        }
    };

    return (
        <div className="space-y-10 font-sans bg-[#f5f5f7] text-[#1d1d1f] p-6 md:p-10 min-h-screen">
            {/* Header & Primary Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-[#1d1d1f] sm:text-5xl">Prolync Admins Settings</h1>
                    <p className="text-[#86868b] text-base mt-2 font-medium">Manage internal administrators who have platform management access.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => setShowSuperAdminModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-bold transition-all shadow-md shadow-[#0071e3]/10 transform active:scale-95">
                        <Plus size={16} /> Create Prolync Admin
                    </button>
                </div>
            </div>

            {/* Prolync Super Admin Accounts Control */}
            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden flex flex-col shadow-xl shadow-slate-150/40">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#f9f9fb]">
                    <div>
                        <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                            <ShieldCheck size={20} className="text-[#34c759]" />
                            Prolync Admins Control <span className="bg-[#f5f5f7] text-slate-600 text-xs px-3 py-1 rounded-full font-bold ml-1">{superAdmins.length}</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Manage internal platform administrators and their system access states.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-[#86868b] bg-[#f9f9fb]">
                                <th className="px-6 py-4">Administrator</th>
                                <th className="px-6 py-4">System Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Disable Option</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-[#424245]">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-[#86868b] font-medium">
                                        Loading administrators list...
                                    </td>
                                </tr>
                            ) : (superAdmins || []).length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-[#86868b] font-medium">
                                        No platform administrators found.
                                    </td>
                                </tr>
                            ) : (superAdmins || []).map(sa => {
                                if (!sa) return null;
                                const isSelf = currentUser && currentUser._id === sa?._id;
                                return (
                                    <tr key={sa._id} className="hover:bg-slate-50/50 transition-all duration-150">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 flex items-center justify-center font-black text-sm">
                                                    {sa.name?.[0]?.toUpperCase() || 'S'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[#1d1d1f] text-sm leading-snug">
                                                        {sa.name} {isSelf && <span className="text-[10px] bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.5 rounded-full ml-1.5 font-bold">You</span>}
                                                    </div>
                                                    <div className="text-[#86868b] text-xs font-semibold mt-0.5">{sa.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full uppercase tracking-wider">
                                                {sa.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${sa.isActive ? 'bg-[#34c759]/5 text-[#34c759] border-[#34c759]/20' : 'bg-[#ff3b30]/5 text-[#ff3b30] border-[#ff3b30]/20'}`}>
                                                {sa.isActive ? 'ACTIVE' : 'DISABLED'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {isSelf ? (
                                                    <span className="text-xs text-slate-400 italic pr-2">Cannot disable self</span>
                                                ) : (
                                                    <button onClick={() => toggleAdminActive(sa._id)} className="p-2 text-slate-400 hover:text-[#1d1d1f] rounded-full transition-all" title={sa.isActive ? 'Disable Account' : 'Enable Account'}>
                                                        {sa.isActive ? <ToggleRight size={22} className="text-[#34c759]" /> : <ToggleLeft size={22} className="text-slate-400" />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SUPER ADMIN MODAL */}
            {showSuperAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-[#1d1d1f]">Create Prolync Admin</h3>
                                <p className="text-[#86868b] text-xs mt-1 font-semibold">Register an internal platform moderator.</p>
                            </div>
                            <button onClick={() => setShowSuperAdminModal(false)} className="text-slate-400 hover:text-[#1d1d1f] p-2 rounded-full hover:bg-slate-100 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSuperAdmin} className="p-6 space-y-5 text-[#1d1d1f]">
                            {superAdminError && <p className="text-[#ff3b30] text-sm bg-[#ff3b30]/5 border border-[#ff3b30]/10 px-4 py-2 rounded-xl font-semibold">{superAdminError}</p>}
                            <div>
                                <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Full Name *</label>
                                <input type="text" placeholder="System Admin" value={superAdminForm.name}
                                    onChange={e => setSuperAdminForm({ ...superAdminForm, name: e.target.value })}
                                    className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm focus:outline-none focus:border-[#0071e3]" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Email ID *</label>
                                <input type="email" placeholder="internal@prolync.com" value={superAdminForm.email}
                                    onChange={e => setSuperAdminForm({ ...superAdminForm, email: e.target.value })}
                                    className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm focus:outline-none focus:border-[#0071e3]" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Password *</label>
                                <input type="password" placeholder="••••••••" value={superAdminForm.password}
                                    onChange={e => setSuperAdminForm({ ...superAdminForm, password: e.target.value })}
                                    className="w-full bg-[#f5f5f7] border border-slate-200/60 rounded-2xl px-4 py-3 text-[#1d1d1f] text-sm focus:outline-none focus:border-[#0071e3]" required />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowSuperAdminModal(false)} className="px-5 py-2.5 bg-[#f5f5f7] hover:bg-[#e2e8f0] text-[#1d1d1f] rounded-full text-sm font-bold">Cancel</button>
                                <button type="submit" disabled={savingSuperAdmin} className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-sm font-bold shadow-lg">
                                    {savingSuperAdmin ? 'Creating...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProlyncAdmins;
