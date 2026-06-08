import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, Share2, Printer, Edit } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const PurchaseBillViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [billData, setBillData] = useState(null);
    const [loading, setLoading] = useState(true);
    const quoteRef = useRef(null);

    useEffect(() => {
        const fetchBill = async () => {
            try {
                const res = await axios.get(`/api/public/purchase-bills/${id}`);
                setBillData(res.data.data);
            } catch (err) {
                console.error("Error fetching purchase bill", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBill();
    }, [id]);

    const handleDownloadPDF = () => {
        const element = quoteRef.current;
        const opt = {
            margin: 0,
            filename: `PurchaseBill_${billData.bill.billNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Bill Viewer...</div>;
    if (!billData) return <div className="p-8 text-center text-red-500">Purchase Bill not found.</div>;

    const { bill, settings } = billData;
    const vendor = bill.vendorId;

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/purchase-bills')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{bill.billNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm ${bill.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                                {bill.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Vendor: <span className="text-slate-900">{vendor?.companyName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate(`/purchase-bills/${bill._id}/edit`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <Edit size={20} />
                    </button>

                    <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <Printer size={20} />
                    </button>

                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                        <Download size={18} /> Download
                    </button>
                </div>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-4xl bg-white p-12 rounded-xl shadow-sm border border-slate-200" ref={quoteRef}>
                    <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                        <div>
                            {settings?.logoUrl ? (
                                <img src={`${settings.logoUrl}`} alt="Logo" className="h-16 object-contain mb-4" />
                            ) : (
                                <h1 className="text-2xl font-black text-slate-900 mb-2">{settings?.companyName || 'Transport Company'}</h1>
                            )}
                            <p className="text-slate-500 text-sm">{[settings?.address?.street, settings?.address?.city].filter(Boolean).join(', ')}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-black text-rose-600 tracking-tight uppercase mb-4">Purchase Bill</h2>
                            <p className="text-slate-500 text-sm mb-1">Bill No: <span className="font-bold text-slate-900">{bill.billNumber}</span></p>
                            <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(bill.billDate).toLocaleDateString()}</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Vendor Information</p>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{vendor?.companyName}</h3>
                            <p className="text-slate-500 text-sm">{vendor?.billingAddress?.street}</p>
                            <p className="text-slate-500 text-sm">GSTIN: {vendor?.gstNumber || 'URD'}</p>
                        </div>
                    </div>

                    <table className="w-full mb-10 text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                                <th className="py-3 font-bold">Item Description</th>
                                <th className="py-3 font-bold text-center">Qty</th>
                                <th className="py-3 font-bold text-right">Rate</th>
                                <th className="py-3 font-bold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {bill.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-4 font-medium text-slate-800">{item.name || (item.itemId?.name)}</td>
                                    <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-4 text-right text-slate-600">₹{item.rate.toFixed(2)}</td>
                                    <td className="py-4 text-right font-bold text-slate-900">₹{item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end">
                        <div className="w-1/3 space-y-3 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Sub Total</span>
                                <span className="font-medium text-slate-900">₹{bill.subTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Tax Total</span>
                                <span>₹{bill.taxTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-3 mt-3">
                                <span>Bill Total</span>
                                <span className="text-rose-600">₹{bill.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseBillViewer;
