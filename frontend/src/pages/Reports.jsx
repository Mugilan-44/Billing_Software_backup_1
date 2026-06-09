import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Download, Filter, Calendar, FileText, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Reports = () => {
    const [reportType, setReportType] = useState('sales');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            let url = `/api/reports/${reportType}`;
            if (startDate && endDate) {
                url += `?startDate=${startDate}&endDate=${endDate}`;
            }
            const res = await axios.get(url);
            setData(res.data.data);
        } catch (error) {
            console.error('Error fetching report', error);
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
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // Add headers
        csvRows.push(headers.join(','));

        // Add rows
        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleDownloadPDF = () => {
        if (data.length === 0) return;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Header
        const reportTitle = {
            sales: 'Sales & Revenue Report',
            gst: 'GST Output Report',
            aging: 'Outstanding Aging Report'
        }[reportType] || 'Business Report';

        // Title area
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(reportTitle, 14, 20);

        // Subtitle
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        const dateRange = startDate && endDate
            ? `Period: ${startDate} to ${endDate}`
            : `Generated on: ${new Date().toLocaleDateString('en-IN')}`;
        doc.text(dateRange, 14, 28);

        // Separator line
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.line(14, 32, doc.internal.pageSize.width - 14, 32);

        // Table
        const headers = Object.keys(data[0]);
        const formattedHeaders = headers.map(h => h.replace(/([A-Z])/g, ' $1').trim());

        const rows = data.map(row =>
            headers.map(h => {
                const val = row[h];
                if (typeof val === 'number') return `₹${val.toFixed(2)}`;
                return String(val ?? '');
            })
        );

        doc.autoTable({
            head: [formattedHeaders],
            body: rows,
            startY: 36,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 4,
                font: 'helvetica',
                textColor: [51, 65, 85],   // slate-700
                lineColor: [226, 232, 240], // slate-200
                lineWidth: 0.3,
            },
            headStyles: {
                fillColor: [241, 245, 249],  // slate-100
                textColor: [51, 65, 85],     // slate-700
                fontStyle: 'bold',
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],  // slate-50
            },
            margin: { left: 14, right: 14 },
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(
                `Prolync Book • Page ${i} of ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 8,
                { align: 'center' }
            );
        }

        doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="max-w-7xl mx-auto mb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business Reports</h1>
                        <p className="text-sm text-slate-500 font-medium">Data analytics, insights and compliance exports</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={data.length === 0}
                        className={`btn-primary flex items-center gap-2 px-5 py-2.5 ${data.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Download size={18} />
                        <span className="font-bold text-sm">Download PDF</span>
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={data.length === 0}
                        className={`btn-secondary flex items-center gap-2 px-5 py-2.5 ${data.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Download size={18} />
                        <span className="font-bold text-sm">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
                <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="col-span-1 md:col-span-1">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-1">Report Module</label>
                        <select
                            className="input-field w-full bg-slate-50 border-slate-200 font-bold text-slate-700"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                        >
                            <option value="sales">Sales & Revenue</option>
                            <option value="gst">GST Output Report</option>
                            <option value="aging">Outstanding Aging</option>
                        </select>
                    </div>

                    {reportType !== 'aging' && (
                        <>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-1">Timeline Start</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="date" className="input-field pl-10 w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-1">Timeline End</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="date" className="input-field pl-10 w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="col-span-1">
                        <button type="submit" className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 h-[46px] flex items-center justify-center gap-2 border-indigo-600 shadow-lg shadow-indigo-500/20" style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
                            <Filter size={18} />
                            Generate Report
                        </button>
                    </div>
                </form>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Crunching large datasets...</span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-4">
                                <FileText size={40} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No data found</h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">Try adjusting your filters or date range to see results.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {Object.keys(data[0]).map((key, idx) => (
                                        <th key={idx} className="px-6 py-5">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50 transition-colors cursor-default">
                                        {Object.values(row).map((val, cIdx) => (
                                            <td key={cIdx} className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                                {typeof val === 'number' ? (
                                                    <span className="font-bold text-slate-900">₹{val.toFixed(2)}</span>
                                                ) : val}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;
