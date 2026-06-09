import { AlertTriangle, X, Check } from 'lucide-react';

const StockWarningDialog = ({ isOpen, warnings, onContinue, onGoBack }) => {
    if (!isOpen || !warnings || warnings.length === 0) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onGoBack} />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div className="modal-content bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-4 px-6 pt-6 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} className="text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Stock Warning</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Some items exceed available stock.</p>
                        </div>
                        <button
                            onClick={onGoBack}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Warning List */}
                    <div className="px-6 pb-4 space-y-2 max-h-60 overflow-y-auto">
                        {warnings.map((w, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm">
                                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <span className="font-bold text-slate-800">{w.itemName}</span>
                                    <span className="text-slate-500"> — Requested: </span>
                                    <span className="font-bold text-red-600">{w.requested}</span>
                                    <span className="text-slate-500">, Available: </span>
                                    <span className="font-bold text-emerald-600">{w.available}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-50/50 border-t border-slate-100">
                        <button onClick={onGoBack} className="btn-secondary">
                            Go Back & Fix
                        </button>
                        <button onClick={onContinue} className="btn-primary bg-amber-500 hover:!bg-amber-600 px-6 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <Check size={16} />
                            Continue Anyway
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StockWarningDialog;
