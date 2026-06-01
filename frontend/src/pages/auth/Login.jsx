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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at top, #1e3a5f 0%, #0f172a 60%)' }}>
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <img
                        src="/logo.png"
                        alt="Prolync Billing Logo"
                        className="inline-block w-14 h-14 rounded-2xl mb-4 shadow-2xl object-contain bg-white p-2 border border-slate-700/30"
                        style={{ boxShadow: '0 4px 24px rgba(37,99,235,0.45)' }}
                    />
                    <h1 className="text-white text-2xl font-bold tracking-tight">Prolync Billing</h1>
                    <p className="text-slate-400 text-sm mt-1">Enterprise Billing System</p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-2xl p-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Sign in to your account</p>

                    {error && (
                        <div className="flex items-start gap-3 mb-5 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400 text-sm animate-in fade-in">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                className="block w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="block w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium pr-10"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" tabIndex={-1}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] mt-6">
                            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</> : <><LogIn size={18} />Sign In</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
