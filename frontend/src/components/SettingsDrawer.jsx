import React, { useState } from 'react';
import { X, Search, Building2, Palette, BarChart, Users, Shield, Percent, Receipt, Globe, Settings, Package, UserCircle, FileText, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

const SettingsDrawer = ({ isOpen, onClose, user }) => {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const settingGroups = [
        {
            title: 'ORGANIZATION',
            items: [
                { name: 'Organization Profile', icon: <Building2 size={18} />, path: '/settings' },
                { name: 'Subscription Plan', icon: <CreditCard size={18} />, path: '/settings/subscription' },
                { name: 'Branding', icon: <Palette size={18} />, path: '#' },
                { name: 'Usage Stats', icon: <BarChart size={18} />, path: '#' },
            ]
        },
        {
            title: 'USERS & ROLES',
            items: [
                { name: 'Users', icon: <Users size={18} />, path: user?.role === 'SUPER_ADMIN' ? '/super-admin/admins' : '#' },
                { name: 'Roles', icon: <Shield size={18} />, path: '#' },
                ...(user?.role === 'SUPER_ADMIN' ? [
                    { name: 'Companies (Managed)', icon: <Building2 size={18} />, path: '/super-admin/companies' }
                ] : [])
            ]
        },
        {
            title: 'TAXES & COMPLIANCE',
            items: [
                { name: 'Taxes', icon: <Percent size={18} />, path: '#' },
                { name: 'Direct Taxes', icon: <Receipt size={18} />, path: '#' },
                { name: 'MSME Settings', icon: <Globe size={18} />, path: '#' },
            ]
        },
        {
            title: 'PREFERENCES',
            items: [
                { name: 'General', icon: <Settings size={18} />, path: '#' },
                { name: 'Items', icon: <Package size={18} />, path: '/items' },
                { name: 'Customers', icon: <UserCircle size={18} />, path: '/customers' },
                { name: 'Invoices', icon: <FileText size={18} />, path: '/invoices' },
                { name: 'Payments Received', icon: <CreditCard size={18} />, path: '/payments' },
            ]
        }
    ];

    const filteredGroups = settingGroups.map(group => ({
        ...group,
        items: group.items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(group => group.items.length > 0);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer */}
            <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b border-slate-500/10 bg-slate-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search Settings"
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                    {filteredGroups.map((group, idx) => (
                        <div key={idx} className="mb-8 last:mb-0">
                            <h3 className="text-[11px] font-bold text-slate-400 tracking-wider mb-4">{group.title}</h3>
                            <div className="space-y-1">
                                {group.items.map((item, itemIdx) => (
                                    <Link
                                        key={itemIdx}
                                        to={item.path}
                                        onClick={onClose}
                                        className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition-all group"
                                    >
                                        <span className="text-slate-400 group-hover:text-violet-500 transition-colors">{item.icon}</span>
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredGroups.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-slate-300 mb-2 font-medium">No settings found for "{searchQuery}"</div>
                            <button onClick={() => setSearchQuery('')} className="text-blue-600 text-sm hover:underline">Clear search</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsDrawer;
