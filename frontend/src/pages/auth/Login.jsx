import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans">
            {/* Left Panel: Corporate / Brand Showcase (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 border-r border-slate-800">
                {/* Subtle dark pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/30 via-slate-900 to-slate-900" />

                <div className="relative z-10 flex items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="Prolync Logo"
                        className="w-10 h-10 rounded-xl bg-white p-1.5 object-contain border border-slate-700/50 shadow-md"
                    />
                    <span className="text-white text-lg font-bold tracking-tight">Prolync Billing</span>
                </div>

                <div className="relative z-10 my-auto max-w-md space-y-6">
                    <h2 className="text-4xl font-extrabold text-white leading-tight">
                        Streamline your business operations with <span className="text-blue-500">Prolync</span>.
                    </h2>
                    <p className="text-slate-400 text-base leading-relaxed">
                        Generate professional invoices, manage real-time inventory, track expenses, and monitor financial performance with our secure enterprise platform.
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 backdrop-blur-sm">
                            <div className="text-2xl font-bold text-white">99.9%</div>
                            <div className="text-xs text-slate-400 mt-1">Platform Uptime</div>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 backdrop-blur-sm">
                            <div className="text-2xl font-bold text-white">256-bit</div>
                            <div className="text-xs text-slate-400 mt-1">SSL Encryption</div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-500">
                    © {new Date().getFullYear()} Prolync Software Inc. All rights reserved.
                </div>
            </div>

            {/* Right Panel: Clean Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white dark:bg-slate-950">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Brand logo for mobile view only */}
                    <div className="lg:hidden flex items-center gap-3 mb-6">
                        <img
                            src="/logo.png"
                            alt="Prolync Logo"
                            className="w-10 h-10 rounded-xl bg-white p-1.5 object-contain border border-slate-200 shadow-sm"
                        />
                        <span className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Prolync Billing</span>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Sign In
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Welcome back! Please enter your credentials to access your account.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-400 text-sm animate-in fade-in">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium pr-10"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
            </div>
        </div>
    );
};

export default Login;
