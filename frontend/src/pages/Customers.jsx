import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, FileText, X } from 'lucide-react';

const Customers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [ledgerCustomer, setLedgerCustomer] = useState(null);
    const [ledgerData, setLedgerData] = useState(null);

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('/api/customers');
            setCustomers(res.data.data);
        } catch (error) {
            console.error('Error fetching customers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                await axios.delete(`/api/customers/${id}`);
                fetchCustomers();
            } catch (error) {
                console.error('Error deleting customer', error);
            }
        }
    };

    const filteredCustomers = customers.filter(c =>
        (c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.workPhone || c.phone || '').includes(searchTerm) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openLedger = async (customer) => {
        try {
            setLedgerCustomer(customer);
            setLedgerData(null);
            const res = await axios.get(`/api/customers/${customer._id}/ledger`);
            setLedgerData(res.data.data);
        } catch (error) {
            console.error('Error fetching ledger', error);
            setLedgerData([]);
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage your clients, contacts and account ledgers.</p>
                </div>
                <button onClick={() => navigate('/customers/new')} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> New Customer
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Search bar */}
                <div className="px-5 py-4 border-b border-slate-100">
                    <div className="relative max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            className="input-field pl-9 py-1.5 text-sm"
                            placeholder="Search by name, email or phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">GSTIN</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Terms</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding (₹)</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-400">Loading customers...</td></tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="text-slate-400 text-sm">No customers found.</div>
                                        <button onClick={() => navigate('/customers/new')} className="mt-3 btn-primary text-xs px-4 py-1.5 inline-flex items-center gap-1.5">
                                            <Plus size={14} /> Add your first customer
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map(c => (
                                    <tr key={c._id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                                                    {c.companyName?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{c.companyName}</div>
                                                    <div className="text-xs text-slate-500">{c.displayName !== c.companyName ? c.displayName : (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : '')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <div className="text-sm text-slate-800">{c.workPhone || c.phone || '-'}</div>
                                            <div className="text-xs text-slate-400">{c.email || ''}</div>
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-slate-600 font-mono">{c.gstNumber || '—'}</td>
                                        <td className="px-6 py-3.5">
                                            <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                                {c.paymentTerms || 'Due on Receipt'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-3.5 text-sm font-bold text-right ${c.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {c.outstandingBalance?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center justify-end gap-3">
                                                <button onClick={() => openLedger(c)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Ledger">
                                                    <FileText size={15} />
                                                </button>
                                                <button onClick={() => navigate(`/customers/${c._id}/edit`)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button onClick={() => handleDelete(c._id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredCustomers.length > 0 && (
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                        Showing {filteredCustomers.length} of {customers.length} customers
                    </div>
                )}
            </div>

            {/* Ledger Modal */}
            {ledgerCustomer && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Account Statement</h3>
                                <p className="text-sm text-slate-500">{ledgerCustomer.companyName}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">Outstanding Balance</p>
                                    <p className={`text-lg font-bold ${ledgerCustomer.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{ledgerCustomer.outstandingBalance?.toFixed(2)}
                                    </p>
                                </div>
                                <button onClick={() => { setLedgerCustomer(null); setLedgerData(null); }}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1 p-2">
                            {ledgerData === null ? (
                                <div className="text-center text-slate-400 py-12">Loading statement...</div>
                            ) : ledgerData.length === 0 ? (
                                <div className="text-center text-slate-400 py-12">No transactions recorded yet.</div>
                            ) : (
                                <table className="min-w-full">
                                    <thead className="sticky top-0 bg-slate-50">
                                        <tr className="border-y border-slate-200">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Particulars</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Debit (₹)</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Credit (₹)</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Balance (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ledgerData.map((entry, idx) => (
                                            <tr key={entry._id || idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm text-slate-500">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                                                <td className="px-4 py-3 text-sm text-slate-800 font-medium">{entry.description}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${entry.type === 'Invoice' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                        {entry.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">{entry.debit > 0 ? entry.debit.toFixed(2) : '—'}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">{entry.credit > 0 ? entry.credit.toFixed(2) : '—'}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">{entry.balance.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
