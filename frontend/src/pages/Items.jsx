import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react';

const Items = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');

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

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = typeFilter === 'All' || item.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const counts = {
        all: items.length,
        goods: items.filter(i => i.type === 'Goods').length,
        service: items.filter(i => i.type === 'Service').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Package size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Items / Catalog</h1>
                        <p className="text-sm text-slate-500">Manage products, services and inventory levels.</p>
                    </div>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center">
                    <Plus size={18} className="mr-2" /> New Item
                </button>
            </div>

            <div className="card">
                {/* Search + Type Toggle */}
                <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="relative max-w-md flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-gray-400" /></div>
                        <input type="text" className="input-field pl-10" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* Goods / Services Toggle */}
                    <div className="segment-toggle">
                        <button
                            className={`segment-toggle-btn ${typeFilter === 'All' ? 'active' : ''}`}
                            onClick={() => setTypeFilter('All')}
                        >
                            All <span className="text-[10px] ml-1 opacity-60">({counts.all})</span>
                        </button>
                        <button
                            className={`segment-toggle-btn ${typeFilter === 'Goods' ? 'active' : ''}`}
                            onClick={() => setTypeFilter('Goods')}
                        >
                            Goods <span className="text-[10px] ml-1 opacity-60">({counts.goods})</span>
                        </button>
                        <button
                            className={`segment-toggle-btn ${typeFilter === 'Service' ? 'active' : ''}`}
                            onClick={() => setTypeFilter('Service')}
                        >
                            Services <span className="text-[10px] ml-1 opacity-60">({counts.service})</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name & SKU</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Type</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Selling Price</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Avail. Stock</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr> :
                                filteredItems.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package size={36} className="text-slate-200" />
                                            <p className="text-sm font-medium text-slate-500">No items found</p>
                                            <p className="text-xs text-slate-400">Try adjusting your search or filter.</p>
                                        </div>
                                    </td></tr>
                                ) :
                                filteredItems.map(item => (
                                    <tr key={item._id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => openModal(item)}>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500 font-mono">SKU: {item.sku || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${item.type === 'Goods'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    : 'bg-violet-50 text-violet-700 border border-violet-100'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">₹{(item.sellingPrice || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm font-bold text-gray-900">{item.stockQuantity ?? item.openingStock ?? 0}</div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold">{item.unit}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-medium space-x-3" onClick={e => e.stopPropagation()}>
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
