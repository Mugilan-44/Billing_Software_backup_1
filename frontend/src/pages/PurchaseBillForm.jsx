import { useState, useEffect } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Package, Save, Info, User, Calendar } from 'lucide-react';
import SearchableDropdown from '../components/SearchableDropdown';
import QuickVendorModal from '../components/QuickVendorModal';
import QuickItemModal from '../components/QuickItemModal';

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

const PurchaseBillForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [vendors, setVendors] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [activeItemRowIdx, setActiveItemRowIdx] = useState(null);

    const handleVendorCreated = (newVendor) => {
        setVendors(prev => [...prev, newVendor]);
        setVendorId(newVendor._id);
    };

    const handleItemCreated = (newItem) => {
        setCatalogItems(prev => [...prev, newItem]);
        if (activeItemRowIdx !== null) {
            handleItemChange(activeItemRowIdx, 'itemId', newItem._id);
        }
    };

    const [vendorId, setVendorId] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [includeTerms, setIncludeTerms] = useState(true);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [includeBankDetails, setIncludeBankDetails] = useState(true);
    const [includeUpiQr, setIncludeUpiQr] = useState(true);
    const [discount, setDiscount] = useState(0);

    const [totals, setTotals] = useState({ subTotal: 0, taxTotal: 0, grandTotal: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [venRes, itemRes] = await Promise.all([
                    axios.get('/api/vendors'),
                    axios.get('/api/items')
                ]);
                setVendors(venRes.data.data);
                setCatalogItems(itemRes.data.data);

                if (isEdit) {
                    const billRes = await axios.get(`/api/purchase-bills/${id}`);
                    const data = billRes.data.data;
                    setVendorId(data.vendorId?._id || data.vendorId || '');
                    setBillDate(data.date?.split('T')[0] || data.billDate?.split('T')[0] || '');
                    setDueDate(data.dueDate?.split('T')[0] || '');
                    setNotes(data.notes || '');
                    setIncludeTerms(data.includeTerms !== false);
                    setIncludeSignature(data.includeSignature || false);
                    setIncludeBankDetails(data.includeBankDetails !== false);
                    setIncludeUpiQr(data.includeUpiQr !== false);
                    setDiscount(data.discount || 0);
                    const srcItems = data.lineItems?.length ? data.lineItems : data.items || [];
                    if (srcItems.length > 0) {
                        setItems(srcItems.map(i => ({
                            itemId: i.itemId?._id || i.itemId || '',
                            name: i.name || '',
                            quantity: i.quantity || 1,
                            rate: i.rate || 0,
                            gstPercentage: i.gstPercentage || i.gstPercent || 0
                        })));
                    }
                }
            } catch (err) {
                console.error('Error fetching data for purchase bill', err);
            }
        };
        fetchData();
    }, [id]);

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
            itemId: defaultItem._id,
            name: defaultItem.name,
            quantity: 1,
            rate: defaultItem.purchasePrice || 0,
            gstPercentage: defaultItem.gstPercentage
        }]);
    };

    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        if (field === 'itemId') {
            const dbItem = catalogItems.find(c => c._id === value);
            if (dbItem) {
                newItems[index] = { ...newItems[index], itemId: dbItem._id, name: dbItem.name, rate: dbItem.purchasePrice || 0, gstPercentage: dbItem.gstPercentage };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: Number(value) || value };
        }
        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!vendorId || items.length === 0) {
            setError('Please select a vendor and add at least one item');
            return;
        }
        setLoading(true);
        setError('');

        const payload = {
            vendorId,
            billDate,
            date: billDate,
            dueDate: dueDate || undefined,
            items,
            lineItems: items.map(i => ({
                itemId: i.itemId,
                name: i.name,
                quantity: i.quantity,
                rate: i.rate,
                gstPercent: i.gstPercentage
            })),
            discount: Number(discount),
            notes,
            includeTerms,
            includeSignature,
            includeBankDetails,
            includeUpiQr
        };

        try {
            if (isEdit) {
                await axios.put(`/api/purchase-bills/${id}`, payload);
            } else {
                await axios.post('/api/purchase-bills', payload);
            }
            navigate('/purchase-bills');
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} purchase bill`);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/purchase-bills')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Purchase Bill' : 'Record Purchase Bill'}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inward Stock & Expenses</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/purchase-bills')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" onClick={handleSubmit} disabled={loading}
                        className="btn-primary px-6 flex items-center gap-2">
                        <Save size={18} />
                        {loading ? 'Saving...' : (isEdit ? 'Update Stock Bill' : 'Save & Update Stock')}
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
                        <User size={18} className="text-slate-400" /> Vendor Information
                    </h3>

                    <InputRow label="Vendor Name" required>
                        <SearchableDropdown
                            options={vendors.map(v => v.companyName)}
                            value={vendors.find(v => v._id === vendorId)?.companyName || ''}
                            onChange={(name) => {
                                const ven = vendors.find(v => v.companyName === name);
                                if (ven) setVendorId(ven._id);
                            }}
                            placeholder="Select or add a vendor"
                            onAddNew={() => setShowVendorModal(true)}
                            addNewLabel="New Vendor"
                        />
                        {vendorId && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 flex items-start gap-2 max-w-md">
                                <Info size={14} className="mt-0.5 text-blue-400 shrink-0" />
                                <div>
                                    <p className="font-bold text-slate-700 mb-0.5">Vendor Detail:</p>
                                    {vendors.find(v => v._id === vendorId)?.contactPerson || 'N/A'} |
                                    GST: {vendors.find(v => v._id === vendorId)?.gstNumber || 'N/A'}
                                </div>
                            </div>
                        )}
                    </InputRow>

                    <InputRow label="Bill Date" required helper="The date mentioned on the vendor's invoice">
                        <div className="flex items-center gap-2 max-w-[200px]">
                            <Calendar size={16} className="text-slate-400" />
                            <input type="date" className="input-field" value={billDate} onChange={e => setBillDate(e.target.value)} required />
                        </div>
                    </InputRow>

                    <InputRow label="Due Date" helper="Date by which payment should be made">
                        <div className="flex items-center gap-2 max-w-[200px]">
                            <Calendar size={16} className="text-slate-400" />
                            <input type="date" className="input-field" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </InputRow>
                </div>

                {/* Purchased Items Table */}
                <div className="border border-slate-200 rounded-lg bg-white mt-8 mx-8">
                    <div className="bg-slate-50/50 text-slate-800 font-bold text-xs px-4 py-3 border-b border-slate-200 uppercase tracking-wider">
                        Purchased Items (Inventory Inward)
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
                                                onAddNew={() => {
                                                    setActiveItemRowIdx(idx);
                                                    setShowItemModal(true);
                                                }}
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Internal Notes</label>
                            <textarea
                                className="input-field h-32 resize-none bg-white p-3 border-slate-200"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Batch numbers, supplier references, or delivery instructions..."
                            />
                            <div className="flex flex-col gap-3 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={includeTerms}
                                        onChange={(e) => setIncludeTerms(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Include Terms & Conditions on Bill</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={includeSignature}
                                        onChange={(e) => setIncludeSignature(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Include Digital/Authorized Signature</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={includeBankDetails}
                                        onChange={(e) => setIncludeBankDetails(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Include Bank Details</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={includeUpiQr}
                                        onChange={(e) => setIncludeUpiQr(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Include UPI and QR Code</span>
                                </label>
                            </div>
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
                                    <span className="text-slate-500 font-medium">Input GST Total</span>
                                    <span className="text-green-600 font-bold">₹{totals.taxTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm opacity-50">
                                    <span className="text-slate-400 italic">Round Off</span>
                                    <span className="text-slate-600">₹{(totals.grandTotal - (totals.subTotal + totals.taxTotal - Number(discount))).toFixed(2)}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-slate-900 font-black uppercase tracking-wider text-xs">Total Bill Amount</span>
                                    <span className="text-blue-600 font-black text-2xl">₹{totals.grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-12 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => navigate('/purchase-bills')} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary px-10 shadow-lg shadow-blue-500/10">
                            {loading ? 'Saving...' : (isEdit ? 'Update Stock Bill' : 'Save & Update Stock')}
                        </button>
                    </div>
                </div>
            </form>

            <QuickVendorModal
                isOpen={showVendorModal}
                onClose={() => setShowVendorModal(false)}
                onSuccess={handleVendorCreated}
            />

            <QuickItemModal
                isOpen={showItemModal}
                onClose={() => setShowItemModal(false)}
                onSuccess={handleItemCreated}
            />
        </div>
    );
};

export default PurchaseBillForm;
