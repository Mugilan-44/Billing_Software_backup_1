import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { Plus, Calculator, Settings, ReceiptText } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Expenses = () => {
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const { taxSystemMode } = useContext(AuthContext);

    useEffect(() => {
        fetchExpenses();
    }, [taxSystemMode]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const queryParam = taxSystemMode !== 'OVERALL' ? `?taxMode=${taxSystemMode}` : '';
            const res = await axios.get(`/api/expenses${queryParam}`);
            setExpenses(res.data.data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto mb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Expenses</h1>
                        <p className="text-sm text-slate-500 font-medium">Tracking company payouts & operational costs</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={() => navigate('/expenses/new')}
                        className="btn-primary px-6 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Record Expense
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto overflow-visible">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Account / Category</th>
                                <th className="px-6 py-4">Vendor</th>
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right pr-8">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center shadow-inner">
                                                <ReceiptText size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Zero Payouts Found</h3>
                                                <p className="text-sm text-slate-500 max-w-xs mx-auto">No expenses recorded yet. Start tracking your business outflows here.</p>
                                            </div>
                                            <button onClick={() => navigate('/expenses/new')} className="btn-primary px-6 py-2 text-xs">Record First Expense</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((expense) => (
                                    <tr key={expense._id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/expenses/${expense._id}/edit`)}>
                                        <td className="px-6 py-5 text-sm font-bold text-slate-700">
                                            {new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{expense.category}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{expense.paymentMethod}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-slate-600 font-medium">{expense.vendorId?.companyName || expense.vendorName || <span className="text-slate-300 italic">Self / Indirect</span>}</td>
                                        <td className="px-6 py-5">
                                            <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">{expense.reference || 'NO-REF'}</span>
                                        </td>
                                        <td className="px-6 py-5 text-sm">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight bg-green-50 text-green-600 border border-green-100">
                                                {expense.status || 'Paid'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            <span className="text-base font-black text-slate-900">₹{(expense.amount || 0).toFixed(2)}</span>
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

export default Expenses;
