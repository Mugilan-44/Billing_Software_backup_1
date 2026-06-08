import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { Archive, Plus, Search, Settings, Filter, ArrowUpRight, ArrowDownRight, AlertTriangle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Stock = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchStockItems();
    }, []);

    const fetchStockItems = async () => {
        try {
            const res = await axios.get('/api/items');
            // Filter to only show Goods
            const goods = res.data.data.filter(item => item.type === 'Goods');
            setItems(goods);
        } catch (error) {
            console.error('Error fetching stock items:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totals = filteredItems.reduce((acc, item) => {
        acc.totalValue += (item.purchasePrice || 0) * (item.stockQuantity || 0);
        if (item.stockQuantity <= item.lowStockAlert) acc.lowCount++;
        return acc;
    }, { totalValue: 0, lowCount: 0 });

    return (
        <div className="max-w-7xl mx-auto mb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-inner">
                        <Archive size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Stock Adjustments</h1>
                        <p className="text-sm text-slate-500 font-medium tracking-tight">Real-time inventory levels for active goods</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find items or SKU..."
                            className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                        <Filter size={20} />
                    </button>
                    <button
                        onClick={() => navigate('/items/new')}
                        className="btn-primary bg-purple-600 hover:bg-purple-700 px-6 flex items-center gap-2 shadow-lg shadow-purple-500/20 border-purple-600"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Add New Item
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Plus size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Items</p>
                        <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{filteredItems.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Low Stock Items</p>
                        <h3 className="text-2xl font-black text-red-600 leading-none mt-1">{totals.lowCount}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Download size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Stock Value</p>
                        <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">₹{totals.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto overflow-visible">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                                <th className="px-6 py-5">Item Details</th>
                                <th className="px-6 py-5">SKU Code</th>
                                <th className="px-6 py-5 text-center">Base Unit</th>
                                <th className="px-6 py-5 text-right">Low Alert at</th>
                                <th className="px-6 py-5 text-right pr-10 border-l border-slate-50">Stock Available</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-sans">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waking up database...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center shadow-inner">
                                                <Archive size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Empty Inventory</h3>
                                                <p className="text-sm text-slate-500 max-w-xs mx-auto">No trackable goods found. Add products to start monitoring stock levels.</p>
                                            </div>
                                            <button onClick={() => navigate('/items/new')} className="btn-primary bg-purple-600 hover:bg-purple-700 px-6 py-2 text-xs border-purple-600 shadow-md">Add First Product</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const isLowStock = (item.stockQuantity || 0) <= (item.lowStockAlert || 5);
                                    return (
                                        <tr
                                            key={item._id}
                                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                            onClick={() => navigate(`/items/${item._id}/edit`)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-black text-slate-900 group-hover:text-purple-600 transition-colors">{item.name}</div>
                                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter max-w-[200px] truncate mt-0.5">{item.description || 'No Description Added'}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-600 font-bold tracking-tight">
                                                    {item.sku || 'UNSPECIFIED'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-[10px] font-black uppercase text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg bg-white shadow-xs">{item.unit}</span>
                                            </td>
                                            <td className="px-6 py-5 text-right font-bold text-sm text-slate-400">
                                                {item.lowStockAlert}
                                            </td>
                                            <td className="px-6 py-5 text-right pr-10 border-l border-slate-50">
                                                <div className={`text-lg font-black tracking-tight ${isLowStock ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {(item.stockQuantity || 0).toLocaleString()}
                                                </div>
                                                {isLowStock && (
                                                    <div className="flex items-center justify-end gap-1 mt-0.5">
                                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                                        <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">Low Stock Alert</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Stock;
