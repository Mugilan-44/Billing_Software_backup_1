import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, Share2, Edit, Mail, Printer, FileCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SalesOrderViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const quoteRef = useRef(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await axios.get(`/api/public/orders/${id}`);
                setOrderData(res.data.data);
            } catch (err) {
                console.error("Error fetching order", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const handleDownloadPDF = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const o = orderData.order;
        const s = orderData.settings;
        doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
        doc.text('Sales Order', 14, 20);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text(s?.companyName || '', 14, 28);
        doc.text(`#${o.orderNumber || ''}`, 196, 20, { align: 'right' });
        doc.text(`Date: ${new Date(o.orderDate || o.date).toLocaleDateString('en-IN')}`, 196, 26, { align: 'right' });
        doc.setDrawColor(226, 232, 240); doc.line(14, 34, 196, 34);
        doc.setFontSize(11); doc.setTextColor(30, 41, 59);
        doc.text(o.customerId?.companyName || '', 14, 44);
        const headers = [['Item', 'Qty', 'Rate', 'Amount']];
        const rows = (o.items || []).map(i => [i.name || 'Item', String(i.quantity || 0), `\u20b9${(i.rate || 0).toFixed(2)}`, `\u20b9${((i.quantity || 0) * (i.rate || 0)).toFixed(2)}`]);
        doc.autoTable({ head: headers, body: rows, startY: 50, theme: 'grid', styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.3 }, headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
        const fy = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
        doc.text(`Total: \u20b9${(o.grandTotal || 0).toFixed(2)}`, 196, fy, { align: 'right' });
        doc.save(`Order_${o.orderNumber}.pdf`);
    };

    const handleShareWhatsApp = () => {
        const link = `http://localhost:5173/public/order/${id}`;
        const text = `Hello ${orderData.order.customerId?.companyName || 'Customer'},\n\nYour Sales Order (${orderData.order.orderNumber}) for ₹${orderData.order.grandTotal.toFixed(2)} is ready.\n\nView here: ${link}\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Order Viewer...</div>;
    if (!orderData) return <div className="p-8 text-center text-red-500">Order not found.</div>;

    const { order, settings } = orderData;
    const customer = order.customerId;

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6 no-print">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/orders')} className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{order.orderNumber}</h1>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-sm ${order.status === 'Confirmed' ? 'bg-emerald-500 text-white' : order.status === 'Cancelled' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                                {order.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Customer: <span className="text-slate-900">{customer?.companyName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate(`/orders/${order._id}/edit`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
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
                            <h2 className="text-4xl font-black text-purple-600 tracking-tight uppercase mb-4">Sales Order</h2>
                            <p className="text-slate-500 text-sm mb-1">Order No: <span className="font-bold text-slate-900">{order.orderNumber}</span></p>
                            <p className="text-slate-500 text-sm mb-1">Date: <span className="font-medium text-slate-900">{new Date(order.createdAt).toLocaleDateString()}</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Order For</p>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{customer?.companyName}</h3>
                            <p className="text-slate-500 text-sm">{customer?.billingAddress?.street}</p>
                        </div>
                    </div>

                    <table className="w-full mb-10 text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-800 text-slate-900 text-sm">
                                <th className="py-3 font-bold">Item</th>
                                <th className="py-3 font-bold text-center">Qty</th>
                                <th className="py-3 font-bold text-right">Rate</th>
                                <th className="py-3 font-bold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {order.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-4 font-medium text-slate-800">{item.name || (item.itemId?.name)}</td>
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
                                <span className="font-medium text-slate-900">₹{order.subTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-3 mt-3">
                                <span>Order Total</span>
                                <span className="text-purple-600">₹{order.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
};

export default SalesOrderViewer;
