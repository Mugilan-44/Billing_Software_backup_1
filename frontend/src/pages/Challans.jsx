import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, CheckCircle, FileText } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Challans = () => {
    const navigate = useNavigate();
    const [challans, setChallans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { taxSystemMode } = useContext(AuthContext);

    useEffect(() => {
        fetchChallans();
    }, [taxSystemMode]);

    const [sortBy, setSortBy] = useState('date-desc');

    const fetchChallans = async () => {
        try {
            setLoading(true);
            const queryParam = taxSystemMode !== 'OVERALL' ? `?taxMode=${taxSystemMode}` : '';
            const res = await axios.get(`/api/challans${queryParam}`);
            setChallans(res.data.data);
        } catch (error) {
            console.error('Error fetching challans', error);
        } finally {
            setLoading(false);
        }
    };

    const sortedChallans = [...challans.filter(c =>
        c.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.customerId?.companyName && c.customerId.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    )].sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
        return 0;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Delivery Challans</h1>
                    <p className="text-sm text-gray-500">Track and manage goods delivery operations.</p>
                </div>
                <Link to="/challans/new" className="btn-primary flex items-center">
                    <Plus size={18} className="mr-2" />
                    New Challan
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
                            placeholder="Search challan number..."
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
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Challan #</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                            ) : sortedChallans.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No delivery challans found.</td></tr>
                            ) : (
                                sortedChallans.map(chl => (
                                    <tr
                                        key={chl._id}
                                        onClick={() => navigate(`/challans/${chl._id}`)}
                                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(chl.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary-600">{chl.challanNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{chl.customerId?.companyName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {chl.transportDetails?.vehicleNumber || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                                ${chl.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                                    chl.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                                                        chl.status === 'Converted' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                {chl.status}
                                            </span>
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

export default Challans;
