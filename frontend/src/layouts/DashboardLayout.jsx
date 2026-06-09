import { Outlet, Navigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { Menu, X } from 'lucide-react';

const DashboardLayout = () => {
    const { user, loading } = useContext(AuthContext);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center" style={{ background: '#0b1120' }}>
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl"
                        style={{
                            background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                            boxShadow: '0 0 40px rgba(37,99,235,0.5)',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }}
                    >
                        P
                    </div>
                    <div className="text-slate-400 text-xs font-semibold tracking-[0.2em] uppercase animate-pulse">
                        Loading Prolync Billing...
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    const company = user?.companyId;
    const subscriptionEndDate = company?.subscriptionEndDate;
    const subscriptionStatus = company?.subscriptionStatus;

    let subscriptionBanner = null;
    if (user && user.role !== 'SUPER_ADMIN' && subscriptionEndDate) {
        const endDate = new Date(subscriptionEndDate);
        const today = new Date();
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isStatusActive = subscriptionStatus?.toUpperCase() === 'ACTIVE';

        if (diffDays <= 30 && diffDays > 0 && isStatusActive) {
            subscriptionBanner = (
                <div className="bg-amber-500 text-slate-900 px-4 py-2 text-center text-xs font-black shadow-sm flex items-center justify-center gap-2 no-print">
                    <span>Your subscription expires in {diffDays} days (on {endDate.toLocaleDateString('en-IN')}). Please renew soon.</span>
                </div>
            );
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">

            {/* ── Mobile Overlay ─────────────────────────────── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ────────────────────────────────────── */}
            <div
                className={`
                    fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto lg:flex lg:shrink-0
                    transform transition-transform duration-300 ease-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Mobile close button */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-3 right-3 lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white z-50"
                >
                    <X size={18} />
                </button>
                <Sidebar />
            </div>

            {/* ── Main Content ───────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Topbar — shows hamburger on mobile */}
                <div className="relative shrink-0">
                    <Topbar />
                    {/* Hamburger — mobile only */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                {/* Subscription Banner */}
                {subscriptionBanner}

                {/* Page content */}
                <main
                    className="flex-1 overflow-x-hidden overflow-y-auto main-scroll bg-slate-50"
                    style={{ padding: 'clamp(12px, 2.5vw, 24px)' }}
                >
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
