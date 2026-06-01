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
    const [isTaxed, setIsTaxed] = useState(true);
    const [taxType, setTaxType] = useState('GST');
    const [taxRate, setTaxRate] = useState(18);
    const [useProductSpecificTax, setUseProductSpecificTax] = useState(true);
    const [includeTerms, setIncludeTerms] = useState(true);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [includeBankDetails, setIncludeBankDetails] = useState(true);
    const [includeUpiQr, setIncludeUpiQr] = useState(true);

    const [items, setItems] = useState([
        { itemId: '', description: '', quantity: 1, rate: 0, discountType: '%', discount: 0, taxGst: 0 }
    ]);

    const [notes, setNotes] = useState('Thanks for your business.');
    const [termsAndConditions, setTermsAndConditions] = useState('Enter the terms and conditions of your business to be displayed in your transaction');
    const [amountPaid, setAmountPaid] = useState(0);
    const [billingAddress, setBillingAddress] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [hasDraft, setHasDraft] = useState(false);

    // Tax Systems State
    const [taxSystems, setTaxSystems] = useState(() => {
        const saved = localStorage.getItem('invoice_tax_systems');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            { name: 'Commission or Brokerage', rate: 2, section: 'Section 393(1) Sl1(ii)', status: 'Active' },
            { name: 'Dividend', rate: 10, section: 'Section 393(1) Sl7', status: 'Active' },
            { name: 'GST', rate: 18, section: 'Section 393(3) Sl5D(a)', status: 'Active' },
            { name: 'Other Interest than securities', rate: 10, section: 'Section 393(1) Sl5(iii)', status: 'Active' },
            { name: 'Payment of contractors for Others', rate: 2, section: 'Section 393(1) Sl6(ii)', status: 'Active' },
            { name: 'Payment of contractors HUF/Indiv', rate: 1, section: 'Section 393(1) Sl6(i)D(a)', status: 'Active' },
            { name: 'Technical Fees (2%)', rate: 2, section: 'Section 393(1) Sl6(iii)D(a)', status: 'Active' }
        ];
    });

    const [openTaxModal, setOpenTaxModal] = useState(false);
    const [newTaxName, setNewTaxName] = useState('');
    const [newTaxRate, setNewTaxRate] = useState('');
    const [newTaxSection, setNewTaxSection] = useState('');
    const [newTaxStatus, setNewTaxStatus] = useState('Active');
    const [pendingItemIndex, setPendingItemIndex] = useState(-1);

    useEffect(() => {
        if (!date) return;
        const baseDate = new Date(date);
        if (isNaN(baseDate.getTime())) return;
        
        let daysToAdd = 0;
        if (paymentTerms === 'Net 15') daysToAdd = 15;
        else if (paymentTerms === 'Net 30') daysToAdd = 30;
        else if (paymentTerms === 'Net 45') daysToAdd = 45;
        else if (paymentTerms === 'Net 60') daysToAdd = 60;
        
        baseDate.setDate(baseDate.getDate() + daysToAdd);
        
        const yyyy = baseDate.getFullYear();
        const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
        const dd = String(baseDate.getDate()).padStart(2, '0');
        setDueDate(`${yyyy}-${mm}-${dd}`);
    }, [date, paymentTerms]);

    // Check if a draft exists in localStorage on mount (for new invoices)
    useEffect(() => {
        if (!isEdit) {
            const savedDraft = localStorage.getItem('invoice_form_draft');
            if (savedDraft) {
                setHasDraft(true);
            }
        }
    }, [isEdit]);

    // Auto-save form draft on changes (only for new invoices)
    useEffect(() => {
        if (!isEdit) {
            const draft = {
                customerId,
                billingAddress,
                shippingAddress,
                date,
                dueDate,
                notes,
                termsAndConditions,
                items,
                useProductSpecificTax,
                taxRate
            };
            const hasData = customerId || billingAddress || shippingAddress || notes !== 'Thanks for your business.' || termsAndConditions !== 'Enter the terms and conditions of your business to be displayed in your transaction' || items.some(i => i.itemId || i.rate > 0 || i.quantity > 1);
            if (hasData) {
                localStorage.setItem('invoice_form_draft', JSON.stringify(draft));
            }
        }
    }, [customerId, billingAddress, shippingAddress, date, dueDate, notes, termsAndConditions, items, useProductSpecificTax, taxRate, isEdit]);

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
            setAmountPaid(data.amountPaid || 0);
            setBillingAddress(data.billingAddress || '');
            setShippingAddress(data.shippingAddress || '');
            setIsTaxed(data.isTaxed !== false);
            setTaxType(data.taxType || 'GST');
            setIncludeTerms(data.includeTerms !== false);
            setIncludeSignature(data.includeSignature === true);
            setIncludeBankDetails(data.includeBankDetails !== false);
            setIncludeUpiQr(data.includeUpiQr !== false);
            if (data.taxRate === null || data.taxRate === undefined) {
                setUseProductSpecificTax(true);
                setTaxRate('');
            } else {
                setUseProductSpecificTax(false);
                setTaxRate(data.taxRate);
            }
            if (data.lineItems?.length > 0 || data.items?.length > 0) {
                const itemsList = data.lineItems || data.items || [];
                setItems(itemsList.map(i => ({
                    itemId: i.itemId?._id || i.itemId || '',
                    description: i.description || '',
                    quantity: i.quantity || 1,
                    rate: i.rate || 0,
                    discountType: i.discountType || '%',
                    discount: i.discountValue || i.discountPercent || 0,
                    taxGst: i.gstPercent || i.gstPercentage || 0
                })));
            }
        } catch (err) { console.error('Error fetching invoice', err); }
    };

    const handleSaveTaxPreset = (e) => {
        e?.preventDefault();
        if (!newTaxName || !newTaxRate) {
            alert('Please enter both Tax Name and Rate');
            return;
        }
        const rateVal = Number(newTaxRate);
        if (isNaN(rateVal)) {
            alert('Please enter a valid rate percentage');
            return;
        }

        const newPreset = {
            name: newTaxName,
            rate: rateVal,
            section: newTaxSection || 'Custom',
            status: newTaxStatus || 'Active'
        };

        const updated = [...taxSystems, newPreset];
        setTaxSystems(updated);
        localStorage.setItem('invoice_tax_systems', JSON.stringify(updated));

        if (pendingItemIndex >= 0) {
            const updatedItems = [...items];
            updatedItems[pendingItemIndex].taxGst = rateVal;
            setItems(updatedItems);
        } else {
            setTaxType(newTaxName);
            setTaxRate(rateVal);
        }

        setNewTaxName('');
        setNewTaxRate('');
        setNewTaxSection('');
        setNewTaxStatus('Active');
        setOpenTaxModal(false);
        setPendingItemIndex(-1);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        if (field === 'itemId') {
            const selectedItem = catalogItems.find(c => c._id === value);
            newItems[index] = {
                ...newItems[index],
                itemId: value,
                rate: selectedItem ? selectedItem.sellingPrice : 0,
                taxGst: selectedItem ? selectedItem.gstPercentage : 0,
                description: selectedItem ? selectedItem.description || '' : ''
            };
        } else {
            newItems[index] = { ...newItems[index], [field]: field === 'discountType' ? value : (field === 'description' ? value : Number(value) || value) };
        }
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { itemId: '', description: '', quantity: 1, rate: 0, discountType: '%', discount: 0, taxGst: 0 }]);
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
            
            const currentTaxRate = isTaxed 
                ? (useProductSpecificTax ? (item.taxGst || 0) : (taxRate !== undefined && taxRate !== '' ? Number(taxRate) : (item.taxGst || 0)))
                : 0;
            taxTotal += itemAmount * (currentTaxRate / 100);
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
            lineItems: items.filter(i => i.itemId).map(i => ({
                itemId: i.itemId,
                name: catalogItems.find(c => c._id === i.itemId)?.name || 'Item',
                description: i.description || '',
                quantity: i.quantity,
                rate: i.rate,
                discountPercent: i.discountType === '%' ? Number(i.discount) || 0 : 0,
                discountType: i.discountType || '%',
                discountValue: Number(i.discount) || 0,
                gstPercent: isTaxed ? (useProductSpecificTax ? Number(i.taxGst || 0) : (taxRate !== undefined && taxRate !== '' ? Number(taxRate) : i.taxGst)) : 0
            })),
            items: items.filter(i => i.itemId).map(i => ({
                itemId: i.itemId,
                description: i.description || '',
                quantity: i.quantity,
                rate: i.rate,
                gstPercentage: isTaxed ? (useProductSpecificTax ? Number(i.taxGst || 0) : (taxRate !== undefined && taxRate !== '' ? Number(taxRate) : i.taxGst)) : 0
            })),
            amountPaid: Number(amountPaid) || 0,
            balanceDue: Math.max(0, totals.grandTotal - (Number(amountPaid) || 0)),
            discount: 0,
            subTotal: totals.subTotal,
            taxTotal: { 
                cgst: isTaxed && taxType === 'GST' ? totals.taxTotal / 2 : 0, 
                sgst: isTaxed && taxType === 'GST' ? totals.taxTotal / 2 : 0, 
                igst: isTaxed && taxType !== 'GST' ? totals.taxTotal : 0, 
                totalTax: totals.taxTotal 
            },
            grandTotal: totals.grandTotal,
            roundOff: 0,
            taxType: isTaxed ? taxType : 'None',
            taxRate: isTaxed ? (useProductSpecificTax ? null : Number(taxRate)) : 0,
            isTaxed,
            billingAddress,
            shippingAddress,
            includeTerms,
            includeSignature,
            includeBankDetails,
            includeUpiQr
        };

        try {
            if (isEdit) {
                await axios.put(`/api/invoices/${id}`, payload);
            } else {
                await axios.post('/api/invoices', payload);
            }
            localStorage.removeItem('invoice_form_draft');
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

            {hasDraft && (
                <div className="mx-8 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in no-print">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900">Unsaved Invoice Draft Found</p>
                            <p className="text-xs text-amber-750">You have unsaved changes from a previous session. Would you like to restore them?</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    const savedDraft = localStorage.getItem('invoice_form_draft');
                                    if (savedDraft) {
                                        const draft = JSON.parse(savedDraft);
                                        if (draft.customerId) setCustomerId(draft.customerId);
                                        if (draft.billingAddress) setBillingAddress(draft.billingAddress);
                                        if (draft.shippingAddress) setShippingAddress(draft.shippingAddress);
                                        if (draft.date) setDate(draft.date);
                                        if (draft.dueDate) setDueDate(draft.dueDate);
                                        if (draft.notes) setNotes(draft.notes);
                                        if (draft.termsAndConditions) setTermsAndConditions(draft.termsAndConditions);
                                        if (draft.items) setItems(draft.items);
                                        if (draft.useProductSpecificTax !== undefined) setUseProductSpecificTax(draft.useProductSpecificTax);
                                        if (draft.taxRate !== undefined) setTaxRate(draft.taxRate);
                                    }
                                } catch (e) {
                                    console.error("Failed to restore draft", e);
                                }
                                setHasDraft(false);
                            }}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                            Restore
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.removeItem('invoice_form_draft');
                                setHasDraft(false);
                            }}
                            className="px-3.5 py-1.5 bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold transition-all"
                        >
                            Discard
                        </button>
                    </div>
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
                                if (cust) {
                                    setCustomerId(cust._id);
                                    if (cust.billingAddress) {
                                        const street1 = cust.billingAddress.street1 || cust.billingAddress.street || '';
                                        const street2 = cust.billingAddress.street2 || '';
                                        const city = cust.billingAddress.city || '';
                                        const state = cust.billingAddress.state || '';
                                        const zip = cust.billingAddress.zip || cust.billingAddress.zipCode || '';
                                        const country = cust.billingAddress.country || 'India';
                                        
                                        const parts = [
                                            street1,
                                            street2,
                                            [city, state, zip].filter(Boolean).join(', '),
                                            country
                                        ].filter(Boolean);
                                        
                                        setBillingAddress(parts.join('\n'));
                                    } else {
                                        setBillingAddress('');
                                    }
                                    if (cust.shippingAddress) {
                                        const sStreet1 = cust.shippingAddress.street1 || cust.shippingAddress.street || '';
                                        const sStreet2 = cust.shippingAddress.street2 || '';
                                        const sCity = cust.shippingAddress.city || '';
                                        const sState = cust.shippingAddress.state || '';
                                        const sZip = cust.shippingAddress.zip || cust.shippingAddress.zipCode || '';
                                        const sCountry = cust.shippingAddress.country || 'India';
                                        
                                        const sParts = [
                                            sStreet1,
                                            sStreet2,
                                            [sCity, sState, sZip].filter(Boolean).join(', '),
                                            sCountry
                                        ].filter(Boolean);
                                        
                                        setShippingAddress(sParts.join('\n'));
                                    } else {
                                        setShippingAddress('');
                                    }
                                }
                            }}
                            placeholder="Select or add a customer"
                            onAddNew={() => navigate('/customers/new')}
                            addNewLabel="New Customer"
                        />
                    </InputRow>

                    <InputRow label="Billing Address">
                        <textarea
                            className="input-field min-h-20 font-medium"
                            placeholder="Customer billing address (auto-populated, edit if needed)"
                            value={billingAddress}
                            onChange={(e) => setBillingAddress(e.target.value)}
                            rows={3}
                        />
                    </InputRow>

                    <InputRow label="Shipping Address">
                        <textarea
                            className="input-field min-h-20 font-medium"
                            placeholder="Customer shipping address (optional, auto-populated, edit if needed)"
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            rows={3}
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

                    <InputRow label="Tax Setting" helper="Choose whether to record this invoice with or without tax">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsTaxed(true);
                                    if (taxType === 'None') setTaxType('GST');
                                }}
                                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 ${isTaxed ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                With Tax
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsTaxed(false);
                                }}
                                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 ${!isTaxed ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                Without Tax
                            </button>
                        </div>
                    </InputRow>

                    {isTaxed && (
                        <>
                            <InputRow label="Tax Application Mode" helper="Apply a single tax rate globally or use product-specific tax rates">
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setUseProductSpecificTax(true)}
                                        className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 ${useProductSpecificTax ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        Product Specific
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUseProductSpecificTax(false)}
                                        className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 ${!useProductSpecificTax ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        Global Rate
                                    </button>
                                </div>
                            </InputRow>

                            {!useProductSpecificTax && (
                                <InputRow label="Tax System & Rate" helper="Select the tax system and global percentage rate">
                                    <div className="flex items-center gap-4 max-w-md">
                                        <select
                                            className="input-field max-w-[200px]"
                                            value={taxSystems.some(ts => ts.name === taxType && ts.rate === Number(taxRate)) ? `${taxType}|${taxRate}` : ''}
                                            onChange={(e) => {
                                                if (e.target.value === 'ADD_NEW') {
                                                    setPendingItemIndex(-1);
                                                    setOpenTaxModal(true);
                                                } else if (e.target.value) {
                                                    const [name, rate] = e.target.value.split('|');
                                                    setTaxType(name);
                                                    setTaxRate(Number(rate));
                                                }
                                            }}
                                        >
                                            <option value="">Select Tax System</option>
                                            {taxSystems.filter(ts => ts.status === 'Active').map((ts, sIdx) => (
                                                <option key={sIdx} value={`${ts.name}|${ts.rate}`}>
                                                    {ts.name} ({ts.rate}%)
                                                </option>
                                            ))}
                                            <option value="ADD_NEW" className="text-blue-600 font-semibold">+ Add New Tax...</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPendingItemIndex(-1);
                                                setOpenTaxModal(true);
                                            }}
                                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 whitespace-nowrap animate-in fade-in"
                                        >
                                            + Add Preset
                                        </button>
                                        <div className="relative flex-1 max-w-[120px]">
                                            <input
                                                type="number"
                                                min="0" max="100" step="0.1"
                                                className="input-field pr-8"
                                                value={taxRate}
                                                onChange={(e) => setTaxRate(e.target.value)}
                                                placeholder="Rate"
                                            />
                                            <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-semibold">%</span>
                                        </div>
                                    </div>
                                </InputRow>
                            )}

                            {useProductSpecificTax && (
                                <InputRow label="Tax System" helper="Select the tax system type">
                                    <div className="flex items-center gap-3">
                                        <select
                                            className="input-field max-w-[250px]"
                                            value={taxType}
                                            onChange={(e) => {
                                                if (e.target.value === 'ADD_NEW') {
                                                    setPendingItemIndex(-1);
                                                    setOpenTaxModal(true);
                                                } else {
                                                    setTaxType(e.target.value);
                                                }
                                            }}
                                        >
                                            <option value="GST">GST</option>
                                            <option value="VAT">VAT</option>
                                            <option value="Sales Tax">Sales Tax</option>
                                            <option value="ADD_NEW" className="text-blue-600 font-semibold">+ Add New Tax...</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPendingItemIndex(-1);
                                                setOpenTaxModal(true);
                                            }}
                                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 whitespace-nowrap animate-in fade-in"
                                        >
                                            + Add Preset
                                        </button>
                                    </div>
                                </InputRow>
                            )}
                        </>
                    )}
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
                                    <th className={`px-4 py-3 tracking-wider ${useProductSpecificTax ? 'w-[35%]' : 'w-[50%]'}`}>Item Details</th>
                                    <th className={`px-4 py-3 border-l border-slate-50 tracking-wider text-right w-[10%]`}>Quantity</th>
                                    <th className={`px-4 py-3 border-l border-slate-50 tracking-wider text-right w-[15%]`}>Rate</th>
                                    <th className={`px-4 py-3 border-l border-slate-50 tracking-wider text-right w-[15%]`}>Discount</th>
                                    {useProductSpecificTax && <th className="px-4 py-3 w-[15%] border-l border-slate-50 tracking-wider text-right">Tax System</th>}
                                    <th className={`px-4 py-3 border-l border-slate-50 tracking-wider text-right pr-6 w-[10%]`}>Amount</th>
                                    <th className="w-[5%]"></th>
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
                                                <input
                                                    type="text"
                                                    placeholder="Add item description..."
                                                    className="w-full text-xs text-slate-500 bg-transparent border-0 border-b border-slate-100 hover:border-slate-250 focus:border-blue-500 focus:ring-0 px-1 py-0.5 mt-1.5 font-medium"
                                                    value={item.description || ''}
                                                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                                />
                                                {item.itemId && !useProductSpecificTax && (
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
                                                        className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent pl-4"
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
                                            {useProductSpecificTax && (
                                                <td className="p-3 border-l border-slate-50/50">
                                                    <select
                                                        className="w-full text-xs bg-transparent border-0 border-b border-slate-200 focus:ring-0 focus:border-blue-500 py-1"
                                                        value={item.taxGst}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'ADD_NEW') {
                                                                setPendingItemIndex(idx);
                                                                setOpenTaxModal(true);
                                                            } else {
                                                                handleItemChange(idx, 'taxGst', e.target.value);
                                                            }
                                                        }}
                                                    >
                                                        {taxSystems.filter(ts => ts.status === 'Active').map((ts, sIdx) => (
                                                            <option key={sIdx} value={ts.rate}>
                                                                {ts.name} ({ts.rate}%)
                                                            </option>
                                                        ))}
                                                        <option value="ADD_NEW" className="text-blue-600 font-semibold">+ Add New Tax...</option>
                                                    </select>
                                                </td>
                                            )}
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
                        <div className="flex flex-col gap-3 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    checked={includeTerms}
                                    onChange={(e) => setIncludeTerms(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-700">Include Terms & Conditions on Invoice</span>
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

                    <div className="col-span-12 lg:col-span-5 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Invoice Summary</h4>
                        <div className="space-y-2.5 mb-4 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Sub Total</span>
                                <span className="font-medium text-gray-900">₹{totals.subTotal.toFixed(2)}</span>
                            </div>
                            {isTaxed && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax ({taxType}{!useProductSpecificTax ? ` ${taxRate}%` : ' (Product Specific)'})</span>
                                    <span className="font-medium text-gray-900">₹{totals.taxTotal.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between font-bold text-slate-900 text-lg border-t border-gray-200 pt-3">
                            <span>Grand Total</span>
                            <span className="text-blue-600">₹{totals.grandTotal.toFixed(2)}</span>
                        </div>
                        {/* Received Amount */}
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Amount Received (₹)</label>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    max={totals.grandTotal}
                                    className="input-field pl-8 w-full"
                                    value={amountPaid}
                                    onChange={e => setAmountPaid(Math.min(Number(e.target.value), totals.grandTotal))}
                                    placeholder="0.00"
                                />
                            </div>
                            {amountPaid > 0 && (
                                <div className="flex items-center justify-between text-sm font-bold text-red-500 mt-1">
                                    <span>Balance Due</span>
                                    <span>₹{Math.max(0, totals.grandTotal - amountPaid).toFixed(2)}</span>
                                </div>
                            )}
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
            {/* Tax Preset Creation Modal */}
            {openTaxModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpenTaxModal(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 md:p-8 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-2">Create Tax Preset</h3>
                        <p className="text-xs text-slate-400 mb-6">Create a custom tax percentage rate and label preset to quickly select it later.</p>
                        
                        <form onSubmit={handleSaveTaxPreset} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Tax Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. Service Tax, Special GST"
                                    value={newTaxName}
                                    onChange={(e) => setNewTaxName(e.target.value)}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Rate (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        className="input-field pr-8"
                                        placeholder="e.g. 12.5"
                                        value={newTaxRate}
                                        onChange={(e) => setNewTaxRate(e.target.value)}
                                        required
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-semibold">%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Section (Optional)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. Section 194C"
                                    value={newTaxSection}
                                    onChange={(e) => setNewTaxSection(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setOpenTaxModal(false)}
                                    className="flex-1 btn-secondary justify-center py-2.5 text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-primary justify-center py-2.5 text-xs font-bold"
                                >
                                    Save Preset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceForm;
