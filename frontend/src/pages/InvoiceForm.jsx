import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Search, Plus, Trash2, Save, Info } from 'lucide-react';
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

const InvoiceForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [customers, setCustomers] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [customerId, setCustomerId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSimplifiedView, setIsSimplifiedView] = useState(true);

    const [items, setItems] = useState([
        { itemId: '', quantity: 1, rate: 0, discountType: '%', discount: 0, taxGst: 0 }
    ]);

    const [notes, setNotes] = useState('Thanks for your business.');
    const [termsAndConditions, setTermsAndConditions] = useState('Enter the terms and conditions of your business to be displayed in your transaction');

    useEffect(() => {
        fetchCustomers();
        fetchCatalogItems();
        if (isEdit) {
            fetchInvoice();
        } else {
            generateNextInvoiceNumber();
        }
    }, [id]);

    const generateNextInvoiceNumber = async () => {
        try {
            const res = await axios.get('/api/invoices');
            const num = (res.data.data.length + 1).toString().padStart(6, '0');
            setInvoiceNumber(`INV-${num}`);
        } catch (err) {
            console.error('Failed to generate invoice number', err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('/api/customers');
            setCustomers(res.data.data);
        } catch (err) { console.error('Failed to load customers'); }
    };

    const fetchCatalogItems = async () => {
        try {
            const res = await axios.get('/api/items');
            setCatalogItems(res.data.data);
        } catch (err) { console.error('Failed to load catalog items'); }
    };

    const fetchInvoice = async () => {
        try {
            const res = await axios.get(`/api/invoices/${id}`);
            const data = res.data.data;
            setCustomerId(data.customerId?._id || data.customerId);
            setInvoiceNumber(data.invoiceNumber || invoiceNumber);
            setDate(data.date?.split('T')[0] || date);
            setDueDate(data.dueDate?.split('T')[0] || dueDate);
            setNotes(data.notes || '');
            setTermsAndConditions(data.termsAndConditions || '');
            if (data.items?.length > 0) {
                setItems(data.items.map(i => ({
                    itemId: i.itemId?._id || i.itemId || '',
                    quantity: i.quantity || 1,
                    rate: i.rate || 0,
                    discountType: '%',
                    discount: 0,
                    taxGst: i.gstPercentage || 0
                })));
            }
        } catch (err) { console.error('Error fetching invoice', err); }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        if (field === 'itemId') {
            const selectedItem = catalogItems.find(c => c._id === value);
            newItems[index] = {
                ...newItems[index],
                itemId: value,
                rate: selectedItem ? selectedItem.sellingPrice : 0,
                taxGst: selectedItem ? selectedItem.gstPercentage : 0
            };
        } else {
            newItems[index] = { ...newItems[index], [field]: field === 'discountType' ? value : Number(value) || value };
        }
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { itemId: '', quantity: 1, rate: 0, discountType: '%', discount: 0, taxGst: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const calculateTotals = () => {
        let subTotal = 0;
        let taxTotal = 0;

        items.forEach(item => {
            const rawAmount = (item.quantity || 0) * (item.rate || 0);
            const discountAmount = item.discountType === '%'
                ? rawAmount * ((item.discount || 0) / 100)
                : (item.discount || 0);
            const itemAmount = rawAmount - discountAmount;
            subTotal += itemAmount;
            taxTotal += itemAmount * ((item.taxGst || 0) / 100);
        });

        const grandTotal = subTotal + taxTotal;

        return { subTotal, taxTotal, grandTotal };
    };

    const totals = calculateTotals();

    const handleSubmit = async (e, actionType) => {
        e.preventDefault();
        if (!customerId) return setError('Please select a customer');

        setLoading(true);
        setError('');

        const payload = {
            customerId,
            invoiceNumber,
            date,
            dueDate,
            notes,
            termsAndConditions,
            status: actionType === 'draft' ? 'Draft' : 'Sent',
            items: items.filter(i => i.itemId).map(i => ({
                itemId: i.itemId,
                quantity: i.quantity,
                rate: i.rate,
                gstPercentage: i.taxGst
            })),
            discount: 0, // Migrated to line items conceptually
            subTotal: totals.subTotal,
            taxTotal: { cgst: totals.taxTotal / 2, sgst: totals.taxTotal / 2, igst: 0, totalTax: totals.taxTotal },
            grandTotal: totals.grandTotal,
            roundOff: 0
        };

        try {
            if (isEdit) {
                await axios.put(`/api/invoices/${id}`, payload);
            } else {
                await axios.post('/api/invoices', payload);
            }
            navigate('/invoices');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save invoice');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/invoices')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            {isEdit ? 'Edit Invoice' : 'New Invoice'}
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold font-mono tracking-widest uppercase">{invoiceNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 mr-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Simplified View</span>
                        <div
                            className={`w-8 h-4 rounded-full flex items-center cursor-pointer transition-colors ${isSimplifiedView ? 'bg-blue-500' : 'bg-slate-200'}`}
                            onClick={() => setIsSimplifiedView(!isSimplifiedView)}
                        >
                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${isSimplifiedView ? 'translate-x-4' : 'translate-x-1'}`}></div>
                        </div>
                    </div>
                    <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="button" onClick={(e) => handleSubmit(e, 'send')} disabled={loading}
                        className="btn-primary px-6 flex items-center gap-2">
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save and Send'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-6 mt-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200 text-sm font-medium">
                    {error}
                </div>
            )}

            <form className="bg-white">
                <div className="px-8 py-6 space-y-0 divide-y divide-slate-100">
                    <h3 className="text-base font-semibold text-slate-800 pb-4 flex items-center gap-2">
                        <Info size={18} className="text-slate-400" /> General Information
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
                    </InputRow>

                    <div className="flex items-start py-3 border-b border-slate-100">
                        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">
                            Invoice Date<span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="flex flex-1 items-center gap-6">
                            <input
                                type="date"
                                className="input-field max-w-[200px]"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                            <div className="flex items-center gap-4 flex-1 max-w-sm">
                                <label className="text-sm font-medium text-slate-700">Payment Terms</label>
                                <select
                                    className="input-field"
                                    value={paymentTerms}
                                    onChange={(e) => setPaymentTerms(e.target.value)}
                                >
                                    <option>Due on Receipt</option>
                                    <option>Net 15</option>
                                    <option>Net 30</option>
                                    <option>Net 45</option>
                                    <option>Net 60</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <InputRow label="Due Date" helper="Date by which payment should be received">
                        <input
                            type="date"
                            className="input-field max-w-[200px]"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </InputRow>
                </div>

                <hr className="my-8 border-gray-200" />

                {/* Item Table Frame */}
                <div className="border border-slate-200 rounded-lg bg-white mt-8 mx-8">
                    <div className="bg-slate-50/50 text-slate-800 font-bold text-xs px-4 py-3 border-b border-slate-200 uppercase tracking-wider">
                        Item Details
                    </div>

                    <div className="overflow-visible"> {/* Fix dropdown clipping by ensuring overflow-visible */}
                        <table className="w-full text-left table-fixed">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                    <th className="px-4 py-3 w-7/12 tracking-wider">Item Details</th>
                                    <th className="px-4 py-3 w-24 border-l border-slate-50 tracking-wider text-right">Quantity</th>
                                    <th className="px-4 py-3 w-32 border-l border-slate-50 tracking-wider text-right">Rate</th>
                                    <th className="px-4 py-3 w-32 border-l border-slate-50 tracking-wider text-right">Discount</th>
                                    <th className="px-4 py-3 w-32 border-l border-slate-50 tracking-wider text-right pr-6">Amount</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, idx) => {
                                    const rawAmount = (item.quantity || 0) * (item.rate || 0);
                                    const discountAmount = item.discountType === '%' ? rawAmount * ((item.discount || 0) / 100) : (item.discount || 0);
                                    const finalAmount = rawAmount - discountAmount;

                                    return (
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
                                                {item.itemId && (
                                                    <div className="text-[10px] font-bold text-slate-400 mt-1.5 px-1 uppercase tracking-tight">
                                                        Tax: {item.taxGst}%
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 border-l border-slate-50/50">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 border-l border-slate-50/50">
                                                <div className="relative">
                                                    <span className="absolute left-0 top-1 text-slate-400 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0" step="0.01"
                                                        className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent"
                                                        value={item.rate}
                                                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-3 border-l border-slate-50/50">
                                                <div className="flex items-center justify-end">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-12 text-right py-1 px-1 text-sm border-0 border-b border-transparent bg-transparent hover:bg-slate-50 focus:ring-0 focus:border-blue-400"
                                                        value={item.discount}
                                                        onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                                                    />
                                                    <select
                                                        className="text-[10px] font-bold text-slate-500 bg-slate-100/50 border-0 rounded px-1 cursor-pointer"
                                                        value={item.discountType}
                                                        onChange={(e) => handleItemChange(idx, 'discountType', e.target.value)}
                                                    >
                                                        <option value="%">%</option>
                                                        <option value="₹">₹</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right align-middle pr-6 border-l border-slate-50/50">
                                                <span className="text-sm font-bold text-slate-700">{finalAmount.toFixed(2)}</span>
                                            </td>
                                            <td className="p-3 align-middle text-center">
                                                <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50/30 border-t border-slate-100 px-6 py-4 flex items-center gap-4">
                        <button type="button" onClick={handleAddItem} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">
                            <Plus size={14} strokeWidth={3} /> Add Line Item
                        </button>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <button type="button" className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">
                            Add Items in Bulk
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8 mt-10">
                    <div className="col-span-12 lg:col-span-7 space-y-6">
                        <div>
                            <label className="block text-sm text-gray-700 font-medium mb-1">Customer Notes</label>
                            <textarea
                                className="w-full text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 p-3 bg-gray-50/50"
                                rows="3"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Thanks for your business."
                            ></textarea>
                            <span className="text-xs text-gray-500 mt-1 block">Will be displayed on the invoice</span>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 font-medium mb-1">Terms & Conditions</label>
                            <textarea
                                className="w-full text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 p-3 bg-gray-50/50"
                                rows="3"
                                value={termsAndConditions}
                                onChange={(e) => setTermsAndConditions(e.target.value)}
                                placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                            ></textarea>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-5 bg-white border border-gray-100 rounded p-6 shadow-sm">
                        <div className="space-y-3 mb-4 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Sub Total</span>
                                <span className="font-medium text-gray-900">{totals.subTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Tax Total</span>
                                <span className="font-medium text-gray-900">{totals.taxTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between font-bold text-gray-600 text-lg border-t border-gray-200 pt-4">
                            <span>Total ( ₹ )</span>
                            <span className="text-gray-900">{totals.grandTotal.toFixed(2)}</span>
                        </div>
                        <div className="mt-4 text-right">
                            <button type="button" className="text-blue-500 hover:text-blue-700 font-semibold text-sm flex items-center justify-end w-full">
                                Show Total Summary <span className="ml-1 text-xs">▼</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50/50 border-t border-slate-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            <span className="text-red-500">*</span> Required fields for invoicing
                        </span>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="button" onClick={(e) => handleSubmit(e, 'draft')} disabled={loading} className="btn-secondary">
                                Save as Draft
                            </button>
                            <button type="button" onClick={(e) => handleSubmit(e, 'send')} disabled={loading} className="btn-primary px-8 shadow-sm">
                                {loading ? 'Saving...' : 'Save and Send'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default InvoiceForm;
