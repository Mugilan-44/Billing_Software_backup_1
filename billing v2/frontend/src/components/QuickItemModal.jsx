import { useState } from 'react';
import axios from '../utils/api';
import { X, Save } from 'lucide-react';

const TAX_PRESETS = {
    GST: [0, 5, 12, 18, 28],
    VAT: [0, 5, 15],
    'Sales Tax': [0, 4, 5, 8],
    Custom: []
};

export default function QuickItemModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('general');

    // General Fields
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [type, setType] = useState('Goods');
    const [unit, setUnit] = useState('pcs');
    const [hsnSacCode, setHsnSacCode] = useState('');
    const [taxType, setTaxType] = useState('GST');
    const [taxRate, setTaxRate] = useState(18);
    const [description, setDescription] = useState('');

    // Pricing & Inventory
    const [sellingPrice, setSellingPrice] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [availableStock, setAvailableStock] = useState(0);
    const [lowStockAlert, setLowStockAlert] = useState(5);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Item Name is required.');
            return;
        }

        const parsedSellingPrice = Number(sellingPrice);
        if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) {
            setError('Selling Price (Rate) is required and must be greater than 0.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name,
                sku: sku.trim() || undefined, // send blank to let backend generate SKU
                type,
                unit,
                hsnSacCode,
                sellingPrice: parsedSellingPrice,
                purchasePrice: Number(purchasePrice) || 0,
                taxType,
                taxRate: Number(taxRate) || 0,
                gstPercentage: Number(taxRate) || 0,
                openingStock: Number(availableStock) || 0,
                availableStock: Number(availableStock) || 0,
                lowStockAlert: Number(lowStockAlert) || 5,
                description
            };
            const res = await axios.post('/api/items', payload);
            onSuccess(res.data.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create item');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            {/* Backdrop overlay */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out" 
                onClick={onClose} 
            />
            
            {/* Slide-over panel */}
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right text-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Item</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Quickly add an item or service with full specifications.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold border border-red-100 dark:border-red-900/30">
                        {error}
                    </div>
                )}

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        
                        {/* Tabs Navigation */}
                        <div className="border-b border-slate-200 dark:border-slate-700">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 ${activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    onClick={() => setActiveTab('general')}
                                >
                                    General Details
                                </button>
                                <button
                                    type="button"
                                    className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 ${activeTab === 'pricing' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    onClick={() => setActiveTab('pricing')}
                                >
                                    Pricing & Inventory
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="space-y-4">
                            {activeTab === 'general' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Item Name *</label>
                                        <input
                                            type="text"
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="e.g. Spare Parts, Consultation Fee"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Item Code (SKU)</label>
                                            <input
                                                type="text"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none font-mono"
                                                value={sku}
                                                onChange={e => setSku(e.target.value)}
                                                placeholder="Auto-generated if empty"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Item Type</label>
                                            <select
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={type}
                                                onChange={e => setType(e.target.value)}
                                            >
                                                <option value="Goods">Goods</option>
                                                <option value="Service">Service</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Unit</label>
                                            <select
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={unit}
                                                onChange={e => setUnit(e.target.value)}
                                            >
                                                <option value="pcs">Pieces (pcs)</option>
                                                <option value="kg">Kilograms (kg)</option>
                                                <option value="mtr">Meters (mtr)</option>
                                                <option value="box">Box</option>
                                                <option value="nos">Numbers (nos)</option>
                                                <option value="hrs">Hours (hrs)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">HSN / SAC Code</label>
                                            <input
                                                type="text"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none uppercase"
                                                value={hsnSacCode}
                                                onChange={e => setHsnSacCode(e.target.value)}
                                                placeholder="HSN / SAC Code"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Tax System</label>
                                            <select
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={taxType}
                                                onChange={e => {
                                                    const newType = e.target.value;
                                                    setTaxType(newType);
                                                    setTaxRate(TAX_PRESETS[newType]?.[0] || 0);
                                                }}
                                            >
                                                <option value="GST">GST (Goods & Services Tax)</option>
                                                <option value="VAT">VAT (Value Added Tax)</option>
                                                <option value="Sales Tax">Sales Tax</option>
                                                <option value="Custom">Custom Tax System</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Tax Rate (%)</label>
                                            {taxType !== 'Custom' ? (
                                                <select
                                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                    value={taxRate}
                                                    onChange={e => setTaxRate(Number(e.target.value))}
                                                >
                                                    {TAX_PRESETS[taxType]?.map(rate => (
                                                        <option key={rate} value={rate}>{rate}%</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                    value={taxRate}
                                                    onChange={e => setTaxRate(Number(e.target.value))}
                                                    placeholder="0.00%"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                                        <textarea
                                            className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none resize-none h-16"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="Specifications, size, etc."
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pricing' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Selling Price (₹) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none font-bold"
                                                value={sellingPrice}
                                                onChange={e => setSellingPrice(e.target.value)}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Purchase Price (₹)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={purchasePrice}
                                                onChange={e => setPurchasePrice(e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Available Stock</label>
                                            <input
                                                type="number"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                value={availableStock}
                                                onChange={e => setAvailableStock(Number(e.target.value))}
                                                min={0}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Low Stock Alert</label>
                                            <input
                                                type="number"
                                                className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-red-600 font-bold"
                                                value={lowStockAlert}
                                                onChange={e => setLowStockAlert(Number(e.target.value))}
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors">
                            <Save size={14} />
                            {loading ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
