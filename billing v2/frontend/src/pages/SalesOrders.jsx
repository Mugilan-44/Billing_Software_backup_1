import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Truck, FileText } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const SalesOrders = () => {
    const [salesOrders, setSalesOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { taxSystemMode } = useContext(AuthContext);

    useEffect(() => {
        fetchSalesOrders();
    }, [taxSystemMode]);

    const [sortBy, setSortBy] = useState('date-desc');
    const navigate = useNavigate();

    const fetchSalesOrders = async () => {
        try {
            setLoading(true);
            const queryParam = taxSystemMode !== 'OVERALL' ? `?taxMode=${taxSystemMode}` : '';
            const res = await axios.get(`/api/sales-orders${queryParam}`);
            setSalesOrders(res.data.data);
        } catch (error) {
            console.error('Error fetching sales orders', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`/api/sales-orders/${id}/status`, { status });
            fetchSalesOrders();
        } catch (error) {
            console.error('Error updating status', error);
        }
    };

    const filteredOrders = salesOrders.filter(so =>
        so.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (so.customerId?.companyName && so.customerId.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const sortedOrders = [...filteredOrders].sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'amount-desc') return b.grandTotal - a.grandTotal;
        if (sortBy === 'amount-asc') return a.grandTotal - b.grandTotal;
        return 0;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Sales Orders</h1>
                    <p className="text-sm text-gray-500">Track pending and confirmed customer orders.</p>
                </div>
                <Link to="/orders/new" className="btn-primary flex items-center">
                    <Plus size={18} className="mr-2" />
                    New Sales Order
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
                            placeholder="Search order number or customer..."
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

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                            ) : sortedOrders.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No sales orders found.</td></tr>
                            ) : (
                                sortedOrders.map(so => (
                                    <tr
                                        key={so._id}
                                        onClick={() => navigate(`/orders/${so._id}`)}
                                        className="hover:bg-purple-50/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(so.createdAt).toLocaleDateString()}
                                            {so.expectedDeliveryDate && (
                                                <div className="text-xs text-blue-500 mt-1">Exp. Delivery: {new Date(so.expectedDeliveryDate).toLocaleDateString()}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary-600">{so.orderNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{so.customerId?.companyName}</div>
                                            <div className="text-xs text-gray-500">{so.customerId?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                className={`text-xs font-semibold rounded-full px-2 py-1 outline-none border border-slate-200
                                                ${so.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                                                        so.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                                            so.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                                so.status === 'Invoiced' ? 'bg-purple-100 text-purple-800' :
                                                                    'bg-yellow-100 text-yellow-800'}`}
                                                value={so.status}
                                                onChange={(e) => updateStatus(so._id, e.target.value)}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Confirmed">Confirmed</option>
                                                <option value="Delivered">Delivered</option>
                                                <option value="Cancelled">Cancelled</option>
                                                <option value="Invoiced" disabled>Invoiced</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                            {(so.grandTotal || 0).toFixed(2)}
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

export default SalesOrders;
