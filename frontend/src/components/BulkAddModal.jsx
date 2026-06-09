import { useState, useMemo } from 'react';
import { X, Search, Check, Package, Layers } from 'lucide-react';

const BulkAddModal = ({ isOpen, onClose, catalogItems, onAddSelected }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [typeFilter, setTypeFilter] = useState('All');

    if (!isOpen) return null;

    const filteredItems = catalogItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
            (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
        const matchesType = typeFilter === 'All' || item.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const toggleItem = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === filteredItems.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filteredItems.map(i => i._id)));
        }
    };

    const handleAdd = () => {
        const selectedItems = catalogItems.filter(i => selected.has(i._id));
        onAddSelected(selectedItems);
        setSelected(new Set());
        setSearch('');
        onClose();
    };

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div className="modal-content bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                                <Layers size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Add Items in Bulk</h3>
                                <p className="text-xs text-slate-500 font-medium">Select items to add as line items</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search items..."
                                className="input-field pl-10 !bg-white"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="segment-toggle">
                            {['All', 'Goods', 'Service'].map(t => (
                                <button
                                    key={t}
                                    className={`segment-toggle-btn ${typeFilter === t ? 'active' : ''}`}
                                    onClick={() => setTypeFilter(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Item List */}
                    <div className="flex-1 overflow-y-auto px-6 py-3">
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Package size={40} className="text-slate-200 mb-3" />
                                <p className="text-sm text-slate-500 font-medium">No items found</p>
                            </div>
                        ) : (
                            <>
                                {/* Select All */}
                                <button
                                    onClick={toggleAll}
                                    className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider mb-3 px-1"
                                >
                                    {selected.size === filteredItems.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <div className="space-y-1.5">
                                    {filteredItems.map(item => {
                                        const isSelected = selected.has(item._id);
                                        const stock = item.stockQuantity ?? item.openingStock ?? 0;
                                        return (
                                            <div
                                                key={item._id}
                                                onClick={() => toggleItem(item._id)}
                                                className={`flex items-center gap-4 p-3.5 rounded-xl cursor-pointer transition-all border ${isSelected
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                                                    }`}
                                            >
                                                {/* Checkbox */}
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${isSelected
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'border-2 border-slate-300'
                                                    }`}>
                                                    {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                                                </div>

                                                {/* Item Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-slate-900 truncate">{item.name}</div>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                                                            {item.sku || 'No SKU'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">•</span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.type}</span>
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div className="text-right shrink-0">
                                                    <div className="text-sm font-bold text-slate-900">₹{(item.sellingPrice || 0).toFixed(2)}</div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${stock <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                        Stock: {stock} {item.unit}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">
                            {selected.size} item{selected.size !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="btn-secondary">Cancel</button>
                            <button
                                onClick={handleAdd}
                                disabled={selected.size === 0}
                                className="btn-primary px-6"
                            >
                                Add {selected.size > 0 ? `${selected.size} Items` : 'Selected'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BulkAddModal;
