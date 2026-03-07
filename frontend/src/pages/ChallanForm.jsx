import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Trash2, ArrowLeft, Save, Info, User, Navigation } from 'lucide-react';
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

const ChallanForm = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [customerId, setCustomerId] = useState('');
    const [transportDetails, setTransportDetails] = useState({ vehicleNumber: '', driverName: '', route: '' });
    const [items, setItems] = useState([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, itemRes] = await Promise.all([
                    axios.get('/api/customers'),
                    axios.get('/api/items')
                ]);
                setCustomers(custRes.data.data);
                setCatalogItems(itemRes.data.data);
            } catch (err) {
                console.error('Error fetching data for challan', err);
            }
        };
        fetchData();
    }, []);

    const handleAddItem = () => {
        if (catalogItems.length === 0) return;
        const defaultItem = catalogItems[0];
        setItems([
            ...items,
            {
                itemId: defaultItem._id,
                name: defaultItem.name,
                quantity: 1,
                rate: defaultItem.sellingPrice,
                amount: defaultItem.sellingPrice
            }
        ]);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];

        if (field === 'itemId') {
            const dbItem = catalogItems.find(c => c._id === value);
            if (dbItem) {
                newItems[index] = {
                    ...newItems[index],
                    itemId: dbItem._id,
                    name: dbItem.name,
                    rate: dbItem.sellingPrice,
                    amount: Number(newItems[index].quantity) * dbItem.sellingPrice
                };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: Number(value) || value };
            if (field === 'quantity' || field === 'rate') {
                newItems[index].amount = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].rate) || 0);
            }
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
            const payload = {
                customerId,
                transportDetails,
                items,
                notes
            };

            await axios.post('/api/challans', payload);
            navigate('/challans');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create challan');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/challans')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">New Delivery Challan</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Transport & Dispatch</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/challans')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={loading}
                        className="btn-primary px-6 flex items-center gap-2">
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Challan'}
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
                                    <p className="font-bold text-slate-700 mb-0.5">Shipping Address:</p>
                                    {customers.find(c => c._id === customerId)?.billingAddress?.street || 'No address provided'},
                                    {customers.find(c => c._id === customerId)?.billingAddress?.city || ''}
                                </div>
                            </div>
                        )}
                    </InputRow>
                </div>

                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100 bg-amber-50/20 border-b border-slate-100 transition-all">
                    <h3 className="text-base font-semibold text-amber-900 pb-4 flex items-center gap-2">
                        <Truck size={18} className="text-amber-500" /> Dispatch & Transport
                    </h3>

                    <InputRow label="Vehicle Number" helper="e.g. KA-01-AB-1234">
                        <input
                            type="text"
                            className="input-field max-w-sm"
                            value={transportDetails.vehicleNumber}
                            onChange={e => setTransportDetails({ ...transportDetails, vehicleNumber: e.target.value })}
                            placeholder="Enter Vehicle Number"
                        />
                    </InputRow>

                    <div className="flex items-start py-3">
                        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">Driver & Route</label>
                        <div className="flex flex-1 gap-4 max-w-2xl">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    className="input-field"
                                    value={transportDetails.driverName}
                                    placeholder="Driver Name"
                                    onChange={e => setTransportDetails({ ...transportDetails, driverName: e.target.value })}
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    className="input-field"
                                    value={transportDetails.route}
                                    placeholder="e.g. Bangalore to Chennai"
                                    onChange={e => setTransportDetails({ ...transportDetails, route: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Goods Dispatched Table */}
                <div className="border border-slate-200 rounded-lg bg-white mt-8 mx-8">
                    <div className="bg-slate-50/50 text-slate-800 font-bold text-xs px-4 py-3 border-b border-slate-200 uppercase tracking-wider">
                        Goods Dispatched
                    </div>

                    <div className="overflow-visible">
                        <table className="w-full text-left table-fixed">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                    <th className="px-4 py-3 w-8/12 tracking-wider">Item Details</th>
                                    <th className="px-4 py-3 w-32 border-l border-slate-50 tracking-wider text-right pr-8">Quantity</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="p-12 text-center text-slate-400 font-medium italic text-sm">
                                            No goods added to this challan yet.
                                        </td>
                                    </tr>
                                ) : items.map((item, idx) => (
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
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent pr-4"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                            />
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
                            <Plus size={14} strokeWidth={3} /> Add Item Row
                        </button>
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-50/30 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 max-w-xl">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Delivery Notes / Terms</label>
                            <textarea
                                className="input-field h-24 resize-none bg-white p-3"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Please sign upon receipt."
                            />
                        </div>
                        <div className="flex gap-3 ml-8">
                            <button type="button" onClick={() => navigate('/challans')} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="btn-primary px-10 shadow-lg shadow-blue-500/10">
                                {loading ? 'Saving...' : 'Save Challan'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ChallanForm;
