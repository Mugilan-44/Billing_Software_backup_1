import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, CheckCircle, Package } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const PurchaseBills = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { taxSystemMode } = useContext(AuthContext);

    useEffect(() => {
        fetchBills();
    }, [taxSystemMode]);

    const [sortBy, setSortBy] = useState('date-desc');
    const navigate = useNavigate();

    const fetchBills = async () => {
        try {
            setLoading(true);
            const queryParam = taxSystemMode !== 'OVERALL' ? `?taxMode=${taxSystemMode}` : '';
            const res = await axios.get(`/api/purchase-bills${queryParam}`);
            setBills(res.data.data);
        } catch (error) {
            console.error('Error fetching purchase bills', error);
        } finally {
            setLoading(false);
        }
    };

    const sortedBills = [...bills.filter(b =>
        b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.vendorId?.companyName && b.vendorId.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    )].sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.billDate) - new Date(a.billDate);
        if (sortBy === 'date-asc') return new Date(a.billDate) - new Date(b.billDate);
        return 0;
    });

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`/api/purchase-bills/${id}/status`, { status });
            fetchBills();
        } catch (error) {
            console.error('Error updating status', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Purchase Bills</h1>
                    <p className="text-sm text-gray-500">Record purchases from vendors and automatically update stock.</p>
                </div>
                <Link to="/purchase-bills/new" className="btn-primary flex items-center">
                    <Plus size={18} className="mr-2" />
                    New Bill
                </Link>
            </div>

            <div className="card">
                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Search bill number..."
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
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bill #</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                            ) : sortedBills.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No matching purchase bills found.</td></tr>
                            ) : (
                                sortedBills.map(b => (
                                    <tr
                                        key={b._id}
                                        onClick={() => navigate(`/purchase-bills/${b._id}`)}
                                        className="hover:bg-rose-50/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(b.billDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary-600">{b.billNumber}</div>
                                            <div className="text-xs text-gray-400 mt-1 flex items-center">
                                                <Package size={12} className="mr-1 inline" /> Stock In
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{b.vendorId?.companyName}</div>
                                            <div className="text-xs text-gray-500">{b.vendorId?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                className={`text-xs font-semibold rounded-full px-2 py-1 outline-none border border-slate-200
                                                ${b.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                        b.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                            b.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'}`}
                                                value={b.status}
                                                onChange={(e) => updateStatus(b._id, e.target.value)}
                                            >
                                                <option value="Unpaid">Unpaid</option>
                                                <option value="Partially Paid">Partially Paid</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Overdue">Overdue</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                            {(b.grandTotal || 0).toFixed(2)}
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

export default PurchaseBills;
