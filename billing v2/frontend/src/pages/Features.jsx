import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Palette, FileText, CheckCircle2, QrCode, ArrowLeft, Truck, Package, RefreshCw, FileSpreadsheet } from 'lucide-react';

const Features = () => {
    const navigate = useNavigate();

    const mainFeatures = [
        {
            title: "Premium Invoice Templates",
            desc: "Choose from 8+ professional PDF templates including Modern, Classic, Elegant, Minimal, GST Compliant, and Vibrant themes to match your brand style.",
            icon: FileText,
            color: "from-blue-500 to-indigo-600",
            badge: "8+ Layouts"
        },
        {
            title: "Dynamic Color Customization",
            desc: "Instantly customize primary brand colors. Switch between curated color palettes to reflect your corporate identity on invoice PDFs and statements.",
            icon: Palette,
            color: "from-pink-500 to-rose-600",
            badge: "Unlimited Colors"
        },
        {
            title: "Advanced Delivery Challans",
            desc: "Create GST-compliant supply and job-work delivery challans. Support quantity tracking, driver names, route descriptions, vehicle number validation, and automated stock deductions.",
            icon: Truck,
            color: "from-amber-500 to-orange-600",
            badge: "Dispatch Ready"
        },
        {
            title: "UPI & QR Code Payments",
            desc: "Enable fast payments by adding your UPI ID and uploading custom QR codes. The QR code is rendered directly on PDF invoices for direct customer scan & pay.",
            icon: QrCode,
            color: "from-emerald-500 to-teal-600",
            badge: "Scan & Pay"
        },
        {
            title: "Authorized Digital Signatures",
            desc: "Upload your company's signature. Place authorized signature blocks on transactional PDFs automatically, keeping it blank when unconfigured.",
            icon: Sparkles,
            color: "from-violet-500 to-purple-600",
            badge: "Digital Sign"
        },
        {
            title: "Inventory & Stock Alerts",
            desc: "Track real-time stock levels, prevent negative-stock dispatches, and get automated dashboard alerts when item counts fall below threshold limits.",
            icon: Package,
            color: "from-cyan-500 to-blue-600",
            badge: "Real-time Sync"
        },
        {
            title: "Recurring Invoices & Schedules",
            desc: "Automate periodic customer billing by scheduling recurring invoices. Send automated payment reminder emails to clients on weekly or monthly cycles.",
            icon: RefreshCw,
            color: "from-fuchsia-500 to-purple-600",
            badge: "Automation"
        },
        {
            title: "GST Summary & GSTR Filing Reports",
            desc: "Generate and export accurate GSTR-1, GSTR-3B, and tax summary ledgers in GSTR-compliant layout format to simplify tax filing.",
            icon: FileSpreadsheet,
            color: "from-green-500 to-emerald-600",
            badge: "Tax Ready"
        }
    ];

    return (
        <div className="max-w-6xl mx-auto pb-20 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-4 py-6 border-b border-slate-200/80 mb-10 no-print">
                <button onClick={() => navigate('/dashboard')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Features & Customizations</h1>
                    <p className="text-slate-500 text-sm">Explore premium billing capabilities, invoice templates, and styling options.</p>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden mb-12">
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white blur-xl"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 bg-indigo-500 blur-lg"></div>
                
                <div className="relative z-10 max-w-2xl">
                    <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase">Prolync Billing Premium</span>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-4 leading-tight">
                        Powering Your Business Transactions with Visual Excellence
                    </h2>
                    <p className="text-slate-300 text-sm md:text-base mt-4 leading-relaxed font-medium">
                        Say goodbye to generic, boring bills. Prolync Billing gives you professional invoicing, instant digital payments, live GST calculations, and smooth inventory stock tracking out of the box.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-8">
                        <button onClick={() => navigate('/settings')} className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-none font-bold">
                            Configure Settings
                        </button>
                        <button onClick={() => navigate('/invoices/new')} className="btn-secondary bg-white/10 hover:bg-white/20 text-white border-white/10">
                            Create First Invoice
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mainFeatures.map((f, idx) => {
                    const IconComp = f.icon;
                    return (
                        <div key={idx} className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-center mb-5">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                        <IconComp size={22} />
                                    </div>
                                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">{f.badge}</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-800 tracking-tight mb-2">{f.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                            </div>
                            <div className="border-t border-slate-50 pt-4 mt-6 flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                                <span>Status</span>
                                <span className="text-emerald-500 flex items-center gap-1.5"><CheckCircle2 size={12} /> Active</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Features;
