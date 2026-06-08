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

const ROTATING_WORDS = ["Insights", "Expenses", "Sales", "Profit", "Revenue", "Reports"];

const Login = () => {
    const { loginUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [wordIndex, setWordIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
                setFade(true);
            }, 300);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

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
            {/* Left Panel: Clean White/Slate-50 Statistics & Billing Illustrations */}
            <div className="hidden lg:flex lg:w-1/2 bg-white flex-col justify-center p-12 lg:p-16 border-r border-slate-200/60 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                
                {/* Illustrations (Numbers & Graph & Rotating Discovery Text) */}
                <div className="relative z-10 w-full max-w-xl mx-auto space-y-6">
                    {/* Rotating Discovery Text */}
                    <div className="pb-6 border-b border-slate-100">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight flex flex-wrap items-center gap-x-2">
                            <span>Let's discover</span>
                            <span className={`text-blue-600 transition-opacity duration-300 min-w-[120px] ${fade ? 'opacity-100' : 'opacity-0'}`}>
                                {ROTATING_WORDS[wordIndex]}
                            </span>
                        </h2>
                        <p className="text-slate-400 text-xs mt-1.5 font-medium tracking-wide">
                            Analyze business cashflow, track outstanding invoices, and manage client bills.
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
                </div>
            </div>

            {/* Right Panel: Clean Sign-In Form Box */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="Prolync Logo"
                        className="w-10 h-10 rounded-xl bg-slate-50 p-1.5 object-contain border border-slate-200 shadow-sm"
                    />
                    <div className="flex flex-col">
                        <span className="text-slate-900 text-lg font-bold tracking-tight leading-none">Prolync</span>
                        <span className="text-slate-500 text-xs font-semibold tracking-wide mt-0.5">Billing</span>
                    </div>
                </div>

                <div className="my-auto py-8 max-w-md w-full mx-auto space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
                            Sign In
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            Welcome back to your Billing System
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
                            className="w-full bg-slate-950 hover:bg-slate-900 text-white flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98] mt-6"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Logging in...
                                </>
                            ) : (
                                <>
                                    <LogIn size={16} />
                                    Log In
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-xs text-slate-400">
                    © {new Date().getFullYear()} Prolync Software Inc. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Login;
