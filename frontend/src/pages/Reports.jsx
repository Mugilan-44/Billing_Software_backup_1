import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { BarChart3, Download, Filter, Calendar, FileText, TrendingUp, IndianRupee, AlertCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import html2pdf from 'html2pdf.js';

// ── Column definitions per report type ──────────────────────────────────────────
const SALES_COLUMNS = [
    { key: 'invoiceNumber', label: 'Invoice No', render: v => <span className="font-mono font-bold text-slate-900">{v}</span> },
    { key: 'customerName',  label: 'Customer' },
    { key: 'date',          label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '-' },
    { key: 'subTotal',      label: 'Sub Total', render: v => <span className="font-bold text-slate-900">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'tax',           label: 'Tax', render: v => <span>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'grandTotal',    label: 'Grand Total', render: v => <span className="font-bold text-blue-700">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'amountPaid',    label: 'Received', render: v => <span className="text-emerald-600 font-semibold">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'balanceDue',    label: 'Balance Due', render: (v, row) => {
        const bal = Number(v || 0) || Math.max(0, Number(row.grandTotal || 0) - Number(row.amountPaid || 0));
        return <span className={`font-bold ${bal > 0 ? 'text-red-500' : 'text-emerald-600'}`}>₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>;
    }},
    { key: 'status', label: 'Status', render: v => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
            v === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            v === 'Draft' ? 'bg-slate-100 text-slate-600' :
            'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>{v}</span>
    )},
];

