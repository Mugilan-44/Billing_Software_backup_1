import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, FileText, X, Mail, Phone, User, MapPin, CreditCard, Building2, Briefcase, Award } from 'lucide-react';

const Customers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [ledgerData, setLedgerData] = useState([]);
    const [loadingLedger, setLoadingLedger] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('/api/customers');
            setCustomers(res.data.data);
            if (res.data.data.length > 0) {
                // Pre-select first customer
                setSelectedCustomer(res.data.data[0]);
                fetchLedger(res.data.data[0]);
            }
        } catch (error) {
            console.error('Error fetching customers', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLedger = async (customer) => {
        if (!customer) return;
        setLoadingLedger(true);
        try {
            const res = await axios.get(`/api/customers/${customer._id}/ledger`);
            setLedgerData(res.data.data);
        } catch (error) {
            console.error('Error fetching ledger', error);
            setLedgerData([]);
        } finally {
            setLoadingLedger(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                await axios.delete(`/api/customers/${id}`);
                // Refresh list
                const res = await axios.get('/api/customers');
                setCustomers(res.data.data);
                if (res.data.data.length > 0) {
                    setSelectedCustomer(res.data.data[0]);
                    fetchLedger(res.data.data[0]);
                } else {
                    setSelectedCustomer(null);
                    setLedgerData([]);
                }
            } catch (error) {
                console.error('Error deleting customer', error);
            }
        }
    };

    const handleSelectCustomer = (cust) => {
        setSelectedCustomer(cust);
        fetchLedger(cust);
    };

    const filteredCustomers = customers.filter(c =>
        (c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.workPhone || c.phone || '').includes(searchTerm) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-5 h-full flex flex-col font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Customers List</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Manage accounts, billing profiles, and customer ledgers.</p>
                </div>
                <button onClick={() => navigate('/customers/new')} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Add Customer
                </button>
            </div>

            {/* Split Pane Container */}
            <div className="grid grid-cols-12 gap-5 flex-1 min-h-[500px]">
                {/* Left Pane: Customer List Selector (Col-span 4) */}
                <div className="col-span-12 md:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-h-[75vh]">
                    {/* Search Panel */}
                    <div className="p-3.5 border-b border-slate-100 shrink-0">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                className="input-field pl-9 py-1.5 text-xs rounded-lg"
                                placeholder="Search client name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                        {loading ? (
                            <p className="text-xs text-slate-400 text-center py-10">Retrieving customers...</p>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-xs text-slate-400">No customers found.</p>
                            </div>
                        ) : (
                            filteredCustomers.map(c => {
                                const isSelected = selectedCustomer?._id === c._id;
                                return (
                                    <div
                                        key={c._id}
                                        onClick={() => handleSelectCustomer(c)}
                                        className={`p-3.5 flex justify-between items-center cursor-pointer transition-all duration-150 ${isSelected ? 'bg-blue-50/50 border-l-4 border-blue-600 pl-2.5' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-600' : 'text-slate-800'}`}>{c.companyName}</p>
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.email || 'No email'}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-[11px] font-extrabold ${c.outstandingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                ₹{Number(c.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Balance</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Pane: Detailed Profile & Ledger Statement (Col-span 8) */}
                <div className="col-span-12 md:col-span-8 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
                    {selectedCustomer ? (
                        <>
                            {/* Profile Overview Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                                            {selectedCustomer.companyName?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-base font-extrabold text-slate-800">{selectedCustomer.companyName}</h2>
                                            <p className="text-xs text-slate-400 mt-0.5">Primary Contact: {selectedCustomer.firstName ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Not Specified'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/customers/${selectedCustomer._id}/edit`)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                                            title="Edit Profile"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(selectedCustomer._id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                                            title="Delete Customer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Core Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Contact Information</p>
                                        <p className="text-slate-700 flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {selectedCustomer.email || '-'}</p>
                                        <p className="text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {selectedCustomer.workPhone || selectedCustomer.phone || '-'}</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Tax & Compliance</p>
                                        <p className="text-slate-700 font-mono">GSTIN: {selectedCustomer.gstNumber || selectedCustomer.gstin || '—'}</p>
                                        <p className="text-slate-700 font-mono">PAN: {selectedCustomer.panNumber || '—'}</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Billing Address</p>
                                        <p className="text-slate-600 flex items-start gap-1"><MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                            <span>
                                                {selectedCustomer.billingAddress ? (
                                                    <>
                                                        {selectedCustomer.billingAddress.street1} {selectedCustomer.billingAddress.street2 && `, ${selectedCustomer.billingAddress.street2}`}<br />
                                                        {selectedCustomer.billingAddress.city}, {selectedCustomer.billingAddress.state} - {selectedCustomer.billingAddress.zipCode}
                                                    </>
                                                ) : (
                                                    selectedCustomer.address || 'No billing address provided.'
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Business Metrics */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Business</p>
                                        <p className="text-base font-extrabold text-slate-800">₹{Number(selectedCustomer.totalBusiness || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
                                        <p className={`text-base font-extrabold ${selectedCustomer.outstandingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            ₹{Number(selectedCustomer.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Account Statement / Ledger Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Account Statement Ledger</h3>
                                        <p className="text-[9px] text-slate-400">Statement of bills raised and payments reconciled.</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    {loadingLedger ? (
                                        <p className="text-xs text-slate-400 text-center py-12">Compiling transactions...</p>
                                    ) : ledgerData.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-12">No transactions recorded yet.</p>
                                    ) : (
                                        <table className="min-w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <th className="px-4 py-3 text-left">Date</th>
                                                    <th className="px-4 py-3 text-left">Particulars</th>
                                                    <th className="px-4 py-3 text-left">Type</th>
                                                    <th className="px-4 py-3 text-right">Debit (₹)</th>
                                                    <th className="px-4 py-3 text-right">Credit (₹)</th>
                                                    <th className="px-4 py-3 text-right">Balance (₹)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {ledgerData.map((entry, idx) => (
                                                    <tr key={entry._id || idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-slate-700 font-medium">{entry.description}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${entry.type === 'Invoice' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                                {entry.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-red-500 font-semibold text-right">{entry.debit > 0 ? entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td>
                                                        <td className="px-4 py-3 text-emerald-600 font-semibold text-right">{entry.credit > 0 ? entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td>
                                                        <td className="px-4 py-3 text-slate-900 font-extrabold text-right">{entry.balance ? entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm flex flex-col items-center justify-center flex-1">
                            <Building2 className="text-slate-300 mb-3" size={40} />
                            <h3 className="text-sm font-bold text-slate-700">No Customer Selected</h3>
                            <p className="text-xs text-slate-400 mt-1">Please select a customer from the left list to view detailed profile and statements.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Customers;
