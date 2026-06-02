import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

const Items = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        try {
            const res = await axios.get('/api/items');
            setItems(res.data.data);
        } catch (error) { console.error('Error fetching items', error); }
        finally { setLoading(false); }
    };

    const openModal = (item = null) => {
        if (item) {
            navigate(`/items/${item._id}/edit`);
        } else {
            navigate('/items/new');
        }
    };

    const deleteItem = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await axios.delete(`/api/items/${id}`);
                fetchItems();
            } catch (error) { console.error('Error deleting item', error); }
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Items / Catalog</h1>
                    <p className="text-sm text-gray-500">Manage products, services and inventory levels.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center">
                    <Plus size={18} className="mr-2" /> New Item
                </button>
            </div>

            <div className="card">
                <div className="mb-4 relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-gray-400" /></div>
                    <input type="text" className="input-field pl-10" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name & SKU</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Selling Price</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Tax</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Avail. Stock</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr> :
                                filteredItems.map(item => (
                                    <tr key={item._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500 font-mono">SKU: {item.sku || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">₹{(item.sellingPrice || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                {item.taxRate !== undefined ? item.taxRate : (item.gstPercentage || item.gstPercent || 0)}% ({item.taxType || 'GST'})
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm font-bold text-gray-900">
                                                {item.trackStock !== false ? (item.availableStock ?? item.stockQuantity ?? 0) : 'Not tracked'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold">{item.unit}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-medium space-x-3">
                                            <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-900 transition-colors p-1.5 hover:bg-blue-50 rounded-lg"><Edit2 size={16} className="inline" /></button>
                                            <button onClick={() => deleteItem(item._id)} className="text-red-600 hover:text-red-900 transition-colors p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="inline" /></button>
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

export default Items;