const GST_COLUMNS = [
    { key: 'invoiceNumber', label: 'Invoice No', render: v => <span className="font-mono font-bold">{v}</span> },
    { key: 'customerName',  label: 'Customer' },
    { key: 'date',          label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '-' },
    { key: 'taxableValue',  label: 'Taxable Value', render: v => <span>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'cgst',          label: 'CGST', render: v => <span>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'sgst',          label: 'SGST', render: v => <span>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'igst',          label: 'IGST', render: v => <span>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'totalTax',      label: 'Total Tax', render: v => <span className="font-bold text-indigo-700">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
];

const AGING_COLUMNS = [
    { key: 'customerName',       label: 'Customer', render: v => <span className="font-bold text-slate-900">{v}</span> },
    { key: 'bucket_0_30',        label: '0-30 Days', render: v => <span className="text-emerald-600 font-semibold">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'bucket_31_60',       label: '31-60 Days', render: v => <span className="text-amber-600 font-semibold">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'bucket_61_90',       label: '61-90 Days', render: v => <span className="text-orange-600 font-semibold">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'bucket_90_plus',     label: '90+ Days', render: v => <span className="text-red-600 font-bold">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'totalOutstanding',   label: 'Total Outstanding', render: v => <span className="font-black text-red-700">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
];

const SALES_BY_CUSTOMER_COLUMNS = [
    { key: 'customerName', label: 'Customer', render: v => <span className="font-bold text-slate-900">{v}</span> },
    { key: 'invoiceCount', label: 'Invoice Count' },
    { key: 'subTotal', label: 'Sub Total', render: v => <span>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'taxAmount', label: 'Tax Amount', render: v => <span>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'totalSales', label: 'Total Sales', render: v => <span className="font-black text-blue-700">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> }
];

const SALES_BY_ITEMS_COLUMNS = [
    { key: 'itemName', label: 'Item Name', render: v => <span className="font-bold text-slate-900">{v}</span> },
    { key: 'invoiceCount', label: 'Invoice Count' },
    { key: 'quantitySold', label: 'Quantity Sold' },
    { key: 'totalSales', label: 'Total Sales', render: v => <span className="font-black text-blue-700">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> }
];

const SALES_BY_SALESPERSON_COLUMNS = [
    { key: 'salesPerson', label: 'Sales Person', render: v => <span className="font-bold text-slate-900">{v}</span> },
    { key: 'invoiceCount', label: 'Invoice Count' },
    { key: 'subTotal', label: 'Sub Total', render: v => <span>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { key: 'totalSales', label: 'Total Sales', render: v => <span className="font-black text-blue-700">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> }
];

const PAYMENTS_RECEIVED_COLUMNS = [
    { key: 'paymentNumber', label: 'Payment No', render: v => <span className="font-mono font-bold text-slate-900">{v}</span> },
    { key: 'date', label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '-' },
    { key: 'customerName', label: 'Customer' },
    { key: 'invoiceNumber', label: 'Invoice No', render: v => <span className="font-mono">{v}</span> },
    { key: 'mode', label: 'Payment Mode' },
    { key: 'reference', label: 'Reference' },
    { key: 'amount', label: 'Amount', render: v => <span className="text-emerald-600 font-bold">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> }
];

const EXPENSES_DETAILS_COLUMNS = [
    { key: 'date', label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '-' },
    { key: 'category', label: 'Category' },
    { key: 'vendorName', label: 'Vendor' },
    { key: 'customerName', label: 'Customer' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'reference', label: 'Reference' },
    { key: 'notes', label: 'Notes' },
    { key: 'amount', label: 'Amount', render: v => <span className="font-bold text-red-500">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> }
];

const EXPENSES_BY_CATEGORY_COLUMNS = [
    { key: 'category', label: 'Category', render: v => <span className="font-bold text-slate-900">{v}</span> },
    { key: 'count', label: 'Expenses Count' },
    { key: 'totalExpense', label: 'Total Expense', render: v => <span className="font-bold text-red-500">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> }
];

const EXPENSES_BY_CUSTOMER_COLUMNS = [
    { key: 'customerName', label: 'Customer', render: v => <span className="font-bold text-slate-900">{v}</span> },
    { key: 'count', label: 'Expenses Count' },
    { key: 'totalExpense', label: 'Total Expense', render: v => <span className="font-bold text-red-500">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> }
];

const TAX_COLUMNS = [
    { key: 'name', label: 'Tax Component', render: v => <span className="font-bold text-slate-900">{v}</span> },
    { key: 'amount', label: 'Amount Collected/Payable', render: v => <span className="font-bold text-indigo-700">₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> }
];

// ── Normalizer: map API response fields to column keys ──────────────────────────
const normalizeSalesRow = (row) => ({
    invoiceNumber: row.invoiceNumber,
    customerName: row.customerName || row.customerId?.companyName || row.customerId?.displayName || '-',
    date: row.date,
    subTotal: row.subTotal ?? row.subtotal,
    tax: row.taxAmount ?? row.totalTax ?? (row.taxTotal?.totalTax ?? 0),
    grandTotal: row.grandTotal,
    amountPaid: row.amountPaid,
    balanceDue: row.balanceDue ?? row.balance,
    status: row.status,
});

const normalizeGSTRow = (row) => ({
    invoiceNumber: row.invoiceNumber,
    customerName: row.customerName || row.customerId?.companyName || '-',
    date: row.date,
    taxableValue: row.taxableValue ?? row.taxableAmount ?? row.subTotal,
    cgst: row.cgst ?? row.taxTotal?.cgst ?? 0,
    sgst: row.sgst ?? row.taxTotal?.sgst ?? 0,
    igst: row.igst ?? row.taxTotal?.igst ?? 0,
    totalTax: row.totalTax ?? row.taxAmount ?? row.taxTotal?.totalTax ?? 0,
});

const normalizeAgingRow = (row) => ({
    customerName: row.customerName || row.companyName || row._id || '-',
    bucket_0_30: row['0-30'] ?? row.bucket_0_30 ?? row.agingBuckets?.['0-30'] ?? 0,
    bucket_31_60: row['31-60'] ?? row.bucket_31_60 ?? row.agingBuckets?.['31-60'] ?? 0,
    bucket_61_90: row['61-90'] ?? row.bucket_61_90 ?? row.agingBuckets?.['61-90'] ?? 0,
    bucket_90_plus: row['90+'] ?? row.bucket_90_plus ?? row.agingBuckets?.['90+'] ?? 0,
    totalOutstanding: row.totalOutstanding ?? row.outstandingBalance ?? row.outstanding ?? 0,
});

const DYNAMIC_REPORTS = [
    'sales_by_customer',
    'sales_by_items',
    'sales_by_salesperson',
    'payments_received',
    'expenses_details',
    'expenses_by_category',
    'expenses_by_customer',
    'tax'
];

const Reports = () => {
    const { user } = useContext(AuthContext);
    const [reportType, setReportType] = useState('sales');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [rawData, setRawData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    const getColumns = () => {
        if (reportType === 'sales') return SALES_COLUMNS;
        if (reportType === 'gst') return GST_COLUMNS;
        if (reportType === 'aging') return AGING_COLUMNS;
        if (reportType === 'sales_by_customer') return SALES_BY_CUSTOMER_COLUMNS;
        if (reportType === 'sales_by_items') return SALES_BY_ITEMS_COLUMNS;
        if (reportType === 'sales_by_salesperson') return SALES_BY_SALESPERSON_COLUMNS;
        if (reportType === 'payments_received') return PAYMENTS_RECEIVED_COLUMNS;
        if (reportType === 'expenses_details') return EXPENSES_DETAILS_COLUMNS;
        if (reportType === 'expenses_by_category') return EXPENSES_BY_CATEGORY_COLUMNS;
        if (reportType === 'expenses_by_customer') return EXPENSES_BY_CUSTOMER_COLUMNS;
        if (reportType === 'tax') return TAX_COLUMNS;
        return [];
    };

    const getNormalizedData = () => {
        if (!Array.isArray(rawData) || rawData.length === 0) return [];
        if (reportType === 'sales') return rawData.map(normalizeSalesRow);
        if (reportType === 'gst') return rawData.map(normalizeGSTRow);
        if (reportType === 'aging') return rawData.map(normalizeAgingRow);
        return rawData; // pass through for dynamic aggregated tables
    };

    const fetchReport = async () => {
        setLoading(true);
        setSummary(null);
        setRawData([]);
        setError('');
        try {
            const isDynamic = DYNAMIC_REPORTS.includes(reportType);
            let url = isDynamic ? `/api/reports/dynamic/${reportType}` : `/api/reports/${reportType}`;
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await axios.get(url);
            const responseData = res.data.data;

            if (isDynamic) {
                setRawData(responseData || []);
            } else if (reportType === 'sales') {
                setRawData(responseData.invoices || responseData || []);
                setSummary(responseData.summary || null);
            } else if (reportType === 'gst') {
                setRawData(responseData.transactions || responseData.invoices || responseData || []);
                setSummary({
                    totalOutputGst: responseData.totalOutputGst,
                    totalInputGst: responseData.totalInputGst,
                    netLiability: responseData.netLiability,
                    cgstCollected: responseData.cgstCollected,
                    sgstCollected: responseData.sgstCollected,
                    igstCollected: responseData.igstCollected,
                });
            } else if (reportType === 'aging') {
                setRawData(Array.isArray(responseData) ? responseData : (responseData.customers || []));
            }
        } catch (err) {
            console.error('Error fetching report', err);
            setError(err.response?.data?.message || 'Failed to fetch report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line
    }, [reportType]);

    const handleGenerate = (e) => {
        e.preventDefault();
        fetchReport();
    };

    const handleExportCSV = () => {
        const data = getNormalizedData();
        const cols = getColumns();
        if (data.length === 0) return;

        const headers = cols.map(c => c.label);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = cols.map(c => {
                const val = row[c.key] ?? '';
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
        setDownloadingPdf(true);
        const orientation = ['sales', 'gst', 'payments_received', 'expenses_details'].includes(reportType)
            ? 'landscape'
            : 'portrait';
        const element = document.getElementById('pdf-report-template');
        const opt = {
            margin:       0.3,
            filename:     `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'in', format: 'letter', orientation: orientation }
        };

        html2pdf()
            .set(opt)
            .from(element)
            .save()
            .then(() => {
                setDownloadingPdf(false);
            })
            .catch(err => {
                console.error('PDF generation error', err);
                setDownloadingPdf(false);
            });
    };

    const data = getNormalizedData();
    const columns = getColumns();

    return (
        <div className="max-w-7xl mx-auto mb-12 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business Reports</h1>
                        <p className="text-sm text-slate-500">Data analytics, insights and compliance exports</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        disabled={data.length === 0}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                            data.length === 0
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95 shadow-sm'
                        }`}
                    >
                        <Download size={16} /> Export CSV
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={data.length === 0 || downloadingPdf}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                            data.length === 0 || downloadingPdf
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-100'
                        }`}
                    >
                        {downloadingPdf ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Download size={16} />
                        )}
                        {downloadingPdf ? 'Generating...' : 'Download PDF'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Report Type</label>
                        <select
                            className="input-field w-full font-bold text-slate-700"
                            value={reportType}
                            onChange={e => setReportType(e.target.value)}
                        >
                            <optgroup label="Sales Reports">
                                <option value="sales">Sales & Revenue</option>
                                <option value="sales_by_customer">Sales by Customer</option>
                                <option value="sales_by_items">Sales by Items</option>
                                <option value="sales_by_salesperson">Sales by Sales Person</option>
                            </optgroup>
                            <optgroup label="Payment Reports">
                                <option value="payments_received">Payments Received</option>
                            </optgroup>
                            <optgroup label="Expense Reports">
                                <option value="expenses_details">Expenses Details</option>
                                <option value="expenses_by_category">Expenses by Category</option>
                                <option value="expenses_by_customer">Expenses by Customer</option>
                            </optgroup>
                            <optgroup label="Tax & Aging">
                                <option value="gst">GST Output Report</option>
                                <option value="tax">Tax Collected Summary</option>
                                <option value="aging">Outstanding Aging</option>
                            </optgroup>
                        </select>
                    </div>
                    {reportType !== 'aging' && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">From Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input type="date" className="input-field pl-9 w-full" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">To Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input type="date" className="input-field pl-9 w-full" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                        </>
                    )}
                    <div className={reportType === 'aging' ? 'md:col-start-4' : ''}>
                        <button type="submit" className="w-full btn-primary bg-blue-600 hover:bg-blue-700 h-[42px] flex items-center justify-center gap-2 border-blue-600 shadow-lg shadow-blue-200">
                            <Filter size={16} /> Generate Report
                        </button>
                    </div>
                </form>
            </div>

            {/* Summary Cards – Sales */}
            {summary && reportType === 'sales' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Revenue', value: summary.totalRevenue, color: 'text-slate-900', icon: TrendingUp },
                        { label: 'Total GST Collected', value: summary.totalTax, color: 'text-blue-700', icon: IndianRupee },
                        { label: 'Total Received', value: summary.totalReceived, color: 'text-emerald-600', icon: IndianRupee },
                        { label: 'Total Outstanding', value: summary.totalPending, color: 'text-red-500', icon: AlertCircle },
                    ].map(({ label, value, color, icon: Icon }) => (
                        <div key={label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
                            <h3 className={`text-xl font-black leading-none mt-1 ${color}`}>
                                ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary Cards – GST */}
            {summary && reportType === 'gst' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total GST Collected</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">₹{Number(summary.totalOutputGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        <p className="text-xs text-slate-400 mt-1">CGST: ₹{Number(summary.cgstCollected || 0).toFixed(2)} | SGST: ₹{Number(summary.sgstCollected || 0).toFixed(2)} | IGST: ₹{Number(summary.igstCollected || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Input Tax Credit (ITC)</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">₹{Number(summary.totalInputGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Net GST Liability</p>
                        <h3 className={`text-2xl font-black mt-1 ${Number(summary.netLiability || 0) >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            ₹{Number(summary.netLiability || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{Number(summary.netLiability || 0) >= 0 ? 'Payable to Govt.' : 'Tax Credit Available'}</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Generating report...</span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">No data found</h3>
                            <p className="text-sm text-slate-400 mt-1">Try adjusting filters or date range.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    {columns.map((col, i) => (
                                        <th key={i} className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                                        {columns.map((col, cIdx) => (
                                            <td key={cIdx} className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                                                {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {data.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 font-medium">
                        Showing {data.length} record{data.length !== 1 ? 's' : ''}
                        {(startDate || endDate) && ` for period ${startDate || '...'} to ${endDate || '...'}`}
                    </div>
                )}
            </div>

            {/* PDF print template */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div id="pdf-report-template" className="bg-white p-8 text-slate-800 font-sans" style={{ width: ['sales', 'gst', 'payments_received', 'expenses_details'].includes(reportType) ? '1050px' : '800px', fontFamily: 'Inter, sans-serif' }}>
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                {user?.companyId?.businessName || user?.companyId?.name || 'Prolync Billing'}
                            </h1>
                            {user?.companyId?.address && (
                                <p className="text-xs text-slate-500 font-medium">
                                    {[
                                        user.companyId.address.street,
                                        user.companyId.address.city,
                                        user.companyId.address.state,
                                        user.companyId.address.zipCode
                                    ].filter(Boolean).join(', ')}
                                </p>
                            )}
                            {user?.companyId?.gstNumber && (
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                    GSTIN: {user.companyId.gstNumber}
                                </p>
                            )}
                            <div className="mt-4">
                                <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                                    {reportType.replace(/_/g, ' ')} Report
                                </h2>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    Generated on {new Date().toLocaleDateString('en-IN')}
                                </p>
                                {(startDate || endDate) && (
                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                        Period: {startDate ? new Date(startDate).toLocaleDateString('en-IN') : 'Beginning'} to {endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'Present'}
                                    </p>
                                )}
                            </div>
                        </div>
                        {user?.companyId?.logoUrl ? (
                            <img src={user.companyId.logoUrl} alt="Logo" className="h-16 w-auto object-contain bg-slate-50 p-1 border border-slate-200 rounded-xl" />
                        ) : (
                            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl border border-blue-100">
                                {(user?.companyId?.businessName || user?.companyId?.name || 'Prolync').slice(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Summary Cards – Sales */}
                    {summary && reportType === 'sales' && (
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            {[
                                { label: 'Total Revenue', value: summary.totalRevenue },
                                { label: 'Total GST Collected', value: summary.totalTax },
                                { label: 'Total Received', value: summary.totalReceived },
                                { label: 'Total Outstanding', value: summary.totalPending },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">{label}</p>
                                    <h4 className="text-sm font-black text-slate-900">
                                        ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </h4>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Summary Cards – GST */}
                    {summary && reportType === 'gst' && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total GST Collected</p>
                                <h4 className="text-sm font-black text-slate-900 mt-1">₹{Number(summary.totalOutputGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                                <p className="text-[9px] text-slate-400 mt-0.5">CGST: ₹{Number(summary.cgstCollected || 0).toFixed(2)} | SGST: ₹{Number(summary.sgstCollected || 0).toFixed(2)} | IGST: ₹{Number(summary.igstCollected || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Input Tax Credit (ITC)</p>
                                <h4 className="text-sm font-black text-slate-900 mt-1">₹{Number(summary.totalInputGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Net GST Liability</p>
                                <h4 className="text-sm font-black text-slate-900 mt-1">₹{Number(summary.netLiability || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                                {columns.map((col, i) => (
                                    <th key={i} className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-slate-100" style={{ pageBreakInside: 'avoid' }}>
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} className="px-3 py-2 text-xs text-slate-600">
                                            {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                        © {new Date().getFullYear()} {user?.companyId?.businessName || user?.companyId?.name || 'Prolync Software Inc'}. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
