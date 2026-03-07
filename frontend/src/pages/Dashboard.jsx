import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Info, IndianRupee, TrendingUp, AlertTriangle, FileText, ShoppingCart, Briefcase, Calculator, PieChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [chartFilter, setChartFilter] = useState('1y');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [chartGranularity, setChartGranularity] = useState('monthly');
    const [dynamicChartData, setDynamicChartData] = useState(null);
    const [dynamicTotals, setDynamicTotals] = useState(null);

    useEffect(() => { fetchDashboardData(); }, []);

    useEffect(() => {
        fetchChartData();
    }, [chartFilter, customDates]);

    const fetchChartData = async () => {
        try {
            let url = `/api/dashboard/chart?period=${chartFilter}`;
            if (chartFilter === 'custom') {
                if (customDates.start && customDates.end) {
                    url += `&startDate=${customDates.start}&endDate=${customDates.end}`;
                } else {
                    return; // Wait until both dates are set
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
            const res = await axios.get('/api/dashboard/summary');
            setData(res.data.data);
        } catch (error) {
            console.error('Error fetching dashboard summary', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
        }).format(amount || 0);
    };

    if (loading || !data) {
        return <div className="flex justify-center items-center h-64 text-slate-400">Loading metrics...</div>;
    }

    // Chart Configuration
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 10,
                boxPadding: 4,
                usePointStyle: true
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f8fafc',
                    drawBorder: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 10 },
                    callback: (value) => {
                        if (value >= 1000) return (value / 1000) + 'K';
                        return value;
                    }
                },
                border: { display: false }
            },
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: '#94a3b8', font: { size: 10 } },
                border: { display: false }
            }
        },
        barPercentage: 0.6,
        categoryPercentage: 0.8
    };

    const currentChartData = dynamicChartData?.[chartGranularity] || { labels: [], sales: [], receipts: [], expenses: [] };

    const chartData = {
        labels: currentChartData.labels,
        datasets: [
            {
                label: 'Sales',
                data: currentChartData.sales,
                backgroundColor: '#3b82f6', // blue-500
                borderRadius: 2,
            },
            {
                label: 'Receipts',
                data: currentChartData.receipts,
                backgroundColor: '#22c55e', // green-500
                borderRadius: 2,
            },
            {
                label: 'Expenses',
                data: currentChartData.expenses,
                backgroundColor: '#f97316', // orange-500
                borderRadius: 2,
            }
        ],
    };

    // Calculate Receivables Progress Bar
    const totalReceivables = data.totalReceivables || 0;
    const currentReceivables = data.currentReceivables || 0;
    const overdueTotal = totalReceivables - currentReceivables;

    const currentPercent = totalReceivables > 0 ? (currentReceivables / totalReceivables) * 100 : 0;
    const overduePercent = totalReceivables > 0 ? (overdueTotal / totalReceivables) * 100 : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
                <Link to="/invoices/new" className="btn-primary flex items-center">
                    <FileText size={18} className="mr-2" />
                    New Invoice
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card border-l-4 border-l-primary-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Sales</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(data.totalSales)}</h3>
                        </div>
                        <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Purchases</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(data.totalPurchases)}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <ShoppingCart size={24} />
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Receivables</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(data.totalReceivables)}</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <IndianRupee size={24} />
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-orange-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Payables</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(data.totalPayables)}</h3>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <Briefcase size={24} />
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(data.totalExpenses)}</h3>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Calculator size={24} />
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-teal-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Net GST</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(data.netGstPayable)}</h3>
                        </div>
                        <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                            <PieChart size={24} />
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-red-500 lg:col-span-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Low Stock Alerts</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{data.lowStockItems} Items require attention</h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Total Receivables Widget */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-medium text-slate-800">Total Receivables</h2>
                    <Link to="/invoices/new" className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1">
                        <Plus size={16} /> New
                    </Link>
                </div>

                <div className="p-6">
                    <p className="text-sm text-slate-500 mb-2">Total Receivables <span className="font-medium text-slate-700">{formatCurrency(totalReceivables)}</span></p>

                    {/* Progress Bar */}
                    <div className="h-4 w-full rounded-md overflow-hidden flex bg-slate-100 mb-8">
                        {totalReceivables > 0 ? (
                            <>
                                <div style={{ width: `${currentPercent}%` }} className="bg-blue-500 h-full transition-all duration-500"></div>
                                <div style={{ width: `${overduePercent}%` }} className="bg-orange-400 h-full transition-all duration-500"></div>
                            </>
                        ) : (
                            <div className="w-full bg-slate-200 h-full"></div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="border-r border-slate-100 pr-4">
                            <p className="text-blue-500 text-xs font-semibold mb-1 uppercase tracking-wider">Current</p>
                            <p className="text-xl font-medium text-slate-800">{formatCurrency(currentReceivables)}</p>
                        </div>
                        <div className="pl-2">
                            <p className="text-red-500 text-xs font-semibold mb-1 uppercase tracking-wider">Overdue</p>
                            <p className="text-lg font-medium text-slate-800">{formatCurrency(overdueTotal)}</p>
                        </div>
                        <div className="pl-4 border-l border-slate-100">
                            <p className="text-slate-400 text-xs mb-1">1-15 Days</p>
                            <p className="text-lg font-medium text-slate-700">{formatCurrency(data.overdueBreakdown?.['1_15'])}</p>
                        </div>
                        <div className="pl-4 border-l border-slate-100">
                            <p className="text-slate-400 text-xs mb-1">16-30 Days</p>
                            <p className="text-lg font-medium text-slate-700">{formatCurrency(data.overdueBreakdown?.['16_30'])}</p>
                        </div>
                        <div className="pl-4 border-l border-slate-100">
                            <p className="text-slate-400 text-xs mb-1">31-45 Days</p>
                            <p className="text-lg font-medium text-slate-700">{formatCurrency(data.overdueBreakdown?.['31_45'])}</p>
                        </div>
                        <div className="pl-4 border-l border-slate-100 md:col-start-5 mt-4 md:mt-0">
                            <p className="text-slate-400 text-xs mb-1">Above 45 days</p>
                            <p className="text-lg font-medium text-slate-700">{formatCurrency(data.overdueBreakdown?.['45_plus'])}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales and Expenses Widget */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-1.5">
                        <h2 className="text-lg font-medium text-slate-800">Sales and Expenses</h2>
                        <Info size={14} className="text-slate-400" />
                    </div>
                    <div className="flex items-center gap-3">
                        {chartFilter === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input type="date" className="input-field py-1 text-sm w-36" value={customDates.start} onChange={e => setCustomDates({ ...customDates, start: e.target.value })} />
                                <span className="text-slate-400">to</span>
                                <input type="date" className="input-field py-1 text-sm w-36" value={customDates.end} onChange={e => setCustomDates({ ...customDates, end: e.target.value })} />
                            </div>
                        )}
                        <select
                            className="input-field py-1.5 text-sm font-medium text-slate-700 bg-white border-slate-200 cursor-pointer w-44"
                            value={chartFilter}
                            onChange={(e) => {
                                setChartFilter(e.target.value);
                                if (e.target.value === '1m' || e.target.value === 'custom') setChartGranularity('daily');
                                else if (e.target.value === '3m') setChartGranularity('weekly');
                                else setChartGranularity('monthly');
                            }}
                        >
                            <option value="1m">Last 1 Month</option>
                            <option value="3m">Last 3 Months</option>
                            <option value="6m">Last 6 Months</option>
                            <option value="1y">Last 12 Months</option>
                            <option value="custom">Custom Date Range</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-slate-100">
                        <div className="flex justify-end mb-4">
                            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-sm">
                                <button onClick={() => setChartGranularity('daily')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${chartGranularity === 'daily' ? 'bg-white text-slate-800 shadow shadow-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Daily</button>
                                <button onClick={() => setChartGranularity('weekly')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${chartGranularity === 'weekly' ? 'bg-white text-slate-800 shadow shadow-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Weekly</button>
                                <button onClick={() => setChartGranularity('monthly')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${chartGranularity === 'monthly' ? 'bg-white text-slate-800 shadow shadow-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Monthly</button>
                            </div>
                        </div>
                        <div className="h-72 w-full">
                            <Bar options={chartOptions} data={chartData} />
                        </div>
                        <p className="text-xs text-slate-400 mt-6">* Sales value displayed is inclusive of tax and inclusive of credits.</p>
                    </div>

                    <div className="w-full lg:w-72 p-8 flex flex-col justify-center space-y-6 bg-slate-50/30">
                        <div>
                            <p className="text-sm font-medium text-blue-500 mb-1">Total Sales</p>
                            <p className="text-2xl font-medium text-slate-800">{formatCurrency(dynamicTotals?.sales)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-green-500 mb-1">Total Receipts</p>
                            <p className="text-2xl font-medium text-slate-800">{formatCurrency(dynamicTotals?.receipts)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-purple-500 mb-1">Total Expenses</p>
                            <p className="text-2xl font-medium text-slate-800">{formatCurrency(dynamicTotals?.expenses)}</p>
                        </div>
                        <div className="pt-6 border-t border-slate-200 border-dashed">
                            <p className="text-sm font-medium text-orange-500 mb-1">Total Purchases</p>
                            <p className="text-2xl font-medium text-slate-800">{formatCurrency(dynamicTotals?.purchases)}</p>
                        </div>
                        <div className="pt-6 border-t border-slate-200 border-dashed">
                            {/* <p className="text-sm font-medium text-amber-600 mb-1">Total Payablesss</p> */}
                            {/* <p className="text-2xl font-medium text-slate-800">{formatCurrency(dynamicTotals?.payables)}</p> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sales, Receipts, and Dues Table Widget */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-center gap-1.5 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-lg font-medium text-slate-800">Sales, Receipts, and Dues</h2>
                            <Info size={14} className="text-slate-400" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 bg-white"></th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white">Sales</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white">Receipts</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white">Due</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.periodSummary?.map((period, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{period.label}</td>
                                        <td className="px-6 py-4 text-right text-sm text-slate-800">{formatCurrency(period.sales)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-slate-800">{formatCurrency(period.receipts)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-slate-800 font-medium">{formatCurrency(period.due)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Invoices list */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-medium text-slate-800">Recent Invoices</h2>
                        <Link to="/invoices" className="text-blue-600 font-medium text-sm hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="p-6 space-y-4">
                        {data.recentInvoices.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No recent invoices.</p>
                        ) : (
                            data.recentInvoices.map((invoice) => (
                                <div key={invoice._id} className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{invoice.invoiceNumber}</p>
                                        <p className="text-xs text-gray-500 truncate w-24 sm:w-32">{invoice.customerId?.companyName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-800">{formatCurrency(invoice.grandTotal)}</p>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1
                                            ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                invoice.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {invoice.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
