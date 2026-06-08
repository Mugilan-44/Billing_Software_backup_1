import { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    LayoutDashboard, Users, Package, ClipboardList, ShoppingCart,
    FileText, Calculator, Archive, BarChart3, CreditCard, UserCircle,
    Briefcase, Truck, Receipt, FileMinus, ShieldCheck, PieChart,
    GitBranch, ChevronRight, Layers, LifeBuoy
} from 'lucide-react';

/* Sidebar sections — each section has a label + items */
const getMenuSections = (user) => {
    const role = user?.role || 'CUSTOMER';
    const permissions = user?.permissions || {};

    if (role === 'SUPER_ADMIN') return [
        {
            label: 'System Management',
            items: [
                { name: 'Admin Dashboard', icon: LayoutDashboard, path: '/admin' },
                { name: 'Prolync Admins', icon: ShieldCheck, path: '/super-admin/prolync-admins' },
            ]
        }
    ];

    if (['ADMIN', 'STAFF', 'CASHIER'].includes(role)) {
        const sections = [
            {
                label: '',
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
                    { name: 'Delivery Challans', icon: Truck, path: '/challans', key: 'challans' },
                    { name: 'Invoices', icon: FileText, path: '/invoices', key: 'invoices' },
                    { name: 'Payments', icon: CreditCard, path: '/payments', key: 'payments' },
                    { name: 'Credit Notes', icon: FileMinus, path: '/credit-notes', key: 'creditNotes' },
                ]
            },
            {
                label: 'Purchases',
                items: [
                    { name: 'Purchase Bills', icon: Receipt, path: '/purchase-bills', key: 'purchaseBills' },
                    { name: 'Expenses', icon: Calculator, path: '/expenses', key: 'expenses' },
                ]
            },
            {
                label: 'Inventory',
                items: [
                    { name: 'Stock', icon: Archive, path: '/stock', key: 'stock' },
                ]
            },
            {
                label: 'Analytics',
                items: [
                    { name: 'Reports', icon: BarChart3, path: '/reports', key: 'reports' },
                    { name: 'GST Summary', icon: PieChart, path: '/gst-summary', key: 'reports' },
                ]
            },
            {
                label: 'Support',
                items: [
                    { name: 'Help & Support', icon: LifeBuoy, path: '/support', key: 'support' },
                ]
            }
        ];

        // Filter items based on permissions
        return sections.map(section => ({
            ...section,
            items: section.items.filter(item => {
                if (item.key === 'dashboard' || item.key === 'support') return true; // Always show dashboard & support
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
        SUPER_ADMIN: 'Prolync Admin',
        ADMIN: 'Admin',
        CUSTOMER: 'Customer',
    }[role] || role;

    return (
        <aside
            className="w-60 shrink-0 flex flex-col h-full z-20 select-none bg-white border-r border-slate-200"
            style={{
                boxShadow: '4px 0 20px rgba(148, 163, 184, 0.05)',
            }}
        >
            {/* Brand */}
            <div className="px-4 py-4 flex items-center gap-3 shrink-0 border-b border-slate-100">
                <img
                    src="/logo.png"
                    alt="Prolync Billing"
                    className="w-9 h-9 rounded-xl shrink-0 object-contain p-1 border border-slate-100 shadow-xs"
                />
                <div className="min-w-0">
                    <div className="text-slate-800 font-bold text-sm leading-tight tracking-tight truncate">Prolync Billing</div>
                    <div
                        className="text-[10px] font-bold mt-0.5 tracking-widest uppercase truncate"
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
                        {section.label && <div className="sidebar-divider">{section.label}</div>}
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
                className="px-4 py-3 shrink-0 flex items-center justify-between border-t border-slate-100"
            >
                <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400">
                    PROLYNC v2.0
                </span>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px #34d399' }} />
                    <span className="text-[9px] text-slate-500 font-medium">Live</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
