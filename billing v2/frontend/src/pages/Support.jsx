import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Globe, LifeBuoy, MessageSquare, Clock, Shield } from 'lucide-react';

const Support = () => {
    const navigate = useNavigate();

    const handleSupportClick = () => {
        // Automatically opens Gmail compose window with to address filled
        const gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=support@prolync.in&su=Support%20Request%20-%20Prolync%20Billing";
        window.open(gmailUrl, '_blank');
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-4 py-6 border-b border-slate-200/80 mb-10 no-print">
                <button onClick={() => navigate('/dashboard')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Support & Help Desk</h1>
                    <p className="text-slate-500 text-sm">Get in touch with Prolync team for assistance and queries.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Contact Card 1 */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-center flex flex-col justify-between">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                            <Phone size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase mb-1">Call Us</h3>
                        <p className="text-xs text-slate-400 mb-4">Available Mon-Sat, 9AM-7PM</p>
                        <a href="tel:+919080427561" className="text-lg font-black text-slate-900 hover:text-blue-600 transition-colors">
                            90804 27561
                        </a>
                    </div>
                </div>

                {/* Contact Card 2 */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-center flex flex-col justify-between">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                            <Mail size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase mb-1">Email</h3>
                        <p className="text-xs text-slate-400 mb-4">24/7 Professional ticketing</p>
                        <a href="mailto:support@prolync.in" className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                            support@prolync.in
                        </a>
                    </div>
                </div>

                {/* Contact Card 3 */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-center flex flex-col justify-between">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                            <Globe size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase mb-1">Website</h3>
                        <p className="text-xs text-slate-400 mb-4">Explore features & guides</p>
                        <a href="https://Prolync.in" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-900 hover:text-purple-600 transition-colors">
                            Prolync.in
                        </a>
                    </div>
                </div>
            </div>

            {/* Support Trigger Box */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden mb-12 text-center">
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white blur-xl"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 bg-indigo-500 blur-lg"></div>

                <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 flex items-center justify-center mb-6">
                        <LifeBuoy size={28} className="animate-spin-slow" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                        Need Immediate Assistance?
                    </h2>
                    <p className="text-slate-300 text-sm mt-4 leading-relaxed font-medium">
                        Click the button below to automatically compose an email to our dedicated help desk. We typically respond within 2 hours.
                    </p>
                    <button 
                        onClick={handleSupportClick} 
                        className="mt-8 px-8 py-3 bg-white text-indigo-950 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Open Gmail Support
                    </button>
                </div>
            </div>

            {/* About Prolync Section */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-2">
                    <Shield size={20} className="text-indigo-600" /> About Prolync Billing
                </h2>
                <div className="text-slate-600 text-sm leading-relaxed space-y-4">
                    <p>
                        Prolync Billing is a modern, enterprise-grade invoicing and inventory management ecosystem built for Indian businesses. We design state-of-the-art software systems that simplify daily ledger bookkeeping, GSTR tax reconciliations, and physical dispatch delivery challans.
                    </p>
                    <p>
                        Our mission is to empower business administrators, accountants, and retail agents with high-performance tools that guarantee transactional accuracy and compliance, allowing companies to focus on scaling operations.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-100">
                    <div className="flex items-start gap-3">
                        <Clock size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Fast Response</h4>
                            <p className="text-[11px] text-slate-500 leading-normal">Response time under 2 hours during support windows.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Shield size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Data Security</h4>
                            <p className="text-[11px] text-slate-500 leading-normal">Safe transaction vault and end-to-end data encryption.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MessageSquare size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Direct Callback</h4>
                            <p className="text-[11px] text-slate-500 leading-normal">Request callbacks directly from senior consultants.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Support;
