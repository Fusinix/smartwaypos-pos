interface ElectronAPI {
  invoke(channel: string, ...args: any[]): Promise<any>;
  onSyncStatusChanged(callback: () => void): () => void;
  onSyncProgress(callback: (progress: any) => void): () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 