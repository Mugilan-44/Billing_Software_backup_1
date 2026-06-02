import { useState } from 'react';
import axios from '../utils/api';
import { X, Save } from 'lucide-react';

export default function QuickItemModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState('Goods');
    const [unit, setUnit] = useState('pcs');
    const [sellingPrice, setSellingPrice] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [taxRate, setTaxRate] = useState(18);

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
                type,
                unit,
                sellingPrice: parsedSellingPrice,
                purchasePrice: Number(purchasePrice) || 0,
                taxType: 'GST',
                taxRate: Number(taxRate) || 0,
                gstPercentage: Number(taxRate) || 0,
                openingStock: 0,
                lowStockAlert: 5,
                description: ''
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
                <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X size={18} />
                </button>
                
                <h3 className="text-lg font-bold tracking-tight mb-2">Create New Item</h3>
                <p className="text-xs text-slate-400 mb-6">Quickly add an item/service to use in this transaction.</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/30">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Item Name *</label>
                        <input
                            type="text"
                            className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Spare Parts, Consultation Fee"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Item Type</label>
                            <select
                                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="Goods">Goods</option>
                                <option value="Service">Service</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Unit</label>
                            <select
                                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Selling Price (₹) *</label>
                            <input
                                type="number"
                                step="0.01"
                                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                value={sellingPrice}
                                onChange={e => setSellingPrice(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Purchase Price (₹)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                                value={purchasePrice}
                                onChange={e => setPurchasePrice(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">GST Tax Rate (%)</label>
                        <select
                            className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            value={taxRate}
                            onChange={e => setTaxRate(Number(e.target.value))}
                        >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary px-6 flex items-center gap-2">
                            <Save size={16} />
                            {loading ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
