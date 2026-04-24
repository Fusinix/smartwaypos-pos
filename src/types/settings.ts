export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface NewUser {
  username: string;
  password: string;
  role: UserRole;
}

export interface GeneralSettings {
  businessName: string;
  businessLogo?: string;
  defaultCurrency: string;
  printReceipts: boolean;
}

export interface POSSettings {
  autoLogoutTimeout: number;
  defaultTaxRate: number;
  receiptFooterNote: string;
  showTaxOnReceipt: boolean;
  cashDrawerPort?: string;
  cashDrawerKickCode?: string;
  receiptPrinter?: string;
}

export interface TableSettings {
  tables: Table[];
}

export interface Table {
  id: number;
  name: string;
  capacity?: number;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface ThemeSettings {
  mode: 'light' | 'dark';
  primaryColor?: string;
}

export interface Settings {
  general: GeneralSettings;
  pos: POSSettings;
  tables: TableSettings;
  theme: ThemeSettings;
}

export interface BackupData {
  timestamp: string;
  version: string;
  data: string;
} 