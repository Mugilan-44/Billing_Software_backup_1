import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, CreditCard, Filter, Download } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Payments = () => {
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { taxSystemMode } = useContext(AuthContext);

    useEffect(() => {
        fetchPayments();
    }, [taxSystemMode]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const queryParam = taxSystemMode !== 'OVERALL' ? `?taxMode=${taxSystemMode}` : '';
            const res = await axios.get(`/api/payments${queryParam}`);
            setPayments(res.data.data);
        } catch (error) {
            console.error('Error fetching payments', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPayments = payments.filter(p =>
        p.paymentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customerId?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto mb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shadow-inner">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments Received</h1>
                        <p className="text-sm text-slate-500 font-medium">Record receipts and manage customer collections</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search payments..."
                            className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                        <Filter size={20} />
                    </button>
                    <button
                        onClick={() => navigate('/payments/new')}
                        className="btn-primary bg-green-600 hover:bg-green-700 px-6 flex items-center gap-2 shadow-lg shadow-green-500/20 border-green-600"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Record Payment
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto overflow-visible">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Payment #</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Ref / Invoice</th>
                                <th className="px-6 py-4">Mode</th>
                                <th className="px-6 py-4 text-right pr-8">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Payments...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center shadow-inner">
                                                <CreditCard size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">No Payments Found</h3>
                                                <p className="text-sm text-slate-500 max-w-xs mx-auto">Either you haven't recorded any payments or no records match your search.</p>
                                            </div>
                                            <button onClick={() => navigate('/payments/new')} className="btn-primary bg-green-600 hover:bg-green-700 px-6 py-2 text-xs border-green-600">Record First Payment</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((p) => (
                                    <tr
                                        key={p._id}
                                        className="hover:bg-green-50/30 transition-colors group cursor-pointer"
                                        onClick={() => navigate(`/payments/${p._id}/edit`)}
                                    >
                                        <td className="px-6 py-5 text-sm font-bold text-slate-700">
                                            {new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-black text-blue-600">{p.paymentNumber}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm text-slate-900 font-bold">{p.customerId?.companyName}</div>
                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{p.customerId?.phone}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                {p.invoiceId ? (
                                                    <span className="text-[10px] font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded self-start font-bold">
                                                        {p.invoiceId.invoiceNumber}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-mono bg-amber-50 text-amber-600 px-2 py-0.5 rounded self-start font-bold uppercase">
                                                        Advance
                                                    </span>
                                                )}
                                                {p.referenceNumber && <span className="text-xs text-slate-400 font-medium">{p.referenceNumber}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                                                {p.paymentMode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            <span className="text-base font-black text-slate-900">₹{(p.amount || 0).toFixed(2)}</span>
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

export default Payments;
