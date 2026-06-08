import { useState, useEffect, useContext, useMemo } from 'react';
import axios from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import {
    Plus, Info, IndianRupee, TrendingUp, AlertTriangle, FileText,
    ShoppingCart, Briefcase, Calculator, PieChart, Users, Clock,
    Package, ArrowRight, ChevronRight, ChevronDown, Activity, TrendingDown, DollarSign, RefreshCw, Calendar, CheckCircle2, AlertCircle, CreditCard,
    ChevronLeft, Building2, Palette, QrCode, Image as ImageIcon, Sparkles, Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
    const { user, taxSystemMode } = useContext(AuthContext);
    const adminName = user?.name || 'Admin';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [chartFilter, setChartFilter] = useState('1y');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [chartGranularity, setChartGranularity] = useState('monthly');
    const [dynamicChartData, setDynamicChartData] = useState(null);
    const [dynamicTotals, setDynamicTotals] = useState(null);

    const taxFilter = useMemo(() => {
        if (!taxSystemMode) return 'overall';
        return taxSystemMode === 'OVERALL' ? 'overall' : (taxSystemMode === 'WITH_TAX' ? 'with_tax' : 'without_tax');
    }, [taxSystemMode]);

    const [activeTab, setActiveTab] = useState('customers'); // 'customers', 'payments', 'items', 'stock'
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [topSellingItems, setTopSellingItems] = useState([]);
    const [topSellingPeriod, setTopSellingPeriod] = useState('overall');
    const [loadingTopSelling, setLoadingTopSelling] = useState(true);
    const [salesPeriod, setSalesPeriod] = useState('this_fiscal');
    const [periodMenuOpen, setPeriodMenuOpen] = useState(false);

    // Onboarding / Welcome modal state
    const [settings, setSettings] = useState(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(1);
    const [onboardingForm, setOnboardingForm] = useState({
        companyName: '',
        email: '',
        phone: '',
        gstNumber: '',
        upiId: '',
        logoUrl: '',
        signature: '',
        address: { street: '', city: '', state: '', zipCode: '' }
    });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingSignature, setUploadingSignature] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [greetingText, setGreetingText] = useState('');

    const salesPeriodVal = useMemo(() => {
        if (!data || !data.periodSummary) return 0;
        if (salesPeriod === 'this_month') {
            return data.periodSummary.find(p => p.label === 'This Month')?.sales || 0;
        } else if (salesPeriod === 'this_year') {
            return data.periodSummary.find(p => p.label === 'This Year')?.sales || 0;
        } else if (salesPeriod === 'this_fiscal') {
            return data.periodSummary.find(p => p.label === 'This Fiscal Year')?.sales || 0;
        } else if (salesPeriod === 'last_fiscal') {
            return data.periodSummary.find(p => p.label === 'Last Fiscal Year')?.sales || 0;
        }
        return data.totalSales || 0;
    }, [data, salesPeriod]);

    useEffect(() => {
        const GREETINGS = [
            `Welcome back, ${adminName}. Ready to bill smarter?`,
            `Good to see you, ${adminName}. Let’s manage your business.`,
            `Hi ${adminName}, let’s get today’s billing done.`,
            `Welcome, ${adminName}. Your business dashboard is ready.`,
            `Hello ${adminName}, here’s your business at a glance.`,
            `Hi ${adminName}, ready to create invoices?`,
            `Welcome back, ${adminName}. Let’s track your sales.`,
            `Good morning, ${adminName}. Let’s grow your business today.`
        ];
        const randomIndex = Math.floor(Math.random() * GREETINGS.length);
        setGreetingText(GREETINGS[randomIndex]);
    }, [adminName]);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        setUploadingLogo(true);
        try {
            const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setOnboardingForm(prev => ({ ...prev, logoUrl: res.data.url }));
        } catch (err) {
            alert('Failed to upload logo. Please try again.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSignatureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        setUploadingSignature(true);
        try {
            const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setOnboardingForm(prev => ({ ...prev, signature: res.data.url }));
        } catch (err) {
            alert('Failed to upload signature. Please try again.');
        } finally {
            setUploadingSignature(false);
        }
    };

    const handleOnboardingSubmit = async (e) => {
        e.preventDefault();
        if (!onboardingForm.companyName.trim()) {
            alert('Company Name is required.');
            return;
        }
        try {
            const updatedSettings = {
                ...settings,
                ...onboardingForm,
                address: {
                    ...settings?.address,
                    ...onboardingForm.address
                }
            };
            await axios.put('/api/settings', updatedSettings);
            setShowOnboarding(false);
            sessionStorage.removeItem('justLoggedIn');
            fetchDashboardData();
        } catch (err) {
            console.error('Error saving onboarding settings', err);
            alert('Failed to save settings. Please try again.');
        }
    };

    const handleSkipOnboarding = () => {
        setShowOnboarding(false);
        sessionStorage.removeItem('justLoggedIn');
    };

    useEffect(() => {
        const checkOnboardingAndLoad = async () => {
            try {
                const res = await axios.get('/api/settings');
                const s = res.data.data;
                setSettings(s);
                setOnboardingForm({
                    companyName: s?.companyName || '',
                    email: s?.email || '',
                    phone: s?.phone || '',
                    gstNumber: s?.gstNumber || '',
                    upiId: s?.upiId || '',
                    logoUrl: s?.logoUrl || '',
                    signature: s?.signature || '',
                    address: {
                        street: s?.address?.street || '',
                        city: s?.address?.city || '',
                        state: s?.address?.state || '',
                        zipCode: s?.address?.zipCode || ''
                    }
                });

                const isJustLoggedIn = sessionStorage.getItem('justLoggedIn');
                if (isJustLoggedIn === 'true') {
                    const isNewAdmin = !s?.companyName || s.companyName.toLowerCase().includes('your company') || s.companyName === 'Prolync Book' || s.companyName === 'Prolync Billing';
                    if (isNewAdmin) {
                        setShowOnboarding(true);
                    } else {
                        setShowWelcome(true);
                    }
                }
            } catch (error) {
                console.error('Error in onboarding check', error);
            }
        };

        checkOnboardingAndLoad();
        fetchDashboardData();
        fetchActivityFeed();
    }, [taxFilter]);

    useEffect(() => {
        fetchChartData();
    }, [chartFilter, customDates, taxFilter]);

    useEffect(() => {
        fetchTopSelling(topSellingPeriod);
    }, [topSellingPeriod, taxFilter]);

    const fetchChartData = async () => {
        try {
            let url = `/api/dashboard/chart?period=${chartFilter}&taxFilter=${taxFilter}`;
            if (chartFilter === 'custom') {
                if (customDates.start && customDates.end) {
                    url += `&startDate=${customDates.start}&endDate=${customDates.end}`;
                } else {
                    return;
                }
            }
            const res = await axios.get(url);
            setDynamicChartData(res.data.data.chart);
            setDynamicTotals(res.data.data.totals);
        } catch (error) {
            console.error('Error fetching dynamic chart data', error);
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/dashboard/summary?taxFilter=${taxFilter}`);
            setData(res.data.data);
        } catch (error) {
            console.error('Error fetching dashboard summary', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityFeed = async () => {
        try {
            setLoadingActivities(true);
            const res = await axios.get(`/api/dashboard/activity?taxFilter=${taxFilter}`);
            setActivities(res.data.data || []);
        } catch (error) {
            console.error('Error fetching activity feed', error);
        } finally {
            setLoadingActivities(false);
        }
    };

    const fetchTopSelling = async (period) => {
        try {
            setLoadingTopSelling(true);
            const res = await axios.get(`/api/dashboard/top-selling?period=${period}&taxFilter=${taxFilter}`);
            setTopSellingItems(res.data.data || []);
        } catch (error) {
            console.error('Error fetching top selling items', error);
        } finally {
            setLoadingTopSelling(false);
        }
    };

    const handleDismissWelcome = () => {
        setShowWelcome(false);
        sessionStorage.removeItem('justLoggedIn');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatCurrencyShort = (value) => {
        const isNegative = value < 0;
        const absValue = Math.abs(value);
        let formatted = '';
        if (absValue >= 10000000) {
            formatted = '₹' + (absValue / 10000000).toFixed(2) + 'Cr';
        } else if (absValue >= 100000) {
            formatted = '₹' + (absValue / 100000).toFixed(2) + 'L';
        } else if (absValue >= 1000) {
            formatted = '₹' + (absValue / 1000).toFixed(1) + 'K';
        } else {
            formatted = '₹' + absValue.toFixed(0);
        }
        return isNegative ? '-' + formatted : formatted;
    };

    const formatDateAgo = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    if (loading || !data) {
        return (
            <div className="flex flex-col justify-center items-center h-96 text-slate-400 gap-4">
                <RefreshCw className="animate-spin text-violet-500" size={32} />
                <span className="font-semibold text-slate-500">Assembling financial dashboard...</span>
            </div>
        );
    }

    // Zoho Double Bar Chart options
    const doubleBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 15,
                    font: { size: 11, family: 'Inter', weight: '600' },
                    color: '#475569'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 4,
                usePointStyle: true,
                callbacks: {
                    label: (context) => ` ${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 10, family: 'Inter' },
                    callback: (value) => formatCurrencyShort(value)
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10, family: 'Inter', weight: '500' } },
                border: { display: false }
            }
        },
        barPercentage: 0.6,
        categoryPercentage: 0.7
    };

    const currentChartData = dynamicChartData?.[chartGranularity] || { labels: [], sales: [], receipts: [], expenses: [] };

    const doubleBarData = {
        labels: currentChartData.labels,
        datasets: [
            {
                label: 'Sales',
                data: currentChartData.sales,
                backgroundColor: '#3b82f6', // blue-500
                hoverBackgroundColor: '#2563eb',
                borderRadius: 5,
            },
            {
                label: 'Receipts / Cash Inflows',
                data: currentChartData.receipts,
                backgroundColor: '#10b981', // emerald-500
                hoverBackgroundColor: '#059669',
                borderRadius: 5,
            },
            {
                label: 'Expenses',
                data: currentChartData.expenses || [],
                backgroundColor: '#ef4444', // red-500
                hoverBackgroundColor: '#dc2626',
                borderRadius: 5,
            }
        ],
    };

    // Calculate Receivables Progress
    const totalReceivables = data.totalReceivables || 0;
    const currentReceivables = data.currentReceivables || 0;
    const overdueTotal = Math.max(0, totalReceivables - currentReceivables);
    const currentPercent = totalReceivables > 0 ? (currentReceivables / totalReceivables) * 100 : 0;
    const overduePercent = totalReceivables > 0 ? (overdueTotal / totalReceivables) * 100 : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Greeting Header & Insight Row */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">{greetingText || `Welcome back, ${adminName}`}</h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">


                    <Link to="/invoices/new" className="btn-primary py-2 px-4 shadow-md font-bold text-xs">
                        <Plus size={14} /> Create Invoice
                    </Link>
                </div>
            </div>

            {/* KPI Cards section (Consolidated layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Large Total Sales consolidated box */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between lg:col-span-2">
                    <div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales Volume</span>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setPeriodMenuOpen(prev => !prev)}
                                    className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none hover:bg-slate-50 cursor-pointer shadow-xs"
                                >
                                    <span>
                                        {salesPeriod === 'this_month' && 'This Month'}
                                        {salesPeriod === 'this_year' && 'This Year'}
                                        {salesPeriod === 'this_fiscal' && 'This Fiscal Year'}
                                        {salesPeriod === 'last_fiscal' && 'Last Fiscal Year'}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${periodMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {periodMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setPeriodMenuOpen(false)} />
                                        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200/85 py-1.5 z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                                            <button
                                                type="button"
                                                onClick={() => { setSalesPeriod('this_month'); setPeriodMenuOpen(false); }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${salesPeriod === 'this_month' ? 'text-blue-600 bg-blue-50/40' : 'text-slate-650'}`}
                                            >
                                                This Month
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setSalesPeriod('this_year'); setPeriodMenuOpen(false); }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${salesPeriod === 'this_year' ? 'text-blue-600 bg-blue-50/40' : 'text-slate-650'}`}
                                            >
                                                This Year
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setSalesPeriod('this_fiscal'); setPeriodMenuOpen(false); }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${salesPeriod === 'this_fiscal' ? 'text-blue-600 bg-blue-50/40' : 'text-slate-650'}`}
                                            >
                                                This Fiscal Year
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setSalesPeriod('last_fiscal'); setPeriodMenuOpen(false); }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${salesPeriod === 'last_fiscal' ? 'text-blue-600 bg-blue-50/40' : 'text-slate-650'}`}
                                            >
                                                Last Fiscal Year
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight">{formatCurrency(salesPeriodVal)}</h2>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Aggregated customer invoices, excluding draft statuses.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Received</span>
                            <span className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(data.totalReceived)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</span>
                            <span className="text-lg font-bold text-rose-600 mt-1">{formatCurrency(data.totalExpenses)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net GST Liabilities</span>
                            <span className="text-lg font-bold text-violet-600 mt-1">{formatCurrency(data.netGstPayable)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Receivable</span>
                            <span className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(totalReceivables)}</span>
                        </div>
                    </div>
                </div>

                {/* Outstanding Receivables / Payables widget */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unpaid Balance</span>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Receivables</span>
                        </div>
                        <div className="mt-4">
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(totalReceivables)}</h2>
                        </div>
                        
                        {/* Receivables Breakdown bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-4 mt-4 overflow-hidden flex">
                            {totalReceivables > 0 ? (
                                <>
                                    <div style={{ width: `${currentPercent}%` }} className="bg-violet-500 h-full" title={`Current: ${currentPercent.toFixed(1)}%`} />
                                    <div style={{ width: `${overduePercent}%` }} className="bg-amber-500 h-full" title={`Overdue: ${overduePercent.toFixed(1)}%`} />
                                </>
                            ) : (
                                <div className="w-full bg-slate-200 h-full" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-slate-55 bg-slate-50/50 p-2 rounded-lg">
                            <span className="font-semibold text-slate-500">Current (Not Past Due)</span>
                            <span className="font-bold text-slate-800">{formatCurrency(currentReceivables)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                            <span className="font-semibold text-slate-500">Overdue Liabilities</span>
                            <span className="font-bold text-amber-600">{formatCurrency(overdueTotal)}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Zoho Double Bar Chart and Margin sidebar */}
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 border-b border-slate-100 gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-violet-600 rounded-full" />
                        <h2 className="font-bold text-slate-800 tracking-tight">Sales & Receipts Comparison</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {chartFilter === 'custom' && (
                            <div className="flex items-center gap-2 text-xs">
                                <input type="date" className="border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium" value={customDates.start} onChange={e => setCustomDates({ ...customDates, start: e.target.value })} />
                                <span className="text-slate-400">to</span>
                                <input type="date" className="border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium" value={customDates.end} onChange={e => setCustomDates({ ...customDates, end: e.target.value })} />
                            </div>
                        )}
                        <select
                            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer shadow-sm"
                            value={chartFilter}
                            onChange={(e) => {
                                setChartFilter(e.target.value);
                                if (e.target.value === '1m' || e.target.value === 'custom') setChartGranularity('daily');
                                else if (e.target.value === '3m') setChartGranularity('weekly');
                                else setChartGranularity('monthly');
                            }}
                        >
                            <option value="1m">This Month</option>
                            <option value="6m">Last 6 Months</option>
                            <option value="1y">This Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    {/* Left: Zoho double bar chart */}
                    <div className="flex-1 p-6">
                        <div className="flex justify-end mb-4">
                            <div className="inline-flex bg-slate-50 p-0.5 rounded-lg border border-slate-200 shadow-sm">
                                <button onClick={() => setChartGranularity('daily')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${chartGranularity === 'daily' ? 'bg-white text-slate-800 shadow shadow-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Daily</button>
                                <button onClick={() => setChartGranularity('weekly')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${chartGranularity === 'weekly' ? 'bg-white text-slate-800 shadow shadow-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Weekly</button>
                                <button onClick={() => setChartGranularity('monthly')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${chartGranularity === 'monthly' ? 'bg-white text-slate-800 shadow shadow-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Monthly</button>
                            </div>
                        </div>
                        <div className="h-80 w-full">
                            <Bar options={doubleBarOptions} data={doubleBarData} />
                        </div>
                    </div>

                    {/* Right: Totals and margin factor */}
                    <div className="w-full lg:w-80 p-6 bg-slate-50/20 flex flex-col justify-between">
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtered Totals</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                        <span className="text-xs font-semibold text-slate-500">Total Sales</span>
                                    </div>
                                    <span className="font-extrabold text-slate-700 text-sm">{formatCurrency(dynamicTotals?.sales)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-semibold text-slate-500">Total Receipts</span>
                                    </div>
                                    <span className="font-extrabold text-slate-700 text-sm">{formatCurrency(dynamicTotals?.receipts)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                        <span className="text-xs font-semibold text-slate-500">Expenses</span>
                                    </div>
                                    <span className="font-extrabold text-slate-700 text-sm">{formatCurrency(dynamicTotals?.expenses)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Profitability Margin */}
                        <div className="mt-8 bg-violet-50/30 border border-violet-100 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-violet-700 font-bold text-xs uppercase tracking-wider">
                                <Activity size={14} />
                                Profitability Margin
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Net profit margin factor based on active performance.</p>
                            <div className="mt-3 flex items-baseline gap-1">
                                {dynamicTotals?.sales > 0 ? (
                                    <>
                                        <span className="text-2xl font-black text-slate-800">
                                            {(((dynamicTotals.sales - dynamicTotals.expenses) / dynamicTotals.sales) * 100).toFixed(1)}%
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">Margin</span>
                                    </>
                                ) : (
                                    <span className="text-lg font-bold text-slate-400">N/A</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Matrix comparison ledger table & Activity Timeline side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Comparative Matrix Ledger Table */}
                <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm lg:col-span-2">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-slate-700 rounded-full" />
                            <h2 className="font-bold text-slate-800 tracking-tight">Period Comparison Ledger</h2>
                        </div>
                        <Calendar size={16} className="text-slate-400" />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead>
                                <tr className="bg-slate-50/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    <th className="px-6 py-3.5 text-left font-bold">Period</th>
                                    <th className="px-6 py-3.5 text-right font-bold">Sales Volume</th>
                                    <th className="px-6 py-3.5 text-right font-bold">Receipts (Inflows)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                {data.periodSummary?.map((period, idx) => (
                                    <tr key={idx} className="hover:bg-slate-55 hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-700">{period.label}</td>
                                        <td className="px-6 py-4 text-right text-slate-850 font-semibold">{formatCurrency(period.sales)}</td>
                                        <td className="px-6 py-4 text-right text-emerald-600 font-semibold">+{formatCurrency(period.receipts)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Timeline activity log */}
                <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-slate-800 rounded-full" />
                                <h2 className="font-bold text-slate-800 tracking-tight">Recent Activity</h2>
                            </div>
                            <Clock size={16} className="text-slate-400" />
                        </div>

                        <div className="p-6">
                            {loadingActivities ? (
                                <div className="flex justify-center items-center py-12 text-xs text-slate-400 gap-2">
                                    <RefreshCw className="animate-spin text-slate-400" size={14} />
                                    <span>Retrieving updates...</span>
                                </div>
                            ) : activities.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-8">No recent activities found.</p>
                            ) : (
                                <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-5">
                                    {activities.slice(0, 4).map((act) => {
                                        const isInvoice = act.type === 'invoice';
                                        return (
                                            <div key={act._id} className="relative">
                                                <span className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm flex items-center justify-center
                                                    ${isInvoice ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                                                <div className="flex flex-col">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-xs font-bold text-slate-850">
                                                            {isInvoice ? `Invoice ${act.number} created` : `Payment received`}
                                                        </span>
                                                        <span className="text-[9px] font-semibold text-slate-400">
                                                            {formatDateAgo(act.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[170px]">
                                                        {act.customer} • <span className="font-bold text-slate-700">{formatCurrency(act.amount)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-6 py-3 bg-slate-50/40 border-t border-slate-100 text-center">
                        <Link to="/invoices" className="text-xs font-bold text-violet-600 hover:underline inline-flex items-center gap-1">
                            Browse All Invoices <ChevronRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>
            {/* Unified Insights Card (Top Customers, Payment Mode, Top Selling, Low Stock) */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                            <PieChart size={20} className="text-blue-600" /> Business Performance & Inventory Insights
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Real-time overview of top accounts, transactions, and stock levels.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Column 1: Top Customers */}
                    <div className="bg-slate-50/40 rounded-xl p-4.5 border border-slate-100/80 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Customers</h4>
                                    <p className="text-[10px] text-slate-400">By total billing revenue</p>
                                </div>
                            </div>
                            <div className="space-y-3 mt-3">
                                {!data.topCustomers || data.topCustomers.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">No customer data.</p>
                                ) : (
                                    data.topCustomers.slice(0, 4).map((cust, idx) => (
                                        <div key={cust._id || idx} className="flex justify-between items-center text-xs">
                                            <div className="min-w-0 pr-2">
                                                <p className="font-semibold text-slate-800 truncate">{cust.companyName || cust.name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{cust.email}</p>
                                            </div>
                                            <span className="font-bold text-slate-700 shrink-0 bg-white border border-slate-100 px-2 py-0.5 rounded-md shadow-2xs">{formatCurrencyShort(cust.totalRevenue)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Top Payment Modes */}
                    <div className="bg-slate-50/40 rounded-xl p-4.5 border border-slate-100/80 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                                    <CreditCard size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Payment Modes</h4>
                                    <p className="text-[10px] text-slate-400">Popular transaction channels</p>
                                </div>
                            </div>
                            <div className="space-y-3.5 mt-3">
                                {!data.paymentModeBreakdown || data.paymentModeBreakdown.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">No payment modes.</p>
                                ) : (
                                    data.paymentModeBreakdown.slice(0, 4).map((pm, idx) => (
                                        <div key={pm.mode || idx} className="text-xs space-y-1">
                                            <div className="flex justify-between font-semibold text-slate-800">
                                                <span className="truncate max-w-[120px]">{pm.mode} ({pm.count})</span>
                                                <span className="font-bold">{formatCurrencyShort(pm.amount)}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pm.percentage}%` }} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Top Selling Items */}
                    <div className="bg-slate-50/40 rounded-xl p-4.5 border border-slate-100/80 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                                    <ShoppingCart size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Selling Items</h4>
                                    <p className="text-[10px] text-slate-400">Most requested inventory</p>
                                </div>
                            </div>
                            <div className="space-y-3 mt-3">
                                {loadingTopSelling ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">Loading...</p>
                                ) : topSellingItems.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">No items sold.</p>
                                ) : (
                                    topSellingItems.slice(0, 4).map((item, idx) => (
                                        <div key={item._id || idx} className="flex justify-between items-center text-xs">
                                            <div className="min-w-0 pr-2">
                                                <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                                                <p className="text-[10px] text-slate-400">{item.totalQuantity} units sold</p>
                                            </div>
                                            <span className="font-bold text-slate-700 shrink-0 bg-white border border-slate-100 px-2 py-0.5 rounded-md shadow-2xs">{formatCurrencyShort(item.totalSales)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 4: Stock Alerts */}
                    <div className="bg-slate-50/40 rounded-xl p-4.5 border border-slate-100/80 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                                    <Package size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Low Stock Alerts</h4>
                                    <p className="text-[10px] text-slate-400">Restock notification alerts</p>
                                </div>
                            </div>
                            <div className="space-y-3 mt-3">
                                {!data.lowStockItems || data.lowStockItems.length === 0 ? (
                                    <p className="text-xs text-emerald-600 font-semibold py-4 text-center">All inventory healthy.</p>
                                ) : (
                                    data.lowStockItems.slice(0, 4).map((item, idx) => (
                                        <div key={item._id || idx} className="flex justify-between items-center text-xs">
                                            <div className="min-w-0 pr-2">
                                                <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                                                <p className="text-[10px] text-rose-500">Alert Limit: {item.lowStockAlert}</p>
                                            </div>
                                            <span className="font-bold text-rose-600 bg-rose-50 border border-rose-100/30 px-2 py-0.5 rounded-full text-[10px] shrink-0">{item.stockQuantity} Left</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Onboarding Wizard Modal */}
            {showOnboarding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleSkipOnboarding} />

                    {/* Modal container */}
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 animate-in zoom-in-95 duration-250 flex flex-col">
                        
                        {onboardingStep === 1 ? (
                            <>
                                {/* Step 1: Features Introduction */}
                                <div className="text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-100 mb-4 mx-auto">
                                        <Sparkles size={32} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome to Prolync Billing!</h2>
                                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                                        Let’s get your billing and ledger management up and running. Explore our powerful features:
                                    </p>
                                </div>

                                <div className="mt-6 space-y-3.5">
                                    <div className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Professional Templates & Colors</h4>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                8+ unique PDF layouts, custom accent colors, and custom terms & conditions.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                            <QrCode size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">UPI Payments & Direct QR</h4>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                Configure UPI IDs and scan codes to place automated payment QR blocks right on invoice PDFs.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                            <Truck size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Delivery Challans & Stocks</h4>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                Advanced dispatch calculators, vehicle loggers, route maps, and real-time stock guards.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        onClick={handleSkipOnboarding}
                                        className="flex-1 btn-secondary justify-center py-3 rounded-xl font-bold"
                                    >
                                        Skip for Now
                                    </button>
                                    <button
                                        onClick={() => setOnboardingStep(2)}
                                        className="flex-1 btn-primary justify-center py-3 rounded-xl font-bold"
                                    >
                                        Set Up Company
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Step 2: Company Setup Form */}
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                    <button
                                        onClick={() => setOnboardingStep(1)}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Configure Company Profile</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Step 2 of 2</p>
                                    </div>
                                </div>

                                <form onSubmit={handleOnboardingSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            className="input-field"
                                            value={onboardingForm.companyName}
                                            onChange={e => setOnboardingForm({ ...onboardingForm, companyName: e.target.value })}
                                            placeholder="e.g. Acme Corp"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Email</label>
                                            <input
                                                type="email"
                                                className="input-field"
                                                value={onboardingForm.email}
                                                onChange={e => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                                                placeholder="billing@company.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Phone</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={onboardingForm.phone}
                                                onChange={e => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                                                placeholder="+91 XXXXX XXXXX"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">GSTIN (Optional)</label>
                                            <input
                                                type="text"
                                                maxLength={15}
                                                className="input-field font-mono uppercase"
                                                value={onboardingForm.gstNumber}
                                                onChange={e => setOnboardingForm({ ...onboardingForm, gstNumber: e.target.value })}
                                                placeholder="22AAAAA0000A1Z5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">UPI ID (Optional)</label>
                                            <input
                                                type="text"
                                                className="input-field font-mono"
                                                value={onboardingForm.upiId}
                                                onChange={e => setOnboardingForm({ ...onboardingForm, upiId: e.target.value })}
                                                placeholder="e.g. acme@upi"
                                            />
                                        </div>
                                    </div>

                                    {/* Logo & Signature uploaders */}
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Company Logo</label>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-16 h-16 border border-dashed border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                                    {onboardingForm.logoUrl ? (
                                                        <img src={onboardingForm.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                                                    ) : (
                                                        <ImageIcon size={18} className="text-slate-300" />
                                                    )}
                                                    {uploadingLogo && (
                                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                            <div className="w-4.5 h-4.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <label className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors">
                                                    Upload
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Signature</label>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-16 h-12 border border-dashed border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                                    {onboardingForm.signature ? (
                                                        <img src={onboardingForm.signature} alt="Sign" className="max-w-full max-h-full object-contain p-1" />
                                                    ) : (
                                                        <ImageIcon size={18} className="text-slate-300" />
                                                    )}
                                                    {uploadingSignature && (
                                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                            <div className="w-4.5 h-4.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <label className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors">
                                                    Upload
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} disabled={uploadingSignature} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex gap-3 pt-4 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={handleSkipOnboarding}
                                            className="flex-1 btn-secondary justify-center py-2.5 rounded-xl font-bold"
                                        >
                                            Skip for Now
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 btn-primary justify-center py-2.5 rounded-xl font-bold"
                                        >
                                            Finish Setup
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Login Welcome Modal */}
            {showWelcome && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleDismissWelcome} />

                    {/* Modal container */}
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 md:p-8 animate-in zoom-in-95 duration-250 flex flex-col items-center text-center">
                        {/* Visual Icon Header */}
                        <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-lg shadow-violet-100 mb-4">
                            <CheckCircle2 size={32} />
                        </div>

                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Welcome to Prolync Billing!</h2>
                        <p className="text-xs text-slate-400 mt-1">Here is a quick overview to get you started on your business ledger portal.</p>

                        {/* Instruction notes */}
                        <div className="w-full mt-6 space-y-3.5 text-left">
                            <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="w-5 h-5 rounded bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700">Digital Invoice Creation</h4>
                                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">
                                        Draft invoices with product-specific GST rates, include custom terms & conditions, and email secure sharing links directly to clients.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="w-5 h-5 rounded bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700">Subscription Status</h4>
                                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">
                                        View and track your account subscription dates or manage profile details anytime from <strong>Settings &rarr; Subscription Plan</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="w-5 h-5 rounded bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700">Templates & Visual Branding</h4>
                                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">
                                        Choose from 8 professional invoice layouts, customize brand colors, add company logos, and upload authorized signatures to personalize your client bills.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={handleDismissWelcome}
                            className="w-full btn-primary py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-violet-500/20 mt-6 justify-center"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;
