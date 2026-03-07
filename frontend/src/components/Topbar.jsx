import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    Bell, Search, LogOut, Settings, ShieldCheck, Sliders,
    ChevronDown, User, GitBranch
} from 'lucide-react';

const Topbar = () => {
    const { user, logout } = useContext(AuthContext);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

    const roleColors = {
        SUPER_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Super Admin' },
        ADMIN: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Admin' },
        CUSTOMER: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Customer' },
    };
    const rc = roleColors[user?.role] || roleColors.ADMIN;

    return (
        <header
            className="h-14 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0"
            style={{ borderBottom: '1.5px solid #f1f5f9', boxShadow: '0 1px 12px rgba(15,23,42,0.04)' }}
        >
            {/* Search */}
            <div className="flex items-center flex-1 max-w-sm">
                <div className="relative w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        className="topbar-search"
                        placeholder="Search customers, invoices…"
                    />
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-3">
                {/* Bell */}
                <button
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 relative"
                    title="Notifications"
                >
                    <Bell size={17} />
                    {/* dot */}
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                </button>

                {/* Settings dropdown */}
                {user?.role !== 'CUSTOMER' && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setSettingsOpen(v => !v)}
                            className={`p-2 rounded-lg transition-all duration-150 ${settingsOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                            title="Settings"
                        >
                            <Settings size={17} />
                        </button>

                        {settingsOpen && (
                            <div className="dropdown-panel" style={{ minWidth: '210px' }}>
                                <div className="dropdown-item-section">Quick links</div>
                                {user?.role === 'SUPER_ADMIN' && (
                                    <>
                                        <Link
                                            to="/super-admin/admins"
                                            onClick={() => setSettingsOpen(false)}
                                            className="dropdown-item"
                                        >
                                            <ShieldCheck size={15} className="text-purple-500" />
                                            Super Admin Panel
                                        </Link>
                                        <Link
                                            to="/super-admin/branches"
                                            onClick={() => setSettingsOpen(false)}
                                            className="dropdown-item"
                                        >
                                            <GitBranch size={15} className="text-indigo-500" />
                                            Branch Management
                                        </Link>
                                    </>
                                )}
                                <Link
                                    to="/settings"
                                    onClick={() => setSettingsOpen(false)}
                                    className="dropdown-item"
                                >
                                    <Sliders size={15} className="text-slate-400" />
                                    Billing Preferences
                                </Link>
                                <div className="dropdown-divider" />
                                <button
                                    onClick={() => { logout(); setSettingsOpen(false); }}
                                    className="dropdown-item danger w-full"
                                >
                                    <LogOut size={15} className="text-red-400" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Divider */}
                <div className="w-px h-5 bg-slate-200 mx-0.5 hidden sm:block" />

                {/* Profile chip */}
                <div className="flex items-center gap-2 pl-1">
                    <div className="hidden sm:block text-right min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate max-w-[110px]">
                            {user?.name || 'User'}
                        </div>
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${rc.bg} ${rc.text}`}>
                            {rc.label}
                        </span>
                    </div>
                    {/* Avatar */}
                    <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}
                    >
                        {initials}
                    </div>
                    {/* Logout — visible on mobile too */}
                    <button
                        onClick={logout}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
                        title="Sign out"
                    >
                        <LogOut size={15} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
