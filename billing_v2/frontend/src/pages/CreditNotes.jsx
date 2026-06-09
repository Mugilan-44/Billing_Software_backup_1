import { useState, useEffect, useContext } from 'react';
import axios from '../utils/api';
import { Plus, Trash2, FileMinus, Settings, ReceiptText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const CreditNotes = () => {
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { taxSystemMode } = useContext(AuthContext);

    useEffect(() => {
        fetchNotes();
    }, [taxSystemMode]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const queryParam = taxSystemMode !== 'OVERALL' ? `?taxMode=${taxSystemMode}` : '';
            const res = await axios.get(`/api/credit-notes${queryParam}`);
            setNotes(res.data.data);
        } catch (error) {
            console.error('Error fetching credit notes', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto mb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shadow-inner">
                        <FileMinus size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Credit Notes</h1>
                        <p className="text-sm text-slate-500 font-medium">Customer returns & balance adjustments</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={() => navigate('/credit-notes/new')}
                        className="btn-primary bg-red-600 hover:bg-red-700 px-6 flex items-center gap-2 shadow-lg shadow-red-500/20 border-red-600"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Record Credit Note
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto overflow-visible">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">CN Number</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Original Invoice</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4 text-right pr-8">Total Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : notes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center shadow-inner">
                                                <FileMinus size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">No Adjustments Found</h3>
                                                <p className="text-sm text-slate-500 max-w-xs mx-auto">No credit notes recorded yet. Record returns or price corrections here.</p>
                                            </div>
                                            <button onClick={() => navigate('/credit-notes/new')} className="btn-primary bg-red-600 hover:bg-red-700 px-6 py-2 text-xs border-red-600">Issue First Credit Note</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                notes.map((note) => (
                                    <tr key={note._id} className="hover:bg-red-50/30 transition-colors group cursor-pointer" onClick={() => navigate(`/credit-notes/${note._id}`)}>
                                        <td className="px-6 py-5 text-sm font-bold text-slate-700">
                                            {new Date(note.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-black text-red-600">{note.cnNumber}</span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-slate-900 font-bold">{note.customerId?.companyName}</td>
                                        <td className="px-6 py-5">
                                            <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">{note.invoiceId?.invoiceNumber || 'Manual Adjust'}</span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-slate-500 font-medium max-w-[200px] truncate">{note.reason}</td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            <span className="text-base font-black text-red-600">-₹{(note.amount || 0).toFixed(2)}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CreditNotes;
