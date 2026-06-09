import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track unsaved form changes and block navigation.
 * Returns { isDirty, markDirty, markClean, showDialog, confirmNavigation, cancelNavigation, pendingNavigate }
 * 
 * Usage:
 *   const unsaved = useUnsavedChanges();
 *   // Call unsaved.markDirty() whenever form fields change
 *   // Call unsaved.markClean() after successful save
 *   // Before navigating: call unsaved.tryNavigate(navigateFn) 
 *   // Render <UnsavedChangesDialog isOpen={unsaved.showDialog} onDiscard={unsaved.confirmNavigation} onStay={unsaved.cancelNavigation} />
 */
const useUnsavedChanges = () => {
    const [isDirty, setIsDirty] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const markDirty = useCallback(() => {
        setIsDirty(true);
    }, []);

    const markClean = useCallback(() => {
        setIsDirty(false);
    }, []);

    // Warn on browser tab close / refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Try to navigate — if dirty, show dialog; otherwise execute immediately
    const tryNavigate = useCallback((navigateFn) => {
        if (isDirty) {
            setPendingAction(() => navigateFn);
            setShowDialog(true);
        } else {
            navigateFn();
        }
    }, [isDirty]);

    const confirmNavigation = useCallback(() => {
        setShowDialog(false);
        setIsDirty(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    }, [pendingAction]);

    const cancelNavigation = useCallback(() => {
        setShowDialog(false);
        setPendingAction(null);
    }, []);

    return {
        isDirty,
        markDirty,
        markClean,
        showDialog,
        tryNavigate,
        confirmNavigation,
        cancelNavigation,
    };
};

export default useUnsavedChanges;
