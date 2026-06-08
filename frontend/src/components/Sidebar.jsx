import { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    LayoutDashboard, Users, Package, ClipboardList, ShoppingCart,
    FileText, Calculator, Archive, BarChart3, CreditCard, UserCircle,
    Briefcase, Truck, Receipt, FileMinus, ShieldCheck, PieChart,
    GitBranch, ChevronRight, Layers
} from 'lucide-react';

/* Sidebar sections — each section has a label + items */
const getMenuSections = (user) => {
    const role = user?.role || 'CUSTOMER';
    const permissions = user?.permissions || {};

    if (role === 'SUPER_ADMIN') return [
        {
            label: 'Management',
            items: [
                { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
                { name: 'Super Admin', icon: ShieldCheck, path: '/super-admin/admins' },
                { name: 'Branches', icon: GitBranch, path: '/super-admin/branches' },
            ]
        },
        {
            label: 'Contacts',
            items: [
                { name: 'Customers', icon: Users, path: '/customers' },
                { name: 'Vendors', icon: Briefcase, path: '/vendors' },
                { name: 'Items', icon: Package, path: '/items' },
            ]
        },
        {
            label: 'Sales',
            items: [
                { name: 'Quotations', icon: ClipboardList, path: '/quotations' },
                { name: 'Sales Orders', icon: ShoppingCart, path: '/orders' },
                { name: 'Invoices', icon: FileText, path: '/invoices' },
                { name: 'Delivery Challans', icon: Truck, path: '/challans' },
                { name: 'Payments', icon: CreditCard, path: '/payments' },
                { name: 'Credit Notes', icon: FileMinus, path: '/credit-notes' },
            ]
        },
        {
            label: 'Purchases & Other',
            items: [
                { name: 'Purchase Bills', icon: Receipt, path: '/purchase-bills' },
                { name: 'Expenses', icon: Calculator, path: '/expenses' },
                { name: 'Stock', icon: Archive, path: '/stock' },
            ]
        },
        {
            label: 'Analytics',
            items: [
                { name: 'Reports', icon: BarChart3, path: '/reports' },
                { name: 'GST Summary', icon: PieChart, path: '/gst-summary' },
            ]
        },
    ];

    if (role === 'ADMIN') {
        const sections = [
            {
                label: 'Overview',
                items: [
                    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', key: 'dashboard' },
                ]
            },
            {
                label: 'Contacts',
                items: [
                    { name: 'Customers', icon: Users, path: '/customers', key: 'customers' },
                    { name: 'Vendors', icon: Briefcase, path: '/vendors', key: 'vendors' },
                    { name: 'Items', icon: Package, path: '/items', key: 'items' },
                ]
            },
            {
                label: 'Sales',
                items: [
                    { name: 'Quotations', icon: ClipboardList, path: '/quotations', key: 'quotations' },
                    { name: 'Sales Orders', icon: ShoppingCart, path: '/orders', key: 'salesOrders' },
                    { name: 'Invoices', icon: FileText, path: '/invoices', key: 'invoices' },
                    { name: 'Delivery Challans', icon: Truck, path: '/challans', key: 'challans' },
                    { name: 'Payments', icon: CreditCard, path: '/payments', key: 'payments' },
                    { name: 'Credit Notes', icon: FileMinus, path: '/credit-notes', key: 'creditNotes' },
                ]
            },
            {
                label: 'Purchases & Other',
                items: [
                    { name: 'Purchase Bills', icon: Receipt, path: '/purchase-bills', key: 'purchaseBills' },
                    { name: 'Expenses', icon: Calculator, path: '/expenses', key: 'expenses' },
                    { name: 'Stock', icon: Archive, path: '/stock', key: 'stock' },
                ]
            },
            {
                label: 'Analytics',
                items: [
                    { name: 'Reports', icon: BarChart3, path: '/reports', key: 'reports' },
                ]
            }
        ];

        // Filter items based on permissions
        return sections.map(section => ({
            ...section,
            items: section.items.filter(item => {
                if (item.key === 'dashboard') return true; // Always show dashboard
                return permissions[item.key] !== false;
            })
        })).filter(section => section.items.length > 0);
    }

    // CUSTOMER
    return [{
        label: 'My Account',
        items: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
            { name: 'My Invoices', icon: FileText, path: '/invoices' },
            { name: 'My Payments', icon: CreditCard, path: '/payments' },
            { name: 'Profile', icon: UserCircle, path: '/dashboard' },
        ]
    }];
};

const Sidebar = () => {
    const { user } = useContext(AuthContext);
    const role = user?.role || 'CUSTOMER';
    const sections = getMenuSections(user);

    const roleLabel = {
        SUPER_ADMIN: 'Super Admin',
        ADMIN: 'Admin',
        CUSTOMER: 'Customer',
    }[role] || role;

    return (
        <aside
            className="w-60 shrink-0 flex flex-col h-full z-20 select-none"
            style={{
                background: 'linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
            }}
        >
            {/* Brand */}
            <div className="px-4 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 14px rgba(37,99,235,0.5)' }}
                >
                    <Layers size={18} />
                </div>
                <div className="min-w-0">
                    <div className="text-white font-bold text-sm leading-tight tracking-tight truncate">Prolync Book</div>
                    <div
                        className="text-[10px] font-semibold mt-0.5 tracking-widest uppercase truncate"
                        style={{ color: '#2563eb' }}
                    >
                        {roleLabel}
                    </div>
                </div>
            </div>

            {/* Scrollable nav */}
            <nav
                className="flex-1 py-3 overflow-y-auto sidebar-scroll"
                style={{ paddingLeft: '10px', paddingRight: '10px' }}
            >
                {sections.map((section, si) => (
                    <div key={si} className="mb-1">
                        {/* Section label */}
                        <div className="sidebar-divider">{section.label}</div>
                        {/* Items */}
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `sidebar-link ${isActive ? 'active' : ''}`
                                    }
                                    end={item.path === '/dashboard'}
                                >
                                    <span className="link-icon">
                                        <Icon size={16} />
                                    </span>
                                    <span className="truncate flex-1">{item.name}</span>
                                    {/* Active indicator chevron */}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div
                className="px-4 py-3 shrink-0 flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
                <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#334155' }}>
                    PROLYNC v2.0
                </span>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px #34d399' }} />
                    <span className="text-[9px] text-slate-600 font-medium">Live</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
