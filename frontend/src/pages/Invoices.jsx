import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Download, Share2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Invoices = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');
    const { taxSystemMode } = useContext(AuthContext);

    useEffect(() => {
        fetchInvoices();
    }, [taxSystemMode]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const queryParam = taxSystemMode !== 'OVERALL' ? `?taxMode=${taxSystemMode}` : '';
            const res = await axios.get(`/api/invoices${queryParam}`);
            setInvoices(res.data.data);
        } catch (error) {
            console.error('Error fetching invoices', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (id, invoiceNumber) => {
        const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('user'))?.token || '';
        window.location.href = `/api/invoices/${id}/download?token=${token}`;
    };





    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.customerId?.companyName && inv.customerId.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortBy === 'amount-desc') return b.grandTotal - a.grandTotal;
        if (sortBy === 'amount-asc') return a.grandTotal - b.grandTotal;
        return 0;
    });

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center glass-panel p-6 rounded-2xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Invoices</h1>
                    <p className="text-sm text-slate-500 mt-1">Create, track, and manage all billing documents.</p>
                </div>
                <Link to="/invoices/new" className="btn-primary flex items-center">
                    <Plus size={18} />
                    Create Invoice
                </Link>
            </div>

            <div className="glass-card p-6">
                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Search invoice number or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-500">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm"
                        >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="amount-desc">Amount (High-Low)</option>
                            <option value="amount-asc">Amount (Low-High)</option>
                        </select>
                    </div>
                </div>

                <div className="premium-table-container">
                    <table className="min-w-full divide-y divide-slate-100/50">
                        <thead className="bg-slate-50/50 text-left">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100/50">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                            ) : sortedInvoices.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No invoices found.</td></tr>
                            ) : (
                                sortedInvoices.map(inv => (
                                    <tr
                                        key={inv._id}
                                        onClick={() => navigate(`/invoices/${inv._id}`)}
                                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(inv.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary-600">{inv.invoiceNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{inv.customerId?.companyName}</div>
                                            <div className="text-xs text-gray-500">{inv.customerId?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                    inv.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' :
                                                        inv.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                                            inv.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                            ₹{(inv.grandTotal || 0).toFixed(2)}
                                            {inv.status !== 'Paid' && (
                                                <div className="text-xs text-gray-500 font-normal mt-1">Bal: ₹{((inv.grandTotal || 0) - (inv.amountPaid || 0)).toFixed(2)}</div>
                                            )}
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

export default Invoices;
