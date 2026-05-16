import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAlertStore } from "@/stores/useAlertStore";
import { buttonVariants } from "@/components/ui/button";

export const GlobalAlertDialog: React.FC = () => {
  const { confirmDialog, hideConfirm } = useAlertStore();

  if (!confirmDialog) return null;

  const handleConfirm = async () => {
    try {
      await confirmDialog.onConfirm();
    } finally {
      hideConfirm();
    }
  };

  const handleCancel = () => {
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    hideConfirm();
  };

  return (
    <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {confirmDialog.cancelText || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={confirmDialog.variant === 'destructive' ? buttonVariants({ variant: 'destructive' }) : ''}
          >
            {confirmDialog.confirmText || 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
