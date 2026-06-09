import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';


const Vendors = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { fetchVendors(); }, []);

    const fetchVendors = async () => {
        try {
            const res = await axios.get('/api/vendors');
            setVendors(res.data.data);
        } catch (error) { console.error('Error fetching vendors', error); }
        finally { setLoading(false); }
    };

    const openModal = (vendor = null) => {
        if (vendor) {
            navigate(`/vendors/${vendor._id}/edit`);
        } else {
            navigate('/vendors/new');
        }
    };

    const deleteVendor = async (id) => {
        if (window.confirm('Are you sure you want to delete this vendor?')) {
            try {
                await axios.delete(`/api/vendors/${id}`);
                fetchVendors();
            } catch (error) { console.error('Error deleting vendor', error); }
        }
    };

    const filteredVendors = vendors.filter(v =>
        v.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.constactPerson && v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Vendors</h1>
                    <p className="text-sm text-gray-500">Manage suppliers and accounts payable profiles.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center">
                    <Plus size={18} className="mr-2" /> New Vendor
                </button>
            </div>

            <div className="card">
                <div className="mb-4 relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-gray-400" /></div>
                    <input type="text" className="input-field pl-10" placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Info</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Balance</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr> :
                                filteredVendors.map(v => (
                                    <tr key={v._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{v.companyName}</div>
                                            <div className="text-xs text-gray-500 font-mono">GST: {v.gstNumber || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{v.contactPerson || '-'}</div>
                                            <div className="text-xs text-gray-500">{v.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">₹{(v.openingBalance || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center text-sm font-medium space-x-3">
                                            <button onClick={() => openModal(v)} className="text-blue-600 hover:text-blue-900 transition-colors p-1.5 hover:bg-blue-50 rounded-lg"><Edit2 size={16} className="inline" /></button>
                                            <button onClick={() => deleteVendor(v._id)} className="text-red-600 hover:text-red-900 transition-colors p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="inline" /></button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Vendors;
