import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, TrendingUp, TrendingDown, IndianRupee, Printer, Percent, ShieldCheck, Calculator } from 'lucide-react';

const GstSummary = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dates, setDates] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchGstSummary();
    }, [dates]);

    const fetchGstSummary = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/reports/gst-summary?startDate=${dates.startDate}&endDate=${dates.endDate}`);
            setSummary(res.data.data);
        } catch (error) {
            console.error('Error fetching GST summary', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading && !summary) {
        return (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Compiling Tax Data...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto mb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                        <Percent size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">GST Filing Center</h1>
                        <p className="text-sm text-slate-500 font-medium">Compliance overview and tax liability mapping</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-blue-500 transition-colors">
                        <input type="date" className="bg-transparent text-sm font-bold text-slate-700 outline-none w-32" value={dates.startDate} onChange={e => setDates({ ...dates, startDate: e.target.value })} />
                        <span className="text-slate-300 mx-2 text-xs font-bold uppercase">to</span>
                        <input type="date" className="bg-transparent text-sm font-bold text-slate-700 outline-none w-32" value={dates.endDate} onChange={e => setDates({ ...dates, endDate: e.target.value })} />
                    </div>
                    <button
                        onClick={handlePrint}
                        className="btn-secondary bg-white text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm font-bold active:scale-95 transition-all text-sm"
                    >
                        <Printer size={18} />
                        Print Report
                    </button>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-8 rounded-2xl border-b-4 border-blue-500 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp size={120} className="text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Output GST (Sales)</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-blue-600">₹</span>
                            <h3 className="text-3xl font-black text-slate-900 leading-none tracking-tight">{(summary?.totalOutputGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">
                            <ShieldCheck size={12} />
                            COMPLIANT DATA
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border-b-4 border-sky-500 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <TrendingDown size={120} className="text-sky-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Input GST (Purchases)</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-sky-600">₹</span>
                            <h3 className="text-3xl font-black text-slate-900 leading-none tracking-tight">{(summary?.totalInputGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full w-fit">
                            <Calculator size={12} />
                            TAX CREDIT ELIGIBLE
                        </div>
                    </div>
                </div>

                <div className={`p-8 rounded-2xl border-b-4 shadow-xl relative overflow-hidden group ${summary?.netGstPayable > 0 ? 'bg-blue-600 border-blue-800' : 'bg-slate-700 border-slate-900'}`}>
                    <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-500 text-white">
                        <PieChart size={120} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase text-white/70 tracking-widest mb-2">Net Liability / (Credit)</p>
                        <div className="flex items-baseline gap-1 focus:outline-none">
                            <span className="text-xl font-bold text-white/90">₹</span>
                            <h3 className="text-3xl font-black text-white leading-none tracking-tight">
                                {Math.abs(summary?.netGstPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="mt-6 font-black text-[11px] text-white uppercase tracking-[0.2em] bg-black/10 px-4 py-1.5 rounded-lg w-fit border border-white/10">
                            {summary?.netGstPayable > 0 ? 'PAYABLE TO GOVT' : 'TAX CREDIT REMAINING'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Tax Mapping Transactions</h3>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-[9px] font-black text-blue-600 border border-blue-100">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> OUTPUT
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-sky-50 rounded text-[9px] font-black text-sky-600 border border-sky-100">
                            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> INPUT
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Bill / Inv #</th>
                                <th className="px-6 py-4">Party Details</th>
                                <th className="px-6 py-4">GSTIN</th>
                                <th className="px-6 py-4 text-right">Taxable Value</th>
                                <th className="px-6 py-4 text-right pr-10">Tax Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(!summary?.transactions || summary.transactions.length === 0) ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center shadow-inner">
                                                <Percent size={32} />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-900 tracking-tight">No Transactions Recorded</h3>
                                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Either you are in a new tax period or no GST applicable data was found for these dates.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                (Array.isArray(summary.transactions) ? summary.transactions : []).map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors cursor-default">
                                        <td className="px-6 py-5 text-xs font-bold text-slate-500">{t.date}</td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-sm font-black text-blue-600">{t.transactionNumber}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-bold text-slate-900">{t.partyName}</div>
                                            <div className={`text-[9px] font-black uppercase mt-0.5 px-1.5 py-0.5 rounded w-fit ${t.type === 'Output' ? 'bg-blue-50 text-blue-600' : 'bg-sky-50 text-sky-600 font-black'}`}>
                                                {t.type} TRANSACTION
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-mono font-bold text-slate-400 tracking-tight">{t.gstin || 'NOT PROVIDED'}</span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-bold text-slate-900">₹{t.taxableValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className={`px-6 py-5 text-right pr-10 font-black ${t.type === 'Output' ? 'text-blue-600' : 'text-sky-600'}`}>
                                            {t.type === 'Output' ? '+' : '-'} ₹{t.taxAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GstSummary;
