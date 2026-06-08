import { useState, useEffect } from 'react';

const BulkItemModal = ({ isOpen, onClose, catalogItems, onAddSelected }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState({}); // itemId: { quantity: number, checked: boolean }

    useEffect(() => {
        if (isOpen) {
            setSelectedItems({});
            setSearchTerm('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredItems = catalogItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleToggleCheck = (itemId) => {
        setSelectedItems(prev => {
            const current = prev[itemId] || { quantity: 1, checked: false };
            return {
                ...prev,
                [itemId]: {
                    ...current,
                    checked: !current.checked
                }
            };
        });
    };

    const handleQtyChange = (itemId, qty) => {
        setSelectedItems(prev => {
            const current = prev[itemId] || { quantity: 1, checked: false };
            return {
                ...prev,
                [itemId]: {
                    ...current,
                    quantity: Math.max(1, Number(qty) || 1)
                }
            };
        });
    };

    const handleAdd = () => {
        const selected = [];
        Object.entries(selectedItems).forEach(([itemId, config]) => {
            if (config.checked) {
                const item = catalogItems.find(c => c._id === itemId);
                if (item) {
                    selected.push({
                        itemId: item._id,
                        description: item.description || '',
                        quantity: config.quantity,
                        rate: item.sellingPrice || 0,
                        discountType: '%',
                        discount: 0,
                        taxGst: item.gstPercentage || 0
                    });
                }
            }
        });
        onAddSelected(selected);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100 overflow-hidden transform transition-all scale-100 duration-300 flex flex-col max-h-[80vh] font-sans">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Add Items in Bulk</h3>
                        <p className="text-slate-550 text-xs mt-0.5">Select multiple items and specify quantities</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-100 rounded-full transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <input
                        type="text"
                        placeholder="Search catalog items..."
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar">
                    {filteredItems.length === 0 ? (
                        <div className="text-center text-slate-400 py-6 text-sm">No items found.</div>
                    ) : (
                        filteredItems.map(item => {
                            const isChecked = selectedItems[item._id]?.checked || false;
                            const qty = selectedItems[item._id]?.quantity || 1;
                            return (
                                <div 
                                    key={item._id} 
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${isChecked ? 'bg-blue-50/20 border-blue-200' : 'border-slate-100 hover:border-slate-200 bg-slate-50/20'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                            checked={isChecked}
                                            onChange={() => handleToggleCheck(item._id)}
                                        />
                                        <div>
                                            <p className="font-semibold text-sm text-slate-800">{item.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Rate: ₹{item.sellingPrice?.toFixed(2)} | Stock: {item.stock || 0}</p>
                                        </div>
                                    </div>
                                    {isChecked && (
                                        <div className="flex items-center gap-2 animate-in fade-in duration-100">
                                            <span className="text-xs text-slate-500 font-medium">Qty:</span>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-16 border rounded-md px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                value={qty}
                                                onChange={e => handleQtyChange(item._id, e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2.5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-650 font-medium text-xs hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={!Object.values(selectedItems).some(c => c.checked)}
                        className="px-4 py-2 text-white bg-blue-600 rounded-lg font-medium text-xs shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Add Selected
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkItemModal;
