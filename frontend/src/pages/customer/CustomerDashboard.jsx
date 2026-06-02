import { useState, useEffect, useContext } from 'react';
import axios from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { FileText, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const CustomerDashboard = () => {
    const { user } = useContext(AuthContext);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ total: 0, paid: 0, outstanding: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('/api/invoices');
                const data = res.data.data || [];
                setInvoices(data.slice(0, 5));
                const total = data.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
                const paid = data.filter(inv => inv.status === 'Paid').reduce((s, inv) => s + (inv.totalAmount || 0), 0);
                setSummary({ total, paid, outstanding: total - paid });
            } catch (error) {
                console.error('Error fetching invoices:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const statusColor = (s) => {
        switch (s) {
            case 'Paid': return 'bg-green-900/40 text-green-400';
            case 'Overdue': return 'bg-red-900/40 text-red-400';
            default: return 'bg-yellow-900/40 text-yellow-400';
        }
    };

    const cards = [
        { label: 'Total Invoiced', value: `₹${summary.total.toFixed(2)}`, icon: <FileText size={20} />, color: 'bg-blue-900/40 text-blue-400' },
        { label: 'Total Paid', value: `₹${summary.paid.toFixed(2)}`, icon: <CreditCard size={20} />, color: 'bg-green-900/40 text-green-400' },
        { label: 'Outstanding', value: `₹${summary.outstanding.toFixed(2)}`, icon: <AlertTriangle size={20} />, color: 'bg-red-900/40 text-red-400' },
        { label: 'Invoices', value: invoices.length, icon: <TrendingUp size={20} />, color: 'bg-purple-900/40 text-purple-400' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Welcome, {user?.name} 👋</h1>
                <p className="text-slate-400 text-sm mt-1">Here's your account summary.</p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map(card => (
                    <div key={card.label} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                        <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>{card.icon}</div>
                        <div className="text-xl font-bold text-white">{loading ? '—' : card.value}</div>
                        <div className="text-sm text-slate-400 mt-0.5">{card.label}</div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                    <h3 className="text-white font-semibold">Recent Invoices</h3>
                    <Link to="/customer/invoices" className="text-xs text-emerald-400 hover:text-emerald-300">View all →</Link>
                </div>
                <div className="divide-y divide-slate-700/50">
                    {loading ? (
                        <div className="px-5 py-8 text-center text-slate-500 text-sm">Loading...</div>
                    ) : invoices.length === 0 ? (
                        <div className="px-5 py-8 text-center text-slate-500 text-sm">No invoices found.</div>
                    ) : (
                        invoices.map(inv => (
                            <div key={inv._id} className="px-5 py-3.5 flex items-center justify-between">
                                <div>
                                    <div className="text-white text-sm font-medium">{inv.invoiceNumber || inv._id}</div>
                                    <div className="text-slate-500 text-xs">{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-IN')}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-white text-sm font-semibold">₹{(inv.totalAmount || inv.grandTotal || 0).toFixed(2)}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>{inv.status}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerDashboard;
