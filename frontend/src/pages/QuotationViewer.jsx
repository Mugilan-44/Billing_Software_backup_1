import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, Share2, Edit, Mail, Printer, ClipboardList } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const QuotationViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quoteData, setQuoteData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState('modern');
    const quoteRef = useRef(null);

    useEffect(() => {
        const fetchQuotation = async () => {
            try {
                // Using public endpoint for consistency (need to add this backend route)
                const res = await axios.get(`/api/public/quotations/${id}`);
                setQuoteData(res.data.data);
            } catch (err) {
                console.error("Error fetching quotation", err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuotation();
    }, [id]);

    const handleDownloadPDF = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const q = quoteData.quotation;
        const s = quoteData.settings;
        doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
        doc.text('Quotation', 14, 20);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text(s?.companyName || '', 14, 28);
        doc.text(`#${q.quoteNumber || ''}`, 196, 20, { align: 'right' });
        doc.text(`Date: ${new Date(q.quoteDate).toLocaleDateString('en-IN')}`, 196, 26, { align: 'right' });
        doc.setDrawColor(226, 232, 240); doc.line(14, 34, 196, 34);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(148, 163, 184);
        doc.text('CLIENT', 14, 42);
        doc.setFontSize(11); doc.setTextColor(30, 41, 59);
        doc.text(q.customerId?.companyName || '', 14, 48);
        const headers = [['Item', 'Qty', 'Rate', 'Amount']];
        const rows = q.items.map(i => [i.name || 'Item', String(i.quantity), `\u20b9${(i.rate || 0).toFixed(2)}`, `\u20b9${((i.quantity || 0) * (i.rate || 0)).toFixed(2)}`]);
        doc.autoTable({ head: headers, body: rows, startY: 54, theme: 'grid', styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.3 }, headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
        const fy = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
        doc.text(`Total: \u20b9${(q.grandTotal || 0).toFixed(2)}`, 196, fy, { align: 'right' });
        doc.save(`Quotation_${q.quoteNumber}.pdf`);
    };

    const handleShareWhatsApp = () => {
        const link = `http://localhost:5173/public/quotation/${id}`;
        const text = `Hello ${quoteData.quotation.customerId?.companyName || 'Customer'},\n\nHere is your latest Quotation (${quoteData.quotation.quoteNumber}) for ₹${quoteData.quotation.grandTotal.toFixed(2)}.\n\nView and download it securely here: ${link}\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = () => {
        const link = `http://localhost:5173/public/quotation/${id}`;
        const subject = `Quotation ${quoteData.quotation.quoteNumber} from ${quoteData.settings?.companyName || 'Billing System'}`;
        const body = `Hello ${quoteData.quotation.customerId?.companyName || 'Customer'},\n\nPlease find our quotation (${quoteData.quotation.quoteNumber}) for the amount of ₹${quoteData.quotation.grandTotal.toFixed(2)}.\n\nYou can view and download it here: ${link}\n\nBest regards,\n${quoteData.settings?.companyName || 'Sales Team'}`;
        window.location.href = `mailto:${quoteData.quotation.customerId?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Quotation Viewer...</div>;
    if (!quoteData) return <div className="p-8 text-center text-red-500">Quotation not found.</div>;

    const { quotation: quote, settings } = quoteData;
    const customer = quote.customerId;

    const TemplateModern = () => (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200" ref={quoteRef}>
            <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                <div>
                    {settings?.logoUrl ? (
                        <img src={`${settings.logoUrl}`} alt="Logo" className="h-16 object-contain mb-4" />
                    ) : (
                        <h1 className="text-2xl font-black text-slate-900 mb-2">{settings?.companyName || 'Transport Company'}</h1>
                    )}
                    <p className="text-slate-500 text-sm whitespace-pre-wrap">{[settings?.address?.street, settings?.address?.city].filter(Boolean).join(', ')}</p>
                    <p className="text-slate-500 text-sm mt-1">GSTIN: <span className="font-medium text-slate-700">{settings?.gstNumber || 'N/A'}</span></p>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-black text-blue-600 tracking-tight uppercase mb-4">Quotation</h2>
                    <p className="text-slate-500 text-sm mb-1">Quote No: <span className="font-bold text-slate-900">{quote.quoteNumber}</span></p>
                    <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(quote.createdAt).toLocaleDateString()}</span></p>
                    <p className="text-slate-500 text-sm">Valid Till: <span className="font-medium text-amber-600">{new Date(quote.validityDate).toLocaleDateString()}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-10">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Quotation For</p>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName}</h3>
                    <p className="text-slate-500 text-sm mb-1">{customer?.billingAddress?.street}</p>
                    <p className="text-slate-500 text-sm">GSTIN: <span className="font-medium text-slate-700">{customer?.gstNumber || 'URD'}</span></p>
                </div>
            </div>

            <table className="w-full mb-10 text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                        <th className="py-3 font-bold">Item & Description</th>
                        <th className="py-3 font-bold text-center">Qty</th>
                        <th className="py-3 font-bold text-right">Rate</th>
                        <th className="py-3 font-bold text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {quote.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                            <td className="py-4 font-medium text-slate-800 w-2/5">
                                {item.name || (item.itemId?.name)}
                                {item.itemId?.hsnCode && <p className="text-xs text-slate-400 mt-1 font-normal">HSN: {item.itemId.hsnCode}</p>}
                            </td>
                            <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                            <td className="py-4 text-right text-slate-600">₹{item.rate.toFixed(2)}</td>
                            <td className="py-4 text-right font-medium text-slate-900">₹{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end">
                <div className="w-1/3 space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                        <span>Sub Total</span>
                        <span className="font-medium text-slate-900">₹{quote.subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Tax (CGST+SGST)</span>
                        <span>₹{(quote.taxTotal.cgst + quote.taxTotal.sgst).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-3 mt-3">
                        <span>Estimate Total</span>
                        <span className="text-blue-600">₹{quote.grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            {quote.notes && (
                <div className="mt-10 pt-6 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 mb-1">Terms & Conditions</p>
                    <p className="text-sm text-slate-600">{quote.notes}</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/quotations')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{quote.quoteNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm ${quote.status === 'Accepted' ? 'bg-emerald-500 text-white' : quote.status === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                                {quote.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Customer: <span className="text-slate-900">{customer?.companyName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate(`/quotations/${quote._id}/edit`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Edit Quote">
                        <Edit size={20} />
                    </button>

                    <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Print Quote">
                        <Printer size={20} />
                    </button>

                    <button onClick={handleShareEmail} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Share via Email">
                        <Mail size={20} />
                    </button>

                    {quote.status === 'Accepted' && (
                        <button onClick={() => navigate(`/sales-orders/new?quoteId=${quote._id}`)} className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-purple-700 transition-all">
                            <ClipboardList size={18} /> Convert to Order
                        </button>
                    )}

                    <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all">
                        <Share2 size={18} /> Share
                    </button>

                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                        <Download size={18} /> Download
                    </button>
                </div>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-4xl">
                    <TemplateModern />
                </div>
            </div>

            <style jsx="true">{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .max-w-6xl { max-width: 100% !important; padding: 0 !important; }
                }
            `}</style>
        </div>
    );
};

export default QuotationViewer;
