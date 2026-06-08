import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Package, Save, Info, User, Calendar } from 'lucide-react';
import SearchableDropdown from '../components/SearchableDropdown';
import QuickVendorModal from '../components/QuickVendorModal';
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

    // Form State
    const { taxSystemMode } = useContext(AuthContext);
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

    const [taxMode, setTaxMode] = useState('WITH_TAX');
    const [isAutoNumber, setIsAutoNumber] = useState(true);
    const [billNumber, setBillNumber] = useState('');
    const [companySettings, setCompanySettings] = useState(null);
    const [billNumberPlaceholder, setBillNumberPlaceholder] = useState('PB-0000X');

    // Numbering Customization States
    const [showNumberingConfig, setShowNumberingConfig] = useState(false);
    const [customPrefix, setCustomPrefix] = useState('');
    const [customNextNumber, setCustomNextNumber] = useState(1);
    const [customDigits, setCustomDigits] = useState(4);
    const [savingSettings, setSavingSettings] = useState(false);

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

    const [totals, setTotals] = useState({ subTotal: 0, taxTotal: 0, tdsAmount: 0, tcsAmount: 0, grandTotal: 0 });

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
            updatedItems[pendingItemIndex].gstPercentage = rateVal;
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
                const [vendorRes, itemRes, settingsRes] = await Promise.all([
                    axios.get('/api/vendors'),
                    axios.get('/api/items'),
                    axios.get('/api/settings')
                ]);
                setVendors(vendorRes.data.data);
                setCatalogItems(itemRes.data.data);
                setCompanySettings(settingsRes.data.data);

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
                    setBillNumberPlaceholder(data.billNumber || '');
                    setBillNumber(data.billNumber || '');
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
        if (isEdit || !companySettings) return;
        const numbering = companySettings.numberingSettings?.purchaseBill;
        const modeSettings = taxMode === 'WITH_TAX' ? numbering?.withTax : numbering?.withoutTax;
        
        if (modeSettings) {
            setIsAutoNumber(modeSettings.auto);
            const prefix = modeSettings.prefix || '';
            const nextNum = modeSettings.nextNumber || 1;
            const digits = modeSettings.digits || 4;
            setBillNumberPlaceholder(`${prefix}${String(nextNum).padStart(digits, '0')}`);
            setBillNumber(`${prefix}${String(nextNum).padStart(digits, '0')}`);
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
                purchaseBill: {
                    ...companySettings.numberingSettings?.purchaseBill,
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
                    const amount = (i.quantity || 0) * (i.rate || 0);
                    const rate = Number(i.gstPercentage || 0);
                    if (rate > 0) {
                        const itemTax = amount * (rate / 100);
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

    useEffect(() => {
        let sub = 0;
        let tax = 0;
        items.forEach(i => {
            const amount = i.quantity * i.rate;
            const currentTaxRate = isTaxed
                ? (useProductSpecificTax ? (i.gstPercentage || 0) : (taxRate !== undefined && taxRate !== '' ? Number(taxRate) : (i.gstPercentage || 0)))
                : 0;
            const t = amount * (currentTaxRate / 100);
            sub += amount;
            tax += t;
        });

        let tdsAmount = 0;
        let tcsAmount = 0;
        if (tdsTcsType === 'TDS') {
            tdsAmount = sub * (tdsPercentage / 100);
        } else if (tdsTcsType === 'TCS') {
            tcsAmount = sub * (tcsPercentage / 100);
        }

        setTotals({
            subTotal: sub,
            taxTotal: tax,
            tdsAmount,
            tcsAmount,
            grandTotal: Math.round(sub + tax - Number(discount) - tdsAmount + tcsAmount),
        });
    }, [items, discount, isTaxed, taxRate, useProductSpecificTax, tdsTcsType, tdsPercentage, tcsPercentage]);

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
            if (!item.itemId) return;
            const qty = item.quantity || 0;
            const rate = item.rate || 0;
            const taxableAmount = qty * rate;
            
            const taxRate = Number(item.gstPercentage || 0);
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
            billNumber: isAutoNumber ? undefined : billNumber,
            taxMode,
            billDate,
            date: billDate,
            dueDate: dueDate || undefined,
            items: items.map(i => ({
                itemId: i.itemId || undefined,
                name: i.name,
                quantity: i.quantity,
                rate: i.rate,
                gstPercentage: isTaxed ? (useProductSpecificTax ? Number(i.gstPercentage || 0) : (taxRate !== undefined && taxRate !== '' ? Number(taxRate) : i.gstPercentage)) : 0
            })),
            lineItems: items.map(i => ({
                itemId: i.itemId || undefined,
                name: i.name,
                quantity: i.quantity,
                rate: i.rate,
                gstPercent: isTaxed ? (useProductSpecificTax ? Number(i.gstPercentage || 0) : (taxRate !== undefined && taxRate !== '' ? Number(taxRate) : i.gstPercentage)) : 0
            })),
            discount: Number(discount),
            notes,
            includeTerms,
            includeSignature,
            includeBankDetails,
            includeUpiQr,
            isTaxed,
            taxType: isTaxed ? taxType : 'None',
            taxRate: isTaxed ? (useProductSpecificTax ? null : Number(taxRate)) : 0,
            useProductSpecificTax,
            tdsTcsType,
            tdsPercentage: tdsTcsType === 'TDS' ? Number(tdsPercentage) : 0,
            tcsPercentage: tdsTcsType === 'TCS' ? Number(tcsPercentage) : 0
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
                                const vend = vendors.find(v => v.companyName === name);
                                if (vend) setVendorId(vend._id);
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



                    <InputRow label="Bill Number" required>
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
                                            value={billNumberPlaceholder} 
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
                                        value={billNumber}
                                        onChange={(e) => setBillNumber(e.target.value)}
                                        placeholder="e.g. PB-WT-1002"
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
                                                placeholder="e.g. PB-WT-"
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

                    {taxSystemMode === 'OVERALL' && (
                        <InputRow label="Tax Setting" helper="Choose whether to record this bill as Tax or Tax Free">
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
                {/* Purchased Items Table */}
                <div className="border border-slate-200 rounded-lg bg-white mt-8 mx-8">
                    <div className="bg-slate-50/50 text-slate-800 font-bold text-xs px-4 py-3 border-b border-slate-200 uppercase tracking-wider">
                        Purchased Items (Inventory Inward)
                    </div>

                    <div className="overflow-visible">
                        <table className="w-full text-left table-fixed">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                    <th className={`px-4 py-3 tracking-wider ${isTaxed && useProductSpecificTax ? 'w-[35%]' : 'w-[50%]'}`}>Item Details</th>
                                    <th className="px-4 py-3 w-[10%] border-l border-slate-50 tracking-wider text-right pr-4">Qty</th>
                                    <th className="px-4 py-3 w-[15%] border-l border-slate-50 tracking-wider text-right pr-4">Rate (₹)</th>
                                    {isTaxed && useProductSpecificTax && <th className="px-4 py-3 w-[15%] border-l border-slate-50 tracking-wider text-right pr-4">Tax System</th>}
                                    <th className="px-4 py-3 w-[15%] border-l border-slate-50 tracking-wider text-right pr-4">Amount (₹)</th>
                                    <th className="w-12"></th>
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
                                            {item.itemId && isTaxed && !useProductSpecificTax && (
                                                <div className="text-[10px] font-bold text-slate-400 mt-1.5 px-1 uppercase tracking-tight">
                                                    Tax: {item.gstPercentage}%
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 border-l border-slate-50/50">
                                            <input type="number" min="1" className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} />
                                        </td>
                                        <td className="p-3 border-l border-slate-50/50">
                                            <div className="relative">
                                                <span className="absolute left-0 top-1 text-slate-400 text-xs">₹</span>
                                                <input type="number" min="0" step="0.01" className="w-full text-sm border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 text-right p-1 bg-transparent pl-4" value={item.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} />
                                            </div>
                                        </td>
                                        {isTaxed && useProductSpecificTax && (
                                            <td className="p-3 border-l border-slate-50/50">
                                                <select
                                                    className="w-full text-xs bg-transparent border-0 border-b border-slate-200 focus:ring-0 focus:border-blue-500 py-1"
                                                    value={item.gstPercentage}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'ADD_NEW') {
                                                            setPendingItemIndex(idx);
                                                            setOpenTaxModal(true);
                                                        } else {
                                                            const rateVal = Number(e.target.value);
                                                            handleItemChange(idx, 'gstPercentage', rateVal);
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
                                {isTaxed && (
                                    <div className="flex flex-col text-slate-650 text-sm gap-1 pt-1">
                                        {useProductSpecificTax ? (
                                            getProductSpecificTaxBreakdown().map((row, idx) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span>{row.label}</span>
                                                    <span className="text-slate-900 font-bold">₹{row.amount.toFixed(2)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex justify-between">
                                                <span>{taxType === 'GST' ? 'GST Total' : 'Tax Total'} ({taxType} {taxRate}%)</span>
                                                <span className="text-slate-900 font-bold">₹{totals.taxTotal.toFixed(2)}</span>
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

                                <div className="flex justify-between items-center text-sm opacity-50">
                                    <span className="text-slate-400 italic">Round Off</span>
                                    <span className="text-slate-600">₹{(totals.grandTotal - (totals.subTotal + totals.taxTotal - Number(discount) - totals.tdsAmount + totals.tcsAmount)).toFixed(2)}</span>
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

export default PurchaseBillForm;
