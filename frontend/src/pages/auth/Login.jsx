import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle, TrendingUp, Clock, ShieldCheck, Layers, FileText, CheckCircle2 } from 'lucide-react';

const AnimatedCounter = ({ targetValue, duration = 1200, prefix = '₹', suffix = '.00' }) => {
    const [displayVal, setDisplayVal] = useState(0);

    useEffect(() => {
        let startTimestamp = null;
        let animationFrameId;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            setDisplayVal(Math.floor(easeProgress * targetValue));
            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            }
        };
        animationFrameId = window.requestAnimationFrame(step);

        return () => {
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
            }
        };
    }, [targetValue, duration]);

    return (
        <span>
            {prefix}
            {displayVal.toLocaleString('en-IN')}
            {suffix}
        </span>
    );
};

const Login = () => {
    const { loginUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await loginUser(email.trim(), password);
            sessionStorage.setItem('justLoggedIn', 'true');
            const userRole = res.data.user?.role;
            if (userRole === 'SUPER_ADMIN') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
            setLoading(false);
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen bg-white flex font-sans text-slate-800">
            <style>{`
                @keyframes lineDraw {
                    from { stroke-dashoffset: 200; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes growY {
                    from { transform: scaleY(0); }
                    to { transform: scaleY(1); }
                }
                .line-draw {
                    stroke-dasharray: 200;
                    stroke-dashoffset: 200;
                    animation: lineDraw 2.2s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
                }
                .animate-grow-y {
                    transform-origin: bottom;
                    animation: growY 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
            `}</style>
            {/* Left Panel: Clean Sign-In Form Box */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="Prolync Logo"
                        className="w-10 h-10 rounded-xl bg-slate-50 p-1.5 object-contain border border-slate-200 shadow-sm"
                    />
                    <span className="text-slate-900 text-lg font-bold tracking-tight">Prolync Billing</span>
                </div>

                <div className="my-auto py-8 max-w-md w-full mx-auto space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
                            Sign In
                        </h1>
                        <p className="text-sm text-slate-500">
                            Access your invoicing, billing accounts, and stock analytics dashboard.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Password
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium pr-10"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all active:scale-[0.98] mt-6"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn size={16} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-xs text-slate-400">
                    © {new Date().getFullYear()} Prolync Software Inc. All rights reserved.
                </div>
            </div>

            {/* Right Panel: Clean White/Slate-50 Statistics & Billing Illustrations */}
            <div className="hidden lg:flex lg:w-1/2 bg-white flex-col justify-between p-12 lg:p-16 border-l border-slate-200/60 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                
                <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200/60 px-3 py-1.5 rounded-full shadow-sm">Enterprise Billing Solution</span>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <ShieldCheck size={14} className="text-blue-500" /> SSL SECURE
                        </span>
                    </div>
                </div>

                {/* Animated Mockup Dashboard Stats Grid */}
                <div className="relative z-10 my-auto max-w-xl w-full mx-auto space-y-8">
                    <div className="space-y-3">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            Real-time Revenue & <br />Invoice Operations
                        </h2>
                        <p className="text-slate-500 text-sm max-w-md">
                            Generate GST-compliant invoices, track active client balances, and monitor purchase collections instantly on one screen.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Revenue growth card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue This Month</span>
                                <div className="p-1.5 bg-green-50 border border-green-100 rounded-lg text-green-600">
                                    <TrendingUp size={16} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-black text-slate-900">
                                    <AnimatedCounter targetValue={482900} />
                                </div>
                                <span className="inline-flex items-center text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                    +18.4% vs last month
                                </span>
                            </div>
                        </div>

                        {/* Collections / Overdue card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Collections</span>
                                <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
                                    <Clock size={16} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-black text-slate-900">
                                    <AnimatedCounter targetValue={34150} />
                                </div>
                                <span className="inline-flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                    3 accounts overdue
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Growth Trend Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue Growth Trend</span>
                                <h3 className="text-base font-bold text-slate-800">Weekly Breakdown</h3>
                            </div>
                            <span className="inline-flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                                Live Analytics
                            </span>
                        </div>
                        
                        <div className="relative h-24 w-full overflow-hidden pt-2">
                            <svg className="w-full h-full text-blue-500" viewBox="0 0 100 30" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.15" />
                                        <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                {/* Grid lines */}
                                <line x1="0" y1="10" x2="100" y2="10" stroke="#f1f5f9" strokeWidth="0.5" strokeDasharray="2,2" />
                                <line x1="0" y1="20" x2="100" y2="20" stroke="#f1f5f9" strokeWidth="0.5" strokeDasharray="2,2" />
                                
                                {/* Area path */}
                                <path
                                    d="M 0 30 Q 15 22 30 25 T 60 12 T 90 6 T 100 4 L 100 30 Z"
                                    fill="url(#chart-grad)"
                                    className="animate-grow-y"
                                />
                                {/* Line path */}
                                <path
                                    d="M 0 30 Q 15 22 30 25 T 60 12 T 90 6 T 100 4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    className="line-draw"
                                />
                                
                                {/* Pulsing endpoint */}
                                <circle cx="100" cy="4" r="1.5" fill="rgb(59, 130, 246)" className="animate-pulse" />
                            </svg>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 px-1 pt-1 uppercase tracking-wider">
                            <span>Week 1</span>
                            <span>Week 2</span>
                            <span>Week 3</span>
                            <span>Week 4</span>
                        </div>
                    </div>

                    {/* Recent Invoices Mockup Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                        <div className="bg-white border-b border-slate-200/60 px-5 py-3.5 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <FileText size={14} className="text-slate-400" /> Recent Transactions
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Live View</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {[
                                { ref: 'INV-2026-042', client: 'Acme Corp', amt: '₹1,24,000.00', status: 'Paid', statusColor: 'text-green-600 bg-green-50 border-green-100' },
                                { ref: 'INV-2026-041', client: 'Global Logistics', amt: '₹45,500.00', status: 'Sent', statusColor: 'text-blue-600 bg-blue-50 border-blue-100' },
                                { ref: 'INV-2026-040', client: 'Zenith Tech', amt: '₹18,400.00', status: 'Overdue', statusColor: 'text-red-600 bg-red-50 border-red-100' }
                            ].map((inv, idx) => (
                                <div key={idx} className="px-5 py-3 flex items-center justify-between text-xs hover:bg-slate-50/30 transition-colors">
                                    <div className="space-y-0.5">
                                        <div className="font-bold text-slate-800">{inv.client}</div>
                                        <div className="text-[10px] font-mono text-slate-400">{inv.ref}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-slate-700">{inv.amt}</span>
                                        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${inv.statusColor}`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-green-500" /> 256-bit Bank Grade Security</span>
                    <span>v2.1.0</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
