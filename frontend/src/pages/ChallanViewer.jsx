import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, Share2, Printer, Edit } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const ChallanViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [challanData, setChallanData] = useState(null);
    const [loading, setLoading] = useState(true);
    const quoteRef = useRef(null);

    useEffect(() => {
        const fetchChallan = async () => {
            try {
                const res = await axios.get(`/api/public/challans/${id}`);
                setChallanData(res.data.data);
            } catch (err) {
                console.error("Error fetching challan", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChallan();
    }, [id]);

    const handleDownloadPDF = () => {
        const element = quoteRef.current;
        const opt = {
            margin: 0,
            filename: `Challan_${challanData.challan.challanNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    const handleShareWhatsApp = () => {
        const link = `http://localhost:5173/public/challan/${id}`;
        const text = `Hello,\n\nHere is your Delivery Challan (${challanData.challan.challanNumber}).\n\nView here: ${link}\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Challan Viewer...</div>;
    if (!challanData) return <div className="p-8 text-center text-red-500">Challan not found.</div>;

    const { challan, settings } = challanData;
    const customer = challan.customerId;

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/challans')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{challan.challanNumber}</h1>
                            <span className="text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm bg-blue-500 text-white">
                                {challan.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Recipient: <span className="text-slate-900">{customer?.companyName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate(`/challans/${challan._id}/edit`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <Edit size={20} />
                    </button>

                    <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <Printer size={20} />
                    </button>

                    <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-emerald-600 transition-all">
                        <Share2 size={18} /> Share
                    </button>

                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all">
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
                            <h2 className="text-4xl font-black text-blue-500 tracking-tight uppercase mb-4">Delivery Challan</h2>
                            <p className="text-slate-500 text-sm mb-1">Challan No: <span className="font-bold text-slate-900">{challan.challanNumber}</span></p>
                            <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(challan.date).toLocaleDateString()}</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Deliver To</p>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName}</h3>
                            <p className="text-slate-500 text-sm">{customer?.billingAddress?.street}</p>
                        </div>
                        {challan.vehicleNumber && (
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Transport Info</p>
                                <p className="text-slate-700 text-sm">Vehicle No: <span className="font-bold">{challan.vehicleNumber}</span></p>
                            </div>
                        )}
                    </div>

                    <table className="w-full mb-10 text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                                <th className="py-3 font-bold">Item Description</th>
                                <th className="py-3 font-bold text-center">Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {challan.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-4 font-medium text-slate-800">{item.name || (item.itemId?.name)}</td>
                                    <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-20 flex justify-between">
                        <div className="text-center">
                            <div className="w-40 border-b border-slate-300 mb-2"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Received By</p>
                        </div>
                        <div className="text-center">
                            <div className="w-40 border-b border-slate-300 mb-2"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase">For {settings?.companyName}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChallanViewer;
