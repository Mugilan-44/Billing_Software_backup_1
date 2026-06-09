import { AlertTriangle, X } from 'lucide-react';

const UnsavedChangesDialog = ({ isOpen, onDiscard, onStay }) => {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onStay} />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div className="modal-content bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-4 px-6 pt-6 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} className="text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Unsaved Changes</h3>
                            <p className="text-sm text-slate-500 mt-0.5">You have unsaved changes that will be lost.</p>
                        </div>
                        <button
                            onClick={onStay}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 pb-2">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            If you leave this page, all the data you've entered will be lost. Are you sure you want to continue?
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-50/50 border-t border-slate-100 mt-4">
                        <button
                            onClick={onStay}
                            className="btn-primary px-6"
                        >
                            Stay on Page
                        </button>
                        <button
                            onClick={onDiscard}
                            className="btn-secondary text-red-600 hover:!bg-red-50 hover:!border-red-200"
                        >
                            Discard & Leave
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UnsavedChangesDialog;
