import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Settings, X, Info, Plus, ChevronDown, Upload, ArrowLeft, Save } from 'lucide-react';
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

const QuotationForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [customers, setCustomers] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [customerId, setCustomerId] = useState('');
    const [quoteNumberPlaceholder, setQuoteNumberPlaceholder] = useState('QT-00000X');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [validityDate, setValidityDate] = useState(''); // Expiry Date
    const [salesperson, setSalesperson] = useState('');
    const [projectName, setProjectName] = useState('');
    const [subject, setSubject] = useState('');

    const [items, setItems] = useState([
        { itemId: '', name: '', quantity: 1, rate: 0, discount: 0, gstPercentage: 0 }
    ]);
    const [notes, setNotes] = useState('Looking forward for your business.');
    const [termsAndConditions, setTermsAndConditions] = useState('only pay after the payment');
    const [includeTerms, setIncludeTerms] = useState(true);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [includeBankDetails, setIncludeBankDetails] = useState(true);
    const [includeUpiQr, setIncludeUpiQr] = useState(true);
    const [adjustment, setAdjustment] = useState(0);
    const [tdsPercentage, setTdsPercentage] = useState(0);
    const [attachedFiles, setAttachedFiles] = useState([]);

    const [totals, setTotals] = useState({ subTotal: 0, taxTotal: 0, tdsAmount: 0, grandTotal: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, itemRes] = await Promise.all([
                    axios.get('/api/customers'),
                    axios.get('/api/items')
                ]);
                setCustomers(custRes.data.data);
                setCatalogItems(itemRes.data.data);

                if (isEdit) {
                    const quoteRes = await axios.get(`/api/quotations/${id}`);
                    const data = quoteRes.data.data;
                    setCustomerId(data.customerId?._id || data.customerId || '');
                    setReferenceNumber(data.referenceNumber || '');
                    setQuoteDate(data.quoteDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
                    setValidityDate(data.validityDate?.split('T')[0] || '');
                    setSalesperson(data.salesperson || '');
                    setProjectName(data.projectName || '');
                    setSubject(data.subject || '');
                    setNotes(data.notes || '');
                    setTermsAndConditions(data.termsAndConditions || '');
                    setIncludeTerms(data.includeTerms !== false);
                    setIncludeSignature(data.includeSignature || false);
                    setIncludeBankDetails(data.includeBankDetails !== false);
                    setIncludeUpiQr(data.includeUpiQr !== false);
                    setAdjustment(data.adjustment || 0);
                    setTdsPercentage(data.tdsPercentage || 0);
                    setQuoteNumberPlaceholder(data.quoteNumber || 'QT-00000X');
                    if (data.items?.length > 0) {
                        setItems(data.items.map(i => ({
                            itemId: i.itemId?._id || i.itemId || '',
                            name: i.name || '',
                            quantity: i.quantity || 1,
                            rate: i.rate || 0,
                            discount: i.discount || 0,
                            gstPercentage: i.gstPercentage || i.gstPercent || 0
                        })));
                    }
                } else {
                    const quoteRes = await axios.get('/api/quotations');
                    const count = quoteRes.data.count || 0;
                    setQuoteNumberPlaceholder(`QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`);
                }
            } catch (err) {
                console.error('Error fetching data for quotation', err);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        let sub = 0;
        let tax = 0;
        items.forEach(i => {
            if (i.name) {
                const amountBeforeDiscount = i.quantity * i.rate;
                const discountAmount = amountBeforeDiscount * ((i.discount || 0) / 100);
                const amountAfterDiscount = amountBeforeDiscount - discountAmount;
                const t = amountAfterDiscount * (i.gstPercentage / 100);
                sub += amountAfterDiscount;
                tax += t;
            }
        });
        const tdsAmount = sub * (tdsPercentage / 100);
        setTotals({
            subTotal: sub,
            taxTotal: tax,
            tdsAmount,
            grandTotal: Math.round(sub + tax - tdsAmount + parseFloat(adjustment || 0)),
        });
    }, [items, adjustment, tdsPercentage]);

    const handleAddItemRow = () => {
        setItems([...items, { itemId: '', name: '', quantity: 1, rate: 0, discount: 0, gstPercentage: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        } else {
            setItems([{ itemId: '', name: '', quantity: 1, rate: 0, discount: 0, gstPercentage: 0 }]);
        }
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
                    gstPercentage: dbItem.gstPercentage
                };
            } else {
                newItems[index] = { ...newItems[index], itemId: '', name: '', rate: 0, gstPercentage: 0 };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: field === 'name' ? value : (value === '' ? '' : Number(value)) };
        }
        setItems(newItems);
    };

    const handleSubmit = async (e, type) => {
        e.preventDefault();
        const validItems = items.filter(i => i.name && i.quantity > 0);
        if (!customerId || validItems.length === 0) {
            setError('Please select a customer and add at least one valid item');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const payload = {
                customerId,
                quoteDate,
                validityDate: validityDate || undefined,
                referenceNumber,
                salesperson,
                projectName,
                subject,
                items: validItems,
                adjustment: Number(adjustment),
                tdsPercentage,
                tdsAmount: totals.tdsAmount,
                notes,
                termsAndConditions,
                includeTerms,
                includeSignature,
                includeBankDetails,
                includeUpiQr,
                status: type === 'draft' ? 'Draft' : 'Sent'
            };

            if (isEdit) {
                await axios.put(`/api/quotations/${id}`, payload);
            } else {
                await axios.post('/api/quotations', payload);
            }
            navigate('/quotations');
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} quotation`);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white shadow-sm rounded-lg border border-slate-200 mt-6 mb-12 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/quotations')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
                        <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-wider">{quoteNumberPlaceholder}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/quotations')} className="btn-secondary">
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

                    <InputRow label="Reference#" helper="Optional reference number for tracking">
                        <input
                            type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
                            className="input-field max-w-md"
                            placeholder="e.g. PO-890"
                        />
                    </InputRow>

                    <div className="flex items-start py-3 border-b border-slate-100">
                        <label className="w-48 shrink-0 text-sm font-medium text-slate-700 pt-2">
                            Quote Date<span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="flex flex-1 items-center gap-6">
                            <input
                                type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} required
                                className="input-field max-w-[200px]"
                            />
                            <div className="flex items-center gap-4 flex-1">
                                <label className="text-sm font-medium text-slate-700">Expiry Date</label>
                                <input
                                    type="date" value={validityDate} onChange={e => setValidityDate(e.target.value)}
                                    className="input-field max-w-[200px]"
                                />
                            </div>
                        </div>
                    </div>

                    <InputRow label="Salesperson">
                        <div className="relative max-w-sm">
                            <input
                                type="text" value={salesperson} onChange={e => setSalesperson(e.target.value)} placeholder="e.g. John Doe"
                                className="input-field pr-10"
                            />
                            <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                        </div>
                    </InputRow>

                    <InputRow label="Subject" helper="Briefly describe the purpose of this quotation">
                        <input
                            type="text" value={subject} onChange={e => setSubject(e.target.value)}
                            placeholder="e.g. Supply of construction materials for Site A"
                            className="input-field max-w-2xl"
                        />
                    </InputRow>
                </div>

                {/* Item Table Frame */}
                <div className="border border-slate-200 rounded-lg bg-white mt-8 mx-8">
                    <div className="bg-slate-50/50 text-slate-800 font-bold text-xs px-4 py-3 border-b border-slate-200 uppercase tracking-wider">
                        Item Details
                    </div>

                    <div className="overflow-visible"> {/* Ensure overflow is visible for dropdowns */}
                        <table className="w-full text-left table-fixed">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                    <th className="px-4 py-3 w-7/12 tracking-wider">Item Details</th>
                                    <th className="px-4 py-3 w-24 border-l border-slate-50 tracking-wider text-right">Quantity</th>
                                    <th className="px-4 py-3 w-32 border-l border-slate-50 tracking-wider text-right">Rate</th>
                                    <th className="px-4 py-3 w-24 border-l border-slate-50 tracking-wider text-right">Discount</th>
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
                                                placeholder="Select an item"
                                                onAddNew={() => navigate('/items/new')}
                                                addNewLabel="New Item"
                                            />
                                            {item.name && (
                                                <div className="flex items-center gap-2 mt-1.5 px-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">GST {item.gstPercentage}%</span>
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
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-3 border-l border-slate-50/50">
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent"
                                                    value={item.discount}
                                                    onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                                                />
                                                <span className="text-[10px] font-bold text-slate-400 ml-1">%</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right align-middle pr-6 border-l border-slate-50/50">
                                            <span className="text-sm font-bold text-slate-700">
                                                ₹{item.name ? ((item.quantity * item.rate) * (1 - (item.discount || 0) / 100)).toFixed(2) : '0.00'}
                                            </span>
                                        </td>
                                        <td className="p-3 align-middle text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50/30 border-t border-slate-100 px-6 py-4 flex items-center gap-4">
                        <button type="button" onClick={handleAddItemRow} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">
                            <Plus size={14} strokeWidth={3} /> Add Line Item
                        </button>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <button type="button" className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">
                            Add Items in Bulk
                        </button>
                    </div>
                </div>

                {/* Bottom Section (Notes & Totals) */}
                <div className="grid grid-cols-12 gap-8 pt-4">

                    {/* Notes & Terms */}
                    <div className="col-span-6 space-y-6">
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Customer Notes</label>
                            <div className="relative">
                                <textarea className="w-full text-sm border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 h-24 resize-none p-2" value={notes} onChange={e => setNotes(e.target.value)} />
                                <div className="absolute right-2 bottom-2 text-gray-500 pointer-events-none">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    checked={includeTerms}
                                    onChange={(e) => setIncludeTerms(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-700">Include Terms & Conditions on Quotation</span>
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

                    {/* Totals Box */}
                    <div className="col-span-6">
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 space-y-4">

                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-700">Sub Total</span>
                                <span className="text-sm font-semibold text-gray-800">{totals.subTotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm pt-2">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <input type="radio" id="tds" name="taxType" checked onChange={() => { }} className="text-blue-500 focus:ring-blue-500 w-3.5 h-3.5" />
                                        <label htmlFor="tds" className="text-gray-700 font-medium">TDS</label>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input type="radio" id="tcs" name="taxType" className="text-blue-500 focus:ring-blue-500 w-3.5 h-3.5" />
                                        <label htmlFor="tcs" className="text-gray-700 font-medium whitespace-nowrap">TCS</label>
                                    </div>
                                    <select
                                        className="border-gray-300 rounded text-xs py-1 px-2 w-32 shadow-sm text-gray-500 bg-white"
                                        value={tdsPercentage}
                                        onChange={(e) => setTdsPercentage(Number(e.target.value))}
                                    >
                                        <option value={0}>0%</option>
                                        <option value={2}>2%</option>
                                        <option value={5}>5%</option>
                                        <option value={10}>10%</option>
                                        <option value={18}>18%</option>
                                    </select>
                                </div>
                                <span className="text-gray-500">- {totals.tdsAmount.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm pt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600 bg-white border border-gray-300 border-dashed rounded px-3 py-1 shadow-sm text-xs">Adjustment</span>
                                    <input type="number" step="0.01" className="w-24 text-right text-sm border-gray-300 rounded shadow-sm py-1" value={adjustment} onChange={e => setAdjustment(e.target.value)} />
                                    <Info size={14} className="text-gray-400" />
                                </div>
                                <span className="text-gray-800 font-medium">{Number(adjustment).toFixed(2)}</span>
                            </div>

                            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-base font-bold text-gray-800">Total ( ₹ )</span>
                                <span className="text-lg font-bold text-gray-900">{totals.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Terms and Upload Area */}
                <div className="grid grid-cols-12 gap-8 py-4 border-t border-gray-100 mt-8 pt-8">
                    <div className="col-span-6 space-y-1">
                        <label className="block text-sm text-gray-700 mb-1">Terms & Conditions</label>
                        <div className="relative">
                            <textarea className="w-full text-sm border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 h-28 resize-none p-2" value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} />
                        </div>
                    </div>
                    <div className="col-span-6 pl-4 border-l border-gray-100">
                        <label className="block text-sm text-gray-700 mb-2">Attach File(s) to Quote</label>
                        <div className="relative w-36">
                            <input
                                type="file"
                                multiple
                                onChange={(e) => setAttachedFiles(Array.from(e.target.files))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button type="button" className="flex items-center justify-between text-sm text-gray-600 bg-white border border-gray-300 rounded shadow-sm px-3 py-1.5 w-full hover:bg-gray-50 pointer-events-none">
                                <div className="flex items-center gap-1.5 font-medium"><Upload size={14} /> Upload File</div>
                                <span className="border-l border-gray-300 pl-1.5"><ChevronDown size={12} /></span>
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">You can upload a maximum of 3 files, 10MB each</p>

                        {/* Display selected files */}
                        {attachedFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {attachedFiles.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200 p-2 rounded">
                                        <span className="text-gray-600 truncate max-w-[200px]">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAttachedFiles(attachedFiles.filter((_, idx) => idx !== i))}
                                            className="text-red-400 hover:text-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 py-3 px-8 -mx-8 flex items-center gap-1 border-t border-b border-gray-200 text-xs text-gray-500 font-medium mt-8">
                    Additional Fields: <span className="font-normal text-gray-400">Start adding custom fields for your quotes by going to Settings ➔ Quotes.</span>
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-50/50 border-t border-slate-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            <span className="text-red-500">*</span> Required fields for quotation
                        </span>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => navigate('/quotations')} className="btn-secondary">
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

export default QuotationForm;
