import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { Truck, Plus, Trash2, ArrowLeft, Save, Info, User, Navigation } from 'lucide-react';
import SearchableDropdown from '../components/SearchableDropdown';
import QuickCustomerModal from '../components/QuickCustomerModal';
import QuickItemModal from '../components/QuickItemModal';
import { AuthContext } from '../context/AuthContext';

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
    const { id } = useParams();
    const isEdit = Boolean(id);
    const [customers, setCustomers] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [activeItemRowIdx, setActiveItemRowIdx] = useState(null);

    const handleCustomerCreated = (newCustomer) => {
        setCustomers(prev => [...prev, newCustomer]);
        setCustomerId(newCustomer._id);
    };

    const handleItemCreated = (newItem) => {
        setCatalogItems(prev => [...prev, newItem]);
        if (activeItemRowIdx !== null) {
            handleItemChange(activeItemRowIdx, 'itemId', newItem._id);
        }
    };

    // Form State
    const { taxSystemMode } = useContext(AuthContext);
    const [customerId, setCustomerId] = useState('');
    const [challanNumber, setChallanNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [challanType, setChallanType] = useState('Supply');
    const [transportDetails, setTransportDetails] = useState({ vehicleNumber: '', driverName: '', route: '' });
    
    const [taxMode, setTaxMode] = useState('WITH_TAX');
    const [isAutoNumber, setIsAutoNumber] = useState(true);
    const [companySettings, setCompanySettings] = useState(null);
    const [challanNumberPlaceholder, setChallanNumberPlaceholder] = useState('CHL-0000X');

    // Numbering Customization States
    const [showNumberingConfig, setShowNumberingConfig] = useState(false);
    const [customPrefix, setCustomPrefix] = useState('');
    const [customNextNumber, setCustomNextNumber] = useState(1);
    const [customDigits, setCustomDigits] = useState(4);
    const [savingSettings, setSavingSettings] = useState(false);

    const [items, setItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [includeTerms, setIncludeTerms] = useState(true);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [includeBankDetails, setIncludeBankDetails] = useState(true);
    const [includeUpiQr, setIncludeUpiQr] = useState(true);

    const [isTaxed, setIsTaxed] = useState(true);
    const [taxType, setTaxType] = useState('GST');
    const [taxRate, setTaxRate] = useState(18);
    const [useProductSpecificTax, setUseProductSpecificTax] = useState(true);
    const [tdsPercentage, setTdsPercentage] = useState(0);
    const [tcsPercentage, setTcsPercentage] = useState(0);
    const [tdsTcsType, setTdsTcsType] = useState('None'); // 'None', 'TDS', 'TCS'

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
            updatedItems[pendingItemIndex].gstPercent = rateVal;
            setItems(updatedItems);
            setTaxType(newTaxName);
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, itemRes, settingsRes] = await Promise.all([
                    axios.get('/api/customers'),
                    axios.get('/api/items'),
                    axios.get('/api/settings')
                ]);
                setCustomers(custRes.data.data);
                setCatalogItems(itemRes.data.data);
                setCompanySettings(settingsRes.data.data);

                if (isEdit) {
                    const challanRes = await axios.get(`/api/public/challans/${id}`);
                    const data = challanRes.data.data.challan;
                    setCustomerId(data.customerId?._id || data.customerId || '');
                    setChallanNumber(data.challanNumber || '');
                    if (data.date) {
                        setDate(new Date(data.date).toISOString().split('T')[0]);
                    }
                    setChallanType(data.challanType || 'Supply');
                    setTransportDetails(data.transportDetails || { vehicleNumber: '', driverName: '', route: '' });
                    setNotes(data.notes || '');
                    setTermsAndConditions(data.termsAndConditions || '');
                    setIncludeTerms(data.includeTerms !== false);
                    setIncludeSignature(data.includeSignature || false);
                    setIncludeBankDetails(data.includeBankDetails !== false);
                    setIncludeUpiQr(data.includeUpiQr !== false);
                    setIsTaxed(data.isTaxed !== false);
                    setTaxType(data.taxType || 'GST');
                    if (data.taxRate === null || data.taxRate === undefined) {
                        setUseProductSpecificTax(true);
                        setTaxRate('');
                    } else {
                        setUseProductSpecificTax(false);
                        setTaxRate(data.taxRate);
                    }
                    setTdsTcsType(data.tdsTcsType || 'None');
                    setTdsPercentage(data.tdsPercentage || 0);
                    setTcsPercentage(data.tcsPercentage || 0);
                    setTaxMode(data.taxMode || 'WITH_TAX');
                    setIsAutoNumber(false);
                    setChallanNumberPlaceholder(data.challanNumber || '');
                    setChallanNumber(data.challanNumber || '');
                    if (data.items?.length > 0) {
                        setItems(data.items.map(i => ({
                            itemId: i.itemId?._id || i.itemId || '',
                            name: i.name || '',
                            quantity: i.quantity || 1,
                            rate: i.rate || 0,
                            gstPercent: i.gstPercentage ?? i.gstPercent ?? 0,
                            amount: i.amount || 0
                        })));
                    }
                }
            } catch (err) {
                console.error('Error fetching data for challan', err);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (isEdit || !companySettings) return;
        const numbering = companySettings.numberingSettings?.challan;
        const modeSettings = taxMode === 'WITH_TAX' ? numbering?.withTax : numbering?.withoutTax;
        
        if (modeSettings) {
            setIsAutoNumber(modeSettings.auto);
            const prefix = modeSettings.prefix || '';
            const nextNum = modeSettings.nextNumber || 1;
            const digits = modeSettings.digits || 4;
            setChallanNumberPlaceholder(`${prefix}${String(nextNum).padStart(digits, '0')}`);
            setChallanNumber(`${prefix}${String(nextNum).padStart(digits, '0')}`);
            setCustomPrefix(prefix);
            setCustomNextNumber(nextNum);
            setCustomDigits(digits);
        }
    }, [taxMode, companySettings, isEdit]);

    const handleSaveNumberingConfig = async () => {
        setSavingSettings(true);
        try {
            const modeKey = taxMode === 'WITH_TAX' ? 'withTax' : 'withoutTax';
            const updatedNumberingSettings = {
                ...companySettings.numberingSettings,
                challan: {
                    ...companySettings.numberingSettings?.challan,
                    [modeKey]: {
                        auto: true,
                        prefix: customPrefix,
                        nextNumber: Number(customNextNumber),
                        digits: Number(customDigits)
                    }
                }
            };
            const res = await axios.put('/api/settings', { numberingSettings: updatedNumberingSettings });
            setCompanySettings(res.data.data);
            setShowNumberingConfig(false);
        } catch (err) {
            console.error('Error saving numbering config', err);
            alert('Failed to save numbering configuration');
        } finally {
            setSavingSettings(false);
        }
    };

    useEffect(() => {
        if (isEdit) return;
        if (taxSystemMode === 'WITH_TAX') {
            setTaxMode('WITH_TAX');
            setIsTaxed(true);
        } else if (taxSystemMode === 'WITHOUT_TAX') {
            setTaxMode('WITHOUT_TAX');
            setIsTaxed(false);
        } else {
            setTaxMode('WITH_TAX');
            setIsTaxed(true);
        }
    }, [taxSystemMode, isEdit]);

    const getGstSummaryDisplay = () => {
        if (!isTaxed || taxType !== 'GST') return null;
        if (!useProductSpecificTax) {
            const rate = Number(taxRate || 0);
            const halfRate = (rate / 2).toFixed(1).replace(/\.0$/, '');
            const halfAmount = (totals.taxTotal / 2).toFixed(2);
            return `CGST @ ${halfRate}% (₹${halfAmount}) + SGST @ ${halfRate}% (₹${halfAmount})`;
        } else {
            const rateMap = {};
            items.forEach(i => {
                if (i.itemId) {
                    const amountBeforeDiscount = (i.quantity || 0) * (i.rate || 0);
                    const amountAfterDiscount = amountBeforeDiscount;
                    const rate = Number(i.gstPercent || 0);
                    if (rate > 0) {
                        const itemTax = amountAfterDiscount * (rate / 100);
                        rateMap[rate] = (rateMap[rate] || 0) + itemTax;
                    }
                }
            });
            const lines = Object.entries(rateMap).map(([rate, taxVal]) => {
                const halfRate = (Number(rate) / 2).toFixed(1).replace(/\.0$/, '');
                const halfAmount = (taxVal / 2).toFixed(2);
                return `CGST @ ${halfRate}% (₹${halfAmount}) + SGST @ ${halfRate}% (₹${halfAmount})`;
            });
            return lines.join(' + ');
        }
    };

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
                gstPercent: defaultItem.gstPercentage || defaultItem.gstPercent || 0,
                amount: defaultItem.sellingPrice + (defaultItem.sellingPrice * (defaultItem.gstPercentage || defaultItem.gstPercent || 0) / 100)
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
                const gst = dbItem.gstPercentage || dbItem.gstPercent || 0;
                newItems[index] = {
                    ...newItems[index],
                    itemId: dbItem._id,
                    name: dbItem.name,
                    rate: dbItem.sellingPrice,
                    gstPercent: gst,
                    amount: dbItem.sellingPrice + (dbItem.sellingPrice * gst / 100)
                };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: field === 'name' ? value : (Number(value) || value) };
            if (field === 'quantity' || field === 'rate' || field === 'gstPercent') {
                const qty = Number(newItems[index].quantity) || 0;
                const rate = Number(newItems[index].rate) || 0;
                const gst = Number(newItems[index].gstPercent) || 0;
                const base = qty * rate;
                newItems[index].amount = base + (base * gst / 100);
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
                challanNumber: isAutoNumber ? undefined : challanNumber,
                taxMode,
                date,
                challanType,
                transportDetails,
                items: items.map(i => ({
                    itemId: i.itemId || undefined,
                    name: i.name,
                    quantity: i.quantity,
                    rate: i.rate,
                    gstPercent: isTaxed ? (useProductSpecificTax ? Number(i.gstPercent || 0) : (taxRate !== undefined && taxRate !== '' ? Number(taxRate) : i.gstPercent)) : 0
                })),
                isTaxed,
                taxType: isTaxed ? taxType : 'None',
                taxRate: isTaxed ? (useProductSpecificTax ? null : Number(taxRate)) : 0,
                useProductSpecificTax,
                tdsTcsType,
                tdsPercentage: tdsTcsType === 'TDS' ? Number(tdsPercentage) : 0,
                tcsPercentage: tdsTcsType === 'TCS' ? Number(tcsPercentage) : 0,
                notes,
                termsAndConditions,
                includeTerms,
                includeSignature,
                includeBankDetails,
                includeUpiQr
            };

            if (isEdit) {
                await axios.put(`/api/challans/${id}`, payload);
            } else {
                await axios.post('/api/challans', payload);
            }
            navigate('/challans');
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} challan`);
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        let subTotal = 0;
        let taxTotal = 0;

        items.forEach(item => {
            const rawAmount = (item.quantity || 0) * (item.rate || 0);
            const discountAmount = 0;
            const itemAmount = rawAmount - discountAmount;
            subTotal += itemAmount;
            
            const currentTaxRate = isTaxed 
                ? (useProductSpecificTax ? (item.gstPercent || 0) : (taxRate !== undefined && taxRate !== '' ? Number(taxRate) : (item.gstPercent || 0)))
                : 0;
            taxTotal += itemAmount * (currentTaxRate / 100);
        });

        let tdsAmount = 0;
        let tcsAmount = 0;
        if (tdsTcsType === 'TDS') {
            tdsAmount = subTotal * (tdsPercentage / 100);
        } else if (tdsTcsType === 'TCS') {
            tcsAmount = subTotal * (tcsPercentage / 100);
        }

        const grandTotal = subTotal + taxTotal - tdsAmount + tcsAmount;

        return { subTotal, taxTotal, tdsAmount, tcsAmount, grandTotal };
    };

    const totals = calculateTotals();

    const getProductSpecificTaxBreakdown = () => {
        if (!isTaxed || !useProductSpecificTax) return [];
        const breakdown = {};
        
        const savedSystems = localStorage.getItem('invoice_tax_systems');
        let taxSystems = [
            { name: 'Commission or Brokerage', rate: 2 },
            { name: 'Dividend', rate: 10 },
            { name: 'GST', rate: 18 },
            { name: 'Other Interest than securities', rate: 10 },
            { name: 'Payment of contractors for Others', rate: 2 },
            { name: 'Payment of contractors HUF/Indiv', rate: 1 },
            { name: 'Technical Fees (2%)', rate: 2 }
        ];
        if (savedSystems) {
            try { taxSystems = JSON.parse(savedSystems); } catch (e) {}
        }

        items.forEach(item => {
            const rawAmount = (item.quantity || 0) * (item.rate || 0);
            const discountAmount = 0;
            const taxableAmount = rawAmount - discountAmount;
            
            const taxRate = Number(item.gstPercent || 0);
            if (taxRate <= 0) return;

            const taxAmount = taxableAmount * (taxRate / 100);

            if (taxType === 'GST') {
                const halfRate = (taxRate / 2).toFixed(1).replace(/\.0$/, '');
                const halfAmount = taxAmount / 2;
                const cgstLabel = `CGST @ ${halfRate}%`;
                const sgstLabel = `SGST @ ${halfRate}%`;
                breakdown[cgstLabel] = (breakdown[cgstLabel] || 0) + halfAmount;
                breakdown[sgstLabel] = (breakdown[sgstLabel] || 0) + halfAmount;
            } else {
                const matched = taxSystems.find(ts => ts.rate === taxRate);
                const taxName = matched ? matched.name : (taxType !== 'GST' ? taxType : 'Tax');
                const label = `${taxName} (${taxRate}%)`;
                breakdown[label] = (breakdown[label] || 0) + taxAmount;
            }
        });

        return Object.entries(breakdown)
            .filter(([_, amt]) => amt > 0)
            .map(([label, amount]) => ({ label, amount }));
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
                        <h1 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Delivery Challan' : 'New Delivery Challan'}</h1>
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
                        {loading ? 'Saving...' : (isEdit ? 'Update Challan' : 'Save Challan')}
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
                            onAddNew={() => setShowCustomerModal(true)}
                            addNewLabel="New Customer"
                        />
                        {customerId && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 flex items-start gap-2 max-w-md">
                                <Info size={14} className="mt-0.5 text-blue-400 shrink-0" />
                                <div>
                                    <p className="font-bold text-slate-700 mb-0.5">Shipping Address:</p>
                                    {(() => {
                                        const cust = customers.find(c => c._id === customerId);
                                        const sa = cust?.shippingAddress;
                                        const ba = cust?.billingAddress;
                                        
                                        const formatAddress = (addr) => {
                                            if (!addr) return '';
                                            const street1 = addr.street1 || addr.street || '';
                                            const street2 = addr.street2 || '';
                                            const city = addr.city || '';
                                            const state = addr.state || '';
                                            const zip = addr.zipCode || addr.zip || '';
                                            const country = addr.country || '';
                                            
                                            return [
                                                addr.attention ? `Attn: ${addr.attention}` : '',
                                                street1,
                                                street2,
                                                city,
                                                state,
                                                zip,
                                                country
                                            ].filter(Boolean).join(', ');
                                        };
                                        
                                        return formatAddress(sa) || formatAddress(ba) || 'No address provided';
                                    })()}
                                </div>
                            </div>
                        )}
                    </InputRow>

                    <InputRow label="Challan Date" required>
                        <input
                            type="date"
                            className="input-field max-w-xs"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </InputRow>



                    <InputRow label="Delivery Challan Number" required>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4 flex-wrap">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                        checked={isAutoNumber}
                                        onChange={(e) => setIsAutoNumber(e.target.checked)}
                                        disabled={isEdit}
                                    />
                                    <span className="text-xs font-semibold text-slate-700">Auto Generate</span>
                                </label>
                                
                                {isAutoNumber ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            className="input-field max-w-xs bg-slate-50 cursor-not-allowed text-slate-500 font-mono text-xs font-bold uppercase tracking-wider"
                                            value={challanNumberPlaceholder} 
                                            disabled 
                                        />
                                        {!isEdit && (
                                            <button
                                                type="button"
                                                onClick={() => setShowNumberingConfig(prev => !prev)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 underline focus:outline-none"
                                            >
                                                {showNumberingConfig ? 'Hide Customization' : 'Customize Format'}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <input 
                                        type="text" 
                                        className="input-field max-w-xs font-mono"
                                        value={challanNumber}
                                        onChange={(e) => setChallanNumber(e.target.value)}
                                        placeholder="e.g. CHL-WT-1002"
                                        required={!isAutoNumber}
                                        disabled={isEdit}
                                    />
                                )}
                            </div>
                            
                            {showNumberingConfig && !isEdit && (
                                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3 max-w-md animate-in fade-in duration-250">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Customize Auto-Numbering Format</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prefix</label>
                                            <input 
                                                type="text" 
                                                className="input-field font-mono text-xs" 
                                                value={customPrefix}
                                                onChange={(e) => setCustomPrefix(e.target.value)}
                                                placeholder="e.g. CHL-WT-"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Next Number</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                className="input-field text-xs" 
                                                value={customNextNumber}
                                                onChange={(e) => setCustomNextNumber(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Digits (Padding)</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                max="10"
                                                className="input-field text-xs" 
                                                value={customDigits}
                                                onChange={(e) => setCustomDigits(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowNumberingConfig(false)}
                                            className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="button" 
                                            disabled={savingSettings}
                                            onClick={handleSaveNumberingConfig}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                                        >
                                            {savingSettings ? 'Saving...' : 'Save & Apply'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </InputRow>

                    <InputRow label="Challan Type" required>
                        <select
                            className="input-field max-w-xs"
                            value={challanType}
                            onChange={(e) => setChallanType(e.target.value)}
                        >
                            <option value="Supply">Supply</option>
                            <option value="Job Work">Job Work</option>
                            <option value="Returnable">Returnable</option>
                            <option value="Non-Returnable">Non-Returnable</option>
                            <option value="Others">Others</option>
                        </select>
                    </InputRow>

                    {taxSystemMode === 'OVERALL' && (
                        <InputRow label="Tax Setting" helper="Choose whether to record this challan as Tax or Tax Free">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsTaxed(true);
                                        if (taxType === 'None') setTaxType('GST');
                                    }}
                                    className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 ${isTaxed ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                >
                                    Tax
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsTaxed(false);
                                    }}
                                    className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 ${!isTaxed ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                >
                                    Tax Free
                                </button>
                            </div>
                        </InputRow>
                    )}

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


                        </>
                    )}
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
                                    <th className={`px-4 py-3 tracking-wider ${isTaxed && useProductSpecificTax ? 'w-[35%]' : 'w-[50%]'}`}>Item Details</th>
                                    <th className="px-4 py-3 w-[10%] border-l border-slate-50 tracking-wider text-right pr-4">Quantity</th>
                                    <th className="px-4 py-3 w-[15%] border-l border-slate-50 tracking-wider text-right pr-4">Rate (₹)</th>
                                    {isTaxed && useProductSpecificTax && <th className="px-4 py-3 w-[15%] border-l border-slate-50 tracking-wider text-right pr-4">Tax System</th>}
                                    <th className="px-4 py-3 w-[15%] border-l border-slate-50 tracking-wider text-right pr-4">Amount (₹)</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={isTaxed && useProductSpecificTax ? 6 : 5} className="p-12 text-center text-slate-400 font-medium italic text-sm">
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
                                                onAddNew={() => {
                                                    setActiveItemRowIdx(idx);
                                                    setShowItemModal(true);
                                                }}
                                                addNewLabel="New Item"
                                            />
                                            {item.itemId && isTaxed && !useProductSpecificTax && (
                                                <div className="text-[10px] font-bold text-slate-400 mt-1.5 px-1 uppercase tracking-tight">
                                                    Tax: {item.gstPercent}%
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 border-l border-slate-50/50">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent pr-2"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-3 border-l border-slate-50/50">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent pr-2"
                                                value={item.rate || 0}
                                                onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                            />
                                        </td>
                                        {isTaxed && useProductSpecificTax && (
                                            <td className="p-3 border-l border-slate-50/50">
                                                <select
                                                    className="w-full text-xs bg-transparent border-0 border-b border-slate-200 focus:ring-0 focus:border-blue-500 py-1"
                                                    value={item.gstPercent}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'ADD_NEW') {
                                                            setPendingItemIndex(idx);
                                                            setOpenTaxModal(true);
                                                        } else {
                                                            const rateVal = Number(e.target.value);
                                                            handleItemChange(idx, 'gstPercent', rateVal);
                                                            const matched = taxSystems.find(ts => ts.rate === rateVal && ts.status === 'Active');
                                                            if (matched) {
                                                                setTaxType(matched.name);
                                                            }
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
                                        <td className="p-3 border-l border-slate-50/50 text-right align-middle pr-4 text-sm font-semibold text-slate-700">
                                            {(Number(item.quantity || 0) * Number(item.rate || 0)).toFixed(2)}
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

                <div className="grid grid-cols-12 gap-8 mt-10 px-8 pb-10">
                    <div className="col-span-12 lg:col-span-7 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Delivery Notes</label>
                            <textarea
                                className="w-full text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 p-3 bg-slate-50/50"
                                rows="3"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Please sign upon receipt."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Terms & Conditions</label>
                            <textarea
                                className="w-full text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 p-3 bg-slate-50/50"
                                rows="3"
                                value={termsAndConditions}
                                onChange={e => setTermsAndConditions(e.target.value)}
                                placeholder="Standard terms and conditions of delivery..."
                            />
                        </div>
                        <div className="flex flex-col gap-3 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    checked={includeTerms}
                                    onChange={(e) => setIncludeTerms(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-700">Include Terms & Conditions on Challan</span>
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

                    <div className="col-span-12 lg:col-span-5 bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Challan Summary</h4>
                        <div className="space-y-2.5 mb-4 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Sub Total</span>
                                <span className="font-medium text-slate-900">₹{totals.subTotal.toFixed(2)}</span>
                            </div>
                            {isTaxed && (
                                <div className="flex flex-col text-slate-605 text-sm gap-1 pt-1">
                                    {useProductSpecificTax ? (
                                        getProductSpecificTaxBreakdown().map((row, idx) => (
                                            <div key={idx} className="flex justify-between">
                                                <span>{row.label}</span>
                                                <span className="font-medium text-slate-900">₹{row.amount.toFixed(2)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex justify-between">
                                            <span>Tax Total ({taxType} {taxRate}%)</span>
                                            <span className="font-medium text-slate-900">₹{totals.taxTotal.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {!useProductSpecificTax && taxType === 'GST' && totals.taxTotal > 0 && (
                                        <div className="text-right text-[11px] font-semibold text-slate-550 bg-slate-100/50 p-2 rounded-lg border border-slate-100 mt-1">
                                            {getGstSummaryDisplay()}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="radio"
                                            id="tdsTcsNone"
                                            name="tdsTcsType"
                                            checked={tdsTcsType === 'None'}
                                            onChange={() => {
                                                setTdsTcsType('None');
                                                setTdsPercentage(0);
                                                setTcsPercentage(0);
                                            }}
                                            className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                        />
                                        <label htmlFor="tdsTcsNone" className="text-gray-600 font-medium">None</label>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="radio"
                                            id="tds"
                                            name="tdsTcsType"
                                            checked={tdsTcsType === 'TDS'}
                                            onChange={() => {
                                                setTdsTcsType('TDS');
                                                setTdsPercentage(2);
                                                setTcsPercentage(0);
                                            }}
                                            className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                        />
                                        <label htmlFor="tds" className="text-gray-600 font-medium">TDS</label>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="radio"
                                            id="tcs"
                                            name="tdsTcsType"
                                            checked={tdsTcsType === 'TCS'}
                                            onChange={() => {
                                                setTdsTcsType('TCS');
                                                setTcsPercentage(1);
                                                setTdsPercentage(0);
                                            }}
                                            className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                        />
                                        <label htmlFor="tcs" className="text-gray-600 font-medium whitespace-nowrap">TCS</label>
                                    </div>
                                    {tdsTcsType !== 'None' && (
                                        <select
                                            className="border-slate-300 rounded text-[10px] py-0.5 px-1.5 w-18 shadow-sm text-slate-500 bg-white"
                                            value={tdsTcsType === 'TDS' ? tdsPercentage : tcsPercentage}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                if (tdsTcsType === 'TDS') {
                                                    setTdsPercentage(val);
                                                    setTcsPercentage(0);
                                                } else {
                                                    setTcsPercentage(val);
                                                    setTdsPercentage(0);
                                                }
                                            }}
                                        >
                                            <option value={0}>0%</option>
                                            <option value={1}>1%</option>
                                            <option value={2}>2%</option>
                                            <option value={5}>5%</option>
                                            <option value={10}>10%</option>
                                            <option value={18}>18%</option>
                                        </select>
                                    )}
                                </div>
                                {tdsTcsType === 'TDS' && (
                                    <span className="text-red-500 font-medium">- ₹{totals.tdsAmount.toFixed(2)}</span>
                                )}
                                {tdsTcsType === 'TCS' && (
                                    <span className="text-green-600 font-medium">+ ₹{totals.tcsAmount.toFixed(2)}</span>
                                )}
                                {tdsTcsType === 'None' && (
                                    <span className="text-slate-400 font-medium">₹0.00</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between font-bold text-slate-900 text-lg border-t border-slate-200 pt-3">
                            <span>Grand Total</span>
                            <span className="text-blue-600">₹{totals.grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50/50 border-t border-slate-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            <span className="text-red-500">*</span> Verify details before dispatching.
                        </span>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => navigate('/challans')} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="btn-primary px-8 shadow-sm">
                                {loading ? 'Saving...' : (isEdit ? 'Update Challan' : 'Save Challan')}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            <QuickCustomerModal
                isOpen={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
                onSuccess={handleCustomerCreated}
            />

            <QuickItemModal
                isOpen={showItemModal}
                onClose={() => setShowItemModal(false)}
                onSuccess={handleItemCreated}
            />

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

export default ChallanForm;
