interface ElectronAPI {
  invoke(channel: string, ...args: any[]): Promise<any>;
  onSyncStatusChanged(callback: () => void): () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 