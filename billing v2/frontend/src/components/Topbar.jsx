import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from '../utils/api';
import {
    Search, LogOut, ShieldCheck, Sliders,
    ChevronDown, User, GitBranch, CreditCard, Menu, Sparkles, LifeBuoy,
    Percent, Layers
} from 'lucide-react';

const Topbar = () => {
    const { user, logout, taxSystemMode, setTaxSystemMode } = useContext(AuthContext);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [taxDropdownOpen, setTaxDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const taxModeDropdownRef = useRef(null);
    const [animationMode, setAnimationMode] = useState(null);

    const triggerModeTransition = (mode) => {
        setTaxSystemMode(mode);
        setTaxDropdownOpen(false);
        
        let label = 'Combined';
        if (mode === 'WITH_TAX') label = 'Tax';
        if (mode === 'WITHOUT_TAX') label = 'Tax Free';
        
        setAnimationMode(label);
        setTimeout(() => {
            setAnimationMode(null);
        }, 1200);
    };

    const animationConfigs = {
        'Combined': {
            bg: 'bg-blue-50/50',
            borderColor: 'border-blue-200/60',
            glowColor: 'rgba(37,99,235,0.4)',
            title: 'Entering Combined Mode',
            subtitle: 'Activating unified tax & standard invoicing view.',
            icon: <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
        },
        'Tax': {
            bg: 'bg-rose-50/50',
            borderColor: 'border-rose-200/60',
            glowColor: 'rgba(220,38,38,0.4)',
            title: 'Entering Tax Mode',
            subtitle: 'Activating itemized GST and tax calculations view.',
            icon: <Percent className="w-8 h-8 text-rose-600" />
        },
        'Tax Free': {
            bg: 'bg-emerald-50/50',
            borderColor: 'border-emerald-200/60',
            glowColor: 'rgba(16,163,74,0.4)',
            title: 'Entering Tax-Free Mode',
            subtitle: 'Hiding tax fields for a clean, tax-exempt invoice view.',
            icon: <ShieldCheck className="w-8 h-8 text-emerald-600" />
        }
    };

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
            if (taxModeDropdownRef.current && !taxModeDropdownRef.current.contains(e.target)) {
                setTaxDropdownOpen(false);
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

                {/* Tax Mode dropdown */}
                {user?.role !== 'CUSTOMER' && (
                    <div className="relative" ref={taxModeDropdownRef}>
                        <button
                            onClick={() => setTaxDropdownOpen(v => !v)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 ${
                                taxDropdownOpen 
                                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                    : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                            }`}
                            title="Tax System Mode"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {taxSystemMode === 'OVERALL' ? 'Combined' : taxSystemMode === 'WITH_TAX' ? 'Tax' : 'Tax Free'}
                            <ChevronDown size={13} className="text-slate-400" />
                        </button>

                        {taxDropdownOpen && (
                            <div className="dropdown-panel" style={{ minWidth: '180px' }}>
                                <div className="dropdown-item-section">System Mode</div>
                                <button
                                    onClick={() => triggerModeTransition('OVERALL')}
                                    className={`dropdown-item ${taxSystemMode === 'OVERALL' ? 'text-blue-600 font-bold bg-blue-50/50' : ''}`}
                                >
                                    Combined
                                </button>
                                <button
                                    onClick={() => triggerModeTransition('WITH_TAX')}
                                    className={`dropdown-item ${taxSystemMode === 'WITH_TAX' ? 'text-blue-600 font-bold bg-blue-50/50' : ''}`}
                                >
                                    Tax
                                </button>
                                <button
                                    onClick={() => triggerModeTransition('WITHOUT_TAX')}
                                    className={`dropdown-item ${taxSystemMode === 'WITHOUT_TAX' ? 'text-blue-600 font-bold bg-blue-50/50' : ''}`}
                                >
                                    Tax Free
                                </button>
                            </div>
                        )}
                    </div>
                )}

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
                                    Company Settings
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

            {/* Tax Mode transition overlay animation */}
            {animationMode && (() => {
                const config = animationConfigs[animationMode];
                return (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 animate-backdrop-in">
                        <div 
                            className="bg-white rounded-3xl border p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center shadow-2xl animate-card-in"
                            style={{
                                borderColor: config.borderColor,
                                boxShadow: `0 20px 40px -15px rgba(0,0,0,0.1), 0 0 40px ${config.glowColor}`
                            }}
                        >
                            <div className={`p-4 rounded-2xl ${config.bg} mb-4 border border-slate-100/50 flex items-center justify-center`}>
                                {config.icon}
                            </div>
                            
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                {config.title}
                            </h3>
                            <p className="text-xs text-slate-450 font-medium mt-2 leading-relaxed">
                                {config.subtitle}
                            </p>

                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-6">
                                <div 
                                    className="h-full bg-current rounded-full"
                                    style={{
                                        color: `var(--primary-600)`,
                                        width: '100%',
                                        animation: 'progressFill 1.2s linear forwards'
                                    }}
                                />
                            </div>
                        </div>
                        <style>{`
                            @keyframes backdropFadeIn {
                                from { opacity: 0; backdrop-filter: blur(0px); }
                                to { opacity: 1; backdrop-filter: blur(12px); }
                            }
                            @keyframes cardSpringIn {
                                0% { transform: scale(0.9) translateY(10px); opacity: 0; }
                                70% { transform: scale(1.03) translateY(-2px); opacity: 1; }
                                100% { transform: scale(1) translateY(0); opacity: 1; }
                            }
                            @keyframes progressFill {
                                from { width: 0%; }
                                to { width: 100%; }
                            }
                            .animate-backdrop-in {
                                animation: backdropFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                            }
                            .animate-card-in {
                                animation: cardSpringIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                            }
                        `}</style>
                    </div>
                );
            })()}
        </header>
    );
};

export default Topbar;
