import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package } from 'lucide-react';

const InputRow = ({ label, required, children }) => (
    <div className="flex items-start py-3 border-b border-slate-100 last:border-0">
        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex-1">{children}</div>
    </div>
);

const ItemForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        name: '',
        sku: '',
        type: 'Goods',
        unit: 'pcs',
        sellingPrice: 0,
        purchasePrice: 0,
        gstPercentage: 0,
        taxType: 'GST',
        taxRate: 0,
        hsnSacCode: '',
        availableStock: 1,
        lowStockAlert: 5,
        description: ''
    });

    const TAX_PRESETS = {
        GST: [0, 5, 12, 18, 28],
        VAT: [0, 5, 15],
        'Sales Tax': [0, 4, 5, 8],
        Custom: []
    };

    useEffect(() => {
        if (isEdit) {
            fetchItem();
        }
    }, [id]);

    const fetchItem = async () => {
        try {
            const res = await axios.get(`/api/items/${id}`);
            const item = res.data.data;
            setForm({
                name: item.name || '',
                sku: item.sku || '',
                unit: item.unit || 'pcs',
                sellingPrice: item.sellingPrice || 0,
                purchasePrice: item.purchasePrice || 0,
                gstPercentage: item.gstPercentage || item.gstPercent || 0,
                taxType: item.taxType || 'GST',
                taxRate: item.taxRate !== undefined ? item.taxRate : (item.gstPercentage || item.gstPercent || 0),
                availableStock: item.availableStock || item.stockQuantity || item.openingStock || 0,
                description: item.description || ''
            });
        } catch (err) {
            console.error('Error fetching item', err);
            setError('Failed to load item details.');
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return setError('Item Name is required');
        if (!form.sellingPrice || Number(form.sellingPrice) <= 0) {
            setError('Selling Price (Item Rate) is required and must be greater than 0');
            return;
        }
        if (form.availableStock === undefined || form.availableStock === null || Number(form.availableStock) < 1) {
            setError('Available Stock is required and must be at least 1');
            return;
        }

        setLoading(true);
        setError('');

        // Map availableStock back to openingStock for the API
        const payload = {
            ...form,
            openingStock: form.availableStock,
            taxType: form.taxType || 'GST',
            taxRate: Number(form.taxRate || 0),
            gstPercentage: Number(form.taxRate || 0)
        };

        try {
            if (isEdit) {
                await axios.put(`/api/items/${id}`, payload);
                setSuccess('Item updated successfully!');
            } else {
                await axios.post('/api/items', payload);
                setSuccess('Item created successfully!');
            }
            setTimeout(() => navigate('/items'), 800);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save item');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/items')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            {isEdit ? 'Edit Item' : 'New Item'}
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {isEdit ? 'Update product or service information' : 'Create a new product or service'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/items')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={loading}
                        className="btn-primary px-6 flex items-center gap-2">
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Item'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="px-6 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium">
                    {error}
                </div>
            )}
            {success && (
                <div className="px-6 py-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm font-medium">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white">
                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100">
                    <h3 className="text-base font-semibold text-slate-800 pb-4 flex items-center gap-2">
                        <Package size={18} className="text-slate-400" /> General Information
                    </h3>

                    <InputRow label="Item Name" required>
                        <input
                            type="text"
                            className="input-field max-w-xl"
                            value={form.name}
                            onChange={e => handleChange('name', e.target.value)}
                            placeholder="e.g. Spare Parts, Consultation File"
                            required
                        />
                    </InputRow>

                    <InputRow label="Item Code (SKU)">
                        {isEdit ? (
                            <input
                                type="text"
                                className="input-field max-w-xs font-mono"
                                value={form.sku}
                                onChange={e => handleChange('sku', e.target.value)}
                                placeholder="ITEM-0001"
                            />
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="input-field max-w-xs font-mono bg-slate-50 text-slate-400 cursor-not-allowed border-dashed border-slate-300">
                                    Auto-generated by system
                                </div>
                                <span className="text-xs text-slate-400 italic">e.g. ITEM-0001</span>
                            </div>
                        )}
                        {isEdit && form.sku && <p className="text-xs text-slate-400 mt-1">Current code: <span className="font-mono font-bold text-slate-700">{form.sku}</span></p>}
                    </InputRow>

                    <InputRow label="Item Type" required>
                        <div className="flex gap-4">
                            {['Goods', 'Service'].map(t => (
                                <label key={t} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${form.type === t ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm font-bold' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="itemType"
                                        className="hidden"
                                        checked={form.type === t}
                                        onChange={() => handleChange('type', t)}
                                    />
                                    {t}
                                </label>
                            ))}
                        </div>
                    </InputRow>

                    <InputRow label="Unit">
                        <select
                            className="input-field max-w-xs"
                            value={form.unit}
                            onChange={e => handleChange('unit', e.target.value)}
                        >
                            <option value="pcs">Pieces (pcs)</option>
                            <option value="kg">Kilograms (kg)</option>
                            <option value="mtr">Meters (mtr)</option>
                            <option value="box">Box</option>
                            <option value="nos">Numbers (nos)</option>
                            <option value="hrs">Hours (hrs)</option>
                        </select>
                    </InputRow>

                    <InputRow label="HSN / SAC Code">
                        <input
                            type="text"
                            className="input-field max-w-xs uppercase"
                            value={form.hsnSacCode}
                            onChange={e => handleChange('hsnSacCode', e.target.value)}
                            placeholder="HSN (Goods) / SAC (Services)"
                        />
                    </InputRow>

                    <h3 className="text-base font-semibold text-slate-800 pb-4 pt-8">Pricing & Inventory</h3>

                    <InputRow label="Selling Price (₹)" required>
                        <div className="relative max-w-xs">
                            <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                            <input
                                type="number"
                                step="0.01"
                                className="input-field pl-8"
                                value={form.sellingPrice}
                                onChange={e => handleChange('sellingPrice', Number(e.target.value))}
                                required
                            />
                        </div>
                    </InputRow>

                    <InputRow label="Purchase Price (₹)">
                        <div className="relative max-w-xs">
                            <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                            <input
                                type="number"
                                step="0.01"
                                className="input-field pl-8"
                                value={form.purchasePrice}
                                onChange={e => handleChange('purchasePrice', Number(e.target.value))}
                            />
                        </div>
                    </InputRow>



                    <InputRow label="Available Stock">
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                className="input-field max-w-[140px] font-bold text-slate-900"
                                value={form.availableStock}
                                onChange={e => handleChange('availableStock', Number(e.target.value))}
                                placeholder="0"
                            />
                            <span className="text-xs text-slate-400 uppercase font-bold tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{form.unit}</span>
                        </div>
                    </InputRow>

                    <InputRow label="Low Stock Alert" helper="System will notify you when stock falls below this level">
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                className="input-field max-w-[140px] text-red-600 font-bold"
                                value={form.lowStockAlert}
                                onChange={e => handleChange('lowStockAlert', Number(e.target.value))}
                                placeholder="5"
                            />
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Units Minimum</span>
                        </div>
                    </InputRow>

                    <InputRow label="Description">
                        <textarea
                            className="input-field max-w-xl h-24 resize-none"
                            value={form.description}
                            onChange={e => handleChange('description', e.target.value)}
                            placeholder="Add item details, specifications, etc."
                        />
                    </InputRow>
                </div>

                <div className="bg-slate-50/50 border-t border-slate-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            <span className="text-red-500">*</span> Required fields for invoicing
                        </span>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => navigate('/items')} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading}
                                className="btn-primary px-10 shadow-sm">
                                {loading ? 'Saving...' : 'Save Item'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ItemForm;
