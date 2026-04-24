import { create } from 'zustand';
import { showToast } from '@/lib/toast';

interface AlertState {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (isLoading: boolean, message?: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
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
}));

export { useAlertStore };