import { Link } from 'react-router-dom';
import { ShieldOff, ArrowRight } from 'lucide-react';

/**
 * Public registration is disabled.
 * Account creation flow:
 *  SUPER_ADMIN  → created via seed script (CLI)
 *  ADMIN        → created by SUPER_ADMIN inside the Super Admin Portal
 *  CUSTOMER     → created by ADMIN inside the Admin Portal
 */
const Register = () => {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4"
            style={{ background: 'radial-gradient(ellipse at top, #1e3a5f 0%, #0f172a 60%)' }}>
            <div className="w-full max-w-md text-center">
                <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-6 bg-slate-800 border border-slate-700">
                    <ShieldOff size={26} className="text-slate-400" />
                </div>
                <h1 className="text-white text-2xl font-bold mb-2">Registration Disabled</h1>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    Public self-registration is not allowed. Account creation follows a strict hierarchy:
                </p>

                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 text-left space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div>
                            <p className="text-white font-semibold text-sm">Super Admin</p>
                            <p className="text-slate-400 text-xs mt-0.5">Created once via a CLI seed script. Controls the entire system.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <div>
                            <p className="text-white font-semibold text-sm">Admin (Company Owner)</p>
                            <p className="text-slate-400 text-xs mt-0.5">Created by Super Admin. Manages one company's billing operations.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <div>
                            <p className="text-white font-semibold text-sm">Customer</p>
                            <p className="text-slate-400 text-xs mt-0.5">Created by Admin. Gets portal access to view invoices and payments.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Link to="/login" className="flex items-center justify-between w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                        <span>Admin Login</span>
                        <ArrowRight size={16} />
                    </Link>
                    <Link to="/super-admin/login" className="flex items-center justify-between w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                        <span>Super Admin Login</span>
                        <ArrowRight size={16} />
                    </Link>
                    <Link to="/customer/login" className="flex items-center justify-between w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                        <span>Customer Login</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
