import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Search, LogOut, ShieldCheck, Sliders,
    ChevronDown, User, GitBranch, CreditCard, Menu, Sparkles, LifeBuoy
} from 'lucide-react';

const Topbar = () => {
    const { user, logout } = useContext(AuthContext);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ customers: [], invoices: [] });
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ customers: [], invoices: [] });
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await axios.get(`/api/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.data && res.data.success) {
                    setSearchResults(res.data.data);
                }
            } catch (err) {
                console.error('Error fetching search results', err);
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

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
        SUPER_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Prolync Admin' },
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
            <div className="flex items-center flex-1 max-w-sm relative" ref={searchRef}>
                <div className="relative w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        className="topbar-search"
                        placeholder="Search customers, invoices…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                    />
                </div>
                {searchFocused && searchQuery.trim() !== '' && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200/80 max-h-96 overflow-y-auto z-50 py-2 divide-y divide-slate-100">
                        {searchLoading ? (
                            <div className="p-4 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></span>
                                Searching...
                            </div>
                        ) : (searchResults.customers.length === 0 && searchResults.invoices.length === 0) ? (
                            <div className="p-4 text-xs text-slate-450 text-center">
                                No matches found for "{searchQuery}"
                            </div>
                        ) : (
                            <>
                                {searchResults.customers.length > 0 && (
                                    <div className="p-2 text-left">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                                            Customers ({searchResults.customers.length})
                                        </div>
                                        {searchResults.customers.map(cust => (
                                            <Link
                                                key={cust._id}
                                                to={`/customers/${cust._id}/edit`}
                                                onClick={() => {
                                                    setSearchFocused(false);
                                                    setSearchQuery('');
                                                }}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-xs text-slate-700"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="font-semibold text-slate-800 truncate">
                                                        {cust.companyName || cust.name}
                                                    </p>
                                                    {cust.companyName && cust.name && (
                                                        <p className="text-[10px] text-slate-400 truncate">
                                                            Contact: {cust.name}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase shrink-0 font-medium">
                                                    Edit
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {searchResults.invoices.length > 0 && (
                                    <div className="p-2 text-left">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                                            Invoices ({searchResults.invoices.length})
                                        </div>
                                        {searchResults.invoices.map(inv => (
                                            <Link
                                                key={inv._id}
                                                to={`/invoices/${inv._id}`}
                                                onClick={() => {
                                                    setSearchFocused(false);
                                                    setSearchQuery('');
                                                }}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-xs text-slate-700"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="font-semibold text-slate-800 truncate">
                                                        {inv.invoiceNumber}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {inv.customerId?.companyName || inv.customerId?.name || 'Unknown'} • {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inv.grandTotal)}
                                                    </p>
                                                </div>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0
                                                    ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 
                                                      inv.status === 'SENT' ? 'bg-blue-50 text-blue-600 border border-blue-100/50' : 
                                                      inv.status === 'OVERDUE' ? 'bg-rose-50 text-rose-600 border border-rose-100/50' : 
                                                      'bg-slate-100 text-slate-500'}`}
                                                >
                                                    {inv.status}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-3">


                {/* Settings dropdown */}
                {user?.role !== 'CUSTOMER' && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setSettingsOpen(v => !v)}
                            className={`p-2 rounded-lg transition-all duration-150 ${settingsOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                            title="Settings"
                        >
                            <Menu size={17} />
                        </button>

                        {settingsOpen && (
                            <div className="dropdown-panel" style={{ minWidth: '210px' }}>
                                <div className="dropdown-item-section">Quick links</div>
                                {user?.role === 'SUPER_ADMIN' && (
                                    <Link
                                        to="/super-admin/admins"
                                        onClick={() => setSettingsOpen(false)}
                                        className="dropdown-item"
                                    >
                                        <ShieldCheck size={15} className="text-purple-500" />
                                        Prolync Admin Panel
                                    </Link>
                                )}
                                <Link
                                    to="/settings"
                                    onClick={() => setSettingsOpen(false)}
                                    className="dropdown-item"
                                >
                                    <Sliders size={15} className="text-slate-400" />
                                    Company Preferences
                                </Link>
                                <Link
                                    to="/settings/subscription"
                                    onClick={() => setSettingsOpen(false)}
                                    className="dropdown-item"
                                >
                                    <CreditCard size={15} className="text-slate-400" />
                                    Subscription Plan
                                </Link>
                                <Link
                                    to="/features"
                                    onClick={() => setSettingsOpen(false)}
                                    className="dropdown-item"
                                >
                                    <Sparkles size={15} className="text-slate-400" />
                                    Features Overview
                                </Link>
                                <Link
                                    to="/support"
                                    onClick={() => setSettingsOpen(false)}
                                    className="dropdown-item"
                                >
                                    <LifeBuoy size={15} className="text-slate-400" />
                                    Help & Support
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
