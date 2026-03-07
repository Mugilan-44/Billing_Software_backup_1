import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, ShoppingCart, Save, Info, User, Calendar } from 'lucide-react';
import SearchableDropdown from '../components/SearchableDropdown';

const InputRow = ({ label, required, children, helper }) => (
    <div className="flex items-start py-3 border-b border-slate-100 last:border-0">
        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex-1">
            {children}
            {helper && <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">{helper}</p>}
        </div>
    </div>
);

const SalesOrderForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const quoteId = searchParams.get('quoteId');

    const [customers, setCustomers] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [customerId, setCustomerId] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [discount, setDiscount] = useState(0);
    const [items, setItems] = useState([]);

    const [totals, setTotals] = useState({ subTotal: 0, taxTotal: 0, grandTotal: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, itemRes] = await Promise.all([
                    axios.get('/api/customers'),
                    axios.get('/api/items')
                ]);
                const cList = custRes.data.data;
                const iList = itemRes.data.data;
                setCustomers(cList);
                setCatalogItems(iList);

                if (quoteId) {
                    const quoteRes = await axios.get(`/api/quotations/${quoteId}`);
                    const qt = quoteRes.data.data;
                    if (qt.customerId) setCustomerId(qt.customerId._id || qt.customerId);
                    if (qt.items) {
                        setItems(qt.items.map(i => ({
                            itemId: i.itemId, name: i.name, quantity: i.quantity, rate: i.rate, gstPercentage: i.gstPercentage
                        })));
                    }
                    if (qt.discount) setDiscount(qt.discount);
                    if (qt.notes) setNotes(qt.notes);
                }
            } catch (err) {
                console.error('Error fetching data for sales order', err);
            }
        };
        fetchData();

        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setExpectedDeliveryDate(defaultDate.toISOString().split('T')[0]);
    }, [quoteId]);

    useEffect(() => {
        let sub = 0;
        let tax = 0;
        items.forEach(i => {
            const amount = i.quantity * i.rate;
            const t = amount * (i.gstPercentage / 100);
            sub += amount;
            tax += t;
        });
        setTotals({
            subTotal: sub,
            taxTotal: tax,
            grandTotal: Math.round(sub + tax - Number(discount)),
        });
    }, [items, discount]);

    const handleAddItem = () => {
        if (catalogItems.length === 0) return;
        const defaultItem = catalogItems[0];
        setItems([...items, {
            itemId: defaultItem._id, name: defaultItem.name, quantity: 1, rate: defaultItem.sellingPrice, gstPercentage: defaultItem.gstPercentage
        }]);
    };

    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        if (field === 'itemId') {
            const dbItem = catalogItems.find(c => c._id === value);
            if (dbItem) {
                newItems[index] = { ...newItems[index], itemId: dbItem._id, name: dbItem.name, rate: dbItem.sellingPrice, gstPercentage: dbItem.gstPercentage };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: Number(value) || value };
        }
        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customerId || items.length === 0) {
            setError('Please select a customer and add at least one item');
            return;
        }
        setLoading(true);
        setError('');

        try {
            await axios.post('/api/sales-orders', {
                customerId, expectedDeliveryDate, items, discount: Number(discount), notes, quotationId: quoteId || undefined
            });
            navigate('/orders');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create sales order');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/orders')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Create Sales Order</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Order Processing</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/orders')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" onClick={handleSubmit} disabled={loading}
                        className="btn-primary px-6 flex items-center gap-2">
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Sales Order'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-6 mt-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200 text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white">
                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-800 pb-4 flex items-center gap-2">
                        <User size={18} className="text-slate-400" /> Customer Information
                    </h3>

                    <InputRow label="Customer Name" required>
                        <SearchableDropdown
                            options={customers.map(c => c.companyName)}
                            value={customers.find(c => c._id === customerId)?.companyName || ''}
                            onChange={(name) => {
                                const cust = customers.find(c => c.companyName === name);
                                if (cust) setCustomerId(cust._id);
                            }}
                            placeholder="Select or add a customer"
                            onAddNew={() => navigate('/customers/new')}
                            addNewLabel="New Customer"
                        />
                        {customerId && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 flex items-start gap-2 max-w-md">
                                <Info size={14} className="mt-0.5 text-blue-400 shrink-0" />
                                <div>
                                    <p className="font-bold text-slate-700 mb-0.5">Billing To:</p>
                                    {customers.find(c => c._id === customerId)?.billingAddress?.street || 'No address provided'}
                                </div>
                            </div>
                        )}
                    </InputRow>

                    <InputRow label="Expected Delivery" required helper="Date by which order should be fulfilled">
                        <div className="flex items-center gap-2 max-w-[200px]">
                            <Calendar size={16} className="text-slate-400" />
                            <input type="date" className="input-field" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} required />
                        </div>
                    </InputRow>
                </div>

                {/* Item Details Table */}
                <div className="border border-slate-200 rounded-lg bg-white mt-8 mx-8">
                    <div className="bg-slate-50/50 text-slate-800 font-bold text-xs px-4 py-3 border-b border-slate-200 uppercase tracking-wider">
                        Ordered Items
                    </div>

                    <div className="overflow-visible">
                        <table className="w-full text-left table-fixed">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                    <th className="px-4 py-3 w-6/12 tracking-wider">Item Details</th>
                                    <th className="px-4 py-3 w-20 border-l border-slate-50 tracking-wider text-right">Qty</th>
                                    <th className="px-4 py-3 w-32 border-l border-slate-50 tracking-wider text-right">Rate</th>
                                    <th className="px-4 py-3 w-24 border-l border-slate-50 tracking-wider text-right">Tax</th>
                                    <th className="px-4 py-3 w-32 border-l border-slate-50 tracking-wider text-right pr-6">Amount</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/50 align-top">
                                        <td className="p-3">
                                            <SearchableDropdown
                                                className="w-full"
                                                options={catalogItems.map(c => c.name)}
                                                value={catalogItems.find(c => c._id === item.itemId)?.name || ''}
                                                onChange={(name) => {
                                                    const selected = catalogItems.find(c => c.name === name);
                                                    if (selected) handleItemChange(idx, 'itemId', selected._id);
                                                }}
                                                placeholder="Select Item"
                                                onAddNew={() => navigate('/items/new')}
                                                addNewLabel="New Item"
                                            />
                                        </td>
                                        <td className="p-3 border-l border-slate-50/50">
                                            <input type="number" min="1" className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} />
                                        </td>
                                        <td className="p-3 border-l border-slate-50/50">
                                            <div className="relative">
                                                <span className="absolute left-0 top-1 text-slate-400 text-xs">₹</span>
                                                <input type="number" min="0" step="0.01" className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent" value={item.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} />
                                            </div>
                                        </td>
                                        <td className="p-3 border-l border-slate-50/50 text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.gstPercentage}%</span>
                                        </td>
                                        <td className="p-3 text-right align-middle pr-6 border-l border-slate-50/50">
                                            <span className="text-sm font-bold text-slate-700">₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}</span>
                                        </td>
                                        <td className="p-3 align-middle text-center">
                                            <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50/30 border-t border-slate-100 px-6 py-4">
                        <button type="button" onClick={handleAddItem} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">
                            <Plus size={14} strokeWidth={3} /> Add Line Item
                        </button>
                    </div>
                </div>

                <div className="px-8 py-10 bg-slate-50/30 border-t border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Notes / Instructions</label>
                            <textarea
                                className="input-field h-32 resize-none bg-white p-3 border-slate-200"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Order terms, specific branding requirements, or delivery instructions..."
                            />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Sub Total</span>
                                    <span className="text-slate-900 font-bold">₹{totals.subTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Discount (₹)</span>
                                    <input
                                        type="number"
                                        className="w-24 text-right px-2 py-1 border border-slate-200 rounded text-sm font-bold focus:ring-1 focus:ring-blue-400"
                                        value={discount}
                                        onChange={e => setDiscount(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">GST Total</span>
                                    <span className="text-slate-900 font-bold">₹{totals.taxTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm opacity-50">
                                    <span className="text-slate-400 italic">Round Off</span>
                                    <span className="text-slate-600">₹{(totals.grandTotal - (totals.subTotal + totals.taxTotal - Number(discount))).toFixed(2)}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-slate-900 font-black uppercase tracking-wider text-xs">Grand Total</span>
                                    <span className="text-blue-600 font-black text-2xl">₹{totals.grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-12 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => navigate('/orders')} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary px-10 shadow-lg shadow-blue-500/10">
                            {loading ? 'Saving...' : 'Save Sales Order'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SalesOrderForm;
