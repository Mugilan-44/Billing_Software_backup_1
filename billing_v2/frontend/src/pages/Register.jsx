import { Link } from 'react-router-dom';
import { ShieldOff, Mail, ArrowLeft } from 'lucide-react';

const Register = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl">
                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ShieldOff size={32} className="text-amber-400" />
                </div>
                <h1 className="text-2xl font-black text-white mb-3">Self-Registration Disabled</h1>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Public account creation is disabled for security reasons.
                    Only authorized administrators can create user accounts.
                </p>
                <div className="bg-slate-800/50 rounded-2xl p-5 mb-8 text-left space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">To Get Access:</p>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-blue-400 text-xs font-black">1</span>
                        </div>
                        <p className="text-slate-300 text-sm">Contact your system administrator or company owner</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-blue-400 text-xs font-black">2</span>
                        </div>
                        <p className="text-slate-300 text-sm">Request account creation with your email address</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-blue-400 text-xs font-black">3</span>
                        </div>
                        <p className="text-slate-300 text-sm">You will receive login credentials via email</p>
                    </div>
                </div>
                <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg"
                >
                    <ArrowLeft size={16} /> Back to Login
                </Link>
            </div>
        </div>
    );
};

export default Register;
