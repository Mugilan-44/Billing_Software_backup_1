import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/api';
import { API_URL } from '../utils/api';
import { Download, Printer, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
    COLOR_THEMES,
    fmt,
    TemplateModern,
    TemplateClassic,
    TemplateProfessional,
    TemplateElegant,
    TemplateMinimal,
    TemplateBold,
    TemplateGST,
    TemplateVibrant
} from './InvoiceViewer';

const PublicInvoiceViewer = () => {
    const { token } = useParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const printRef = useRef(null);

    useEffect(() => {
        const fetchPublicInvoice = async () => {
            try {
                const response = await axios.get(`/api/public/invoices/${token}`);
                const data = response.data.data;
                const invoice = data.invoice;
                const settings = data.settings;
                
                // Normalize: merge items from lineItems or items array
                if (invoice && !invoice.items) {
                    invoice.items = invoice.lineItems || [];
                }
                setInvoiceData({ invoice, settings });
            } catch (err) {
                console.error('Error fetching public invoice', err);
                setError(err.response?.data?.message || 'Invoice not found or invalid sharing link.');
            } finally {
                setLoading(false);
            }
        };
        if (token) {
            fetchPublicInvoice();
        }
    }, [token]);

    const handleDownloadPDF = () => {
        setDownloading(true);
        window.location.href = `${API_URL}/api/public/invoices/${token}/download`;
        setTimeout(() => {
            setDownloading(false);
        }, 3000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-bold text-sm tracking-wide">Loading secure invoice link...</p>
                </div>
            </div>
        );
    }

    if (error || !invoiceData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 font-sans">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3">Unable to Load Invoice</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        {error || 'This link may have expired or is invalid. Please contact the company to send a new invoice link.'}
                    </p>
                    <div className="h-px bg-slate-100 w-full mb-6"></div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Secure Billing Portal</p>
                </div>
            </div>
        );
    }

    const { invoice, settings } = invoiceData;
    const customer = invoice.customerId;

    // Use default values if settings or local storage aren't present
    const template = invoice.template || 'modern';
    const accentColor = invoice.color || '#2563eb';

    const templateProps = { invoice, customer, settings, color: accentColor, printRef };
    const templateMap = {
        modern:       <TemplateModern {...templateProps} />,
        classic:      <TemplateClassic {...templateProps} />,
        professional: <TemplateProfessional {...templateProps} />,
        elegant:      <TemplateElegant {...templateProps} />,
        minimal:      <TemplateMinimal {...templateProps} />,
        bold:         <TemplateBold {...templateProps} />,
        gst:          <TemplateGST {...templateProps} />,
        vibrant:      <TemplateVibrant {...templateProps} />,
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Top Glassmorphic Navigation */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 no-print shadow-sm">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-lg">
                            P
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-black text-slate-900 tracking-tight">#{invoice.invoiceNumber}</h1>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-wider uppercase ${invoice.status === 'Paid' ? 'bg-emerald-500 text-white' : invoice.status === 'Draft' ? 'bg-slate-400 text-white' : 'bg-amber-400 text-white'}`}>
                                    {invoice.status}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Billed by {settings?.companyName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            onClick={() => window.print()}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 text-xs font-bold shadow-sm hover:bg-slate-50 transition-all"
                            title="Print Invoice"
                        >
                            <Printer size={15} />
                            Print
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-lg transition-all disabled:opacity-70"
                            style={{ backgroundColor: accentColor }}
                            title="Download PDF"
                        >
                            {downloading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <Download size={15} />
                                    Download PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice Body Container */}
            <div className="max-w-4xl mx-auto px-4 mt-8 flex flex-col gap-6">
                {/* Security/Access Banner */}
                <div className="no-print bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                    <div className="text-blue-600 mt-0.5">
                        <CheckCircle size={18} />
                    </div>
                    <div>
                        <p className="text-slate-800 font-bold text-xs">Secure Link Verified</p>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                            This is a read-only secure view of your invoice. You can download a PDF or print this receipt for your records.
                        </p>
                    </div>
                </div>

                {/* Main Rendered Invoice Page */}
                <div className="shadow-2xl shadow-slate-100 rounded-2xl overflow-hidden border border-slate-100 bg-white">
                    {templateMap[template] || templateMap.modern}
                </div>
            </div>

            {/* Print specific style */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .max-w-4xl { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                    .shadow-2xl, .shadow-sm { box-shadow: none !important; }
                    .border { border: none !important; }
                }
            `}</style>
        </div>
    );
};

export default PublicInvoiceViewer;
