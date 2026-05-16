import { create } from 'zustand';
import { showToast } from '@/lib/toast';

interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface AlertState {
  // Loading state
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (isLoading: boolean, message?: string) => void;

  // Toast helpers
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;

  // Global Dialog state
  confirmDialog: ConfirmDialogOptions | null;
  showConfirm: (options: ConfirmDialogOptions) => void;
  hideConfirm: () => void;
}

const useAlertStore = create<AlertState>((set) => ({
  isLoading: false,
  loadingMessage: 'Loading...',

  setLoading: (isLoading: boolean, message = 'Loading...') => {
    set({ isLoading, loadingMessage: message });
  },

  showSuccess: (message: string) => {
    showToast.success(message);
  },

  showError: (message: string) => {
    showToast.error(message);
  },

  showInfo: (message: string) => {
    showToast.info(message);
  },

  // Dialog implementations
  confirmDialog: null,
  showConfirm: (options) => set({ confirmDialog: options }),
  hideConfirm: () => set({ confirmDialog: null }),
}));

export { useAlertStore };