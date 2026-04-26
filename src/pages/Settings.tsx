import { AddEditTableDialog } from '@/components/dialogs/add-edit-table-dialog';
import AddUserDialog from '@/components/dialogs/add-user-dialog';
import EditUserDialog from '@/components/dialogs/edit-user-dialog';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseJSONString } from '@/lib/utils';
import { Code } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertWithActions } from '../components/alerts/alert-with-actions';
import { SimpleAlert } from '../components/alerts/simple-alert';
import { SectionCard } from '../components/settings/SectionCard';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { useTables } from '../hooks/useTables';
import type { GeneralSettings, NewUser, POSSettings, Table, User } from '../types/settings';
import { Switch } from '@/components/ui/switch';

interface SystemLog {
  id: number;
  created_at: string;
  admin_id: number | null;
  admin_name: string | null;
  admin_role: string | null;
  action: string;
  page: string | null;
  context: string | null;
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const {
    settings,
    users,
    loading,
    error,
    updateSettings,
    addUser,
    updateUser,
    deleteUser,
    exportDatabase,
    importDatabase,
    clearAllData,
  } = useSettings();

  const {
    tables,
    loading: tablesLoading,
    // error: tablesError,
    getTables,
    addTable,
    updateTable,
    deleteTable,
  } = useTables();

  const [activeTab, setActiveTab] = useState('general');
  const [editingUser, setEditingUser] = useState<(User & { password?: string }) | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<any[]>([]);
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);
  
  // Local state for settings with default values
  const [localGeneralSettings, setLocalGeneralSettings] = useState<GeneralSettings>({
    businessName: '',
    defaultCurrency: 'GHS',
    printReceipts: false,
    ...settings?.general
  });
  
  const [localPosSettings, setLocalPosSettings] = useState<POSSettings>({
    defaultTaxRate: 0,
    showTaxOnReceipt: false,
    autoLogoutTimeout: 30,
    receiptFooterNote: '',
    cashDrawerPort: '',
    cashDrawerKickCode: '0x07',
    receiptPrinter: '',
    customerDisplayPort: '',
    ...settings?.pos
  });

  const userRole = user?.role;
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager' || userRole === 'admin';

  useEffect(() => {
    if (settings) {
      setLocalGeneralSettings((prev) => ({ ...prev, ...settings.general }));
      setLocalPosSettings((prev) => ({ ...prev, ...settings.pos }));
    }
  }, [settings]);

  useEffect(() => {
    if (error) {
      console.error('Settings error:', error);
      setLocalError(error);
      setShowErrorDialog(true);
    }
  }, [error]);

  // Update local settings when settings prop changes
  useEffect(() => {
    if (settings?.general) {
      const newObj = parseJSONString(settings.general as any);
      setLocalGeneralSettings(prev => ({
        ...prev,
        ...newObj
      }));
    }
    if (settings?.pos) {
      const newObj = parseJSONString(settings.pos as any);
      setLocalPosSettings(prev => ({
        ...prev,
        ...newObj
      }));
    }
  }, [settings]);

  // Fetch logs when logs tab is active
  useEffect(() => {
    if (activeTab === 'logs' && isAdmin) {
      fetchLogs();
    }
  }, [activeTab, isAdmin]);

  // Fetch tables when tables tab is active
  useEffect(() => {
    if (activeTab === 'tables' && isManager) {
      getTables();
    }
  }, [activeTab, isManager, getTables]);

  useEffect(() => {
    if (activeTab === 'pos' && isManager) {
      fetchSerialPorts();
      fetchPrinters();
    }
  }, [activeTab, isManager]);

  const fetchSerialPorts = async () => {
    try {
      const ports = await window.electron.invoke('list-serial-ports');
      setAvailablePorts(ports);
    } catch (error) {
      console.error('Error fetching serial ports:', error);
    }
  };

  const fetchPrinters = async () => {
    try {
      const printers = await window.electron.invoke('list-printers');
      setAvailablePrinters(printers);
    } catch (error) {
      console.error('Error fetching printers:', error);
    }
  };

  const handleTestDrawer = async () => {
    if (!localPosSettings.cashDrawerPort && !localPosSettings.receiptPrinter) {
      toast.error('Please select a COM port or a Printer first');
      return;
    }

    try {
      setIsTestingDrawer(true);
      // Save settings first to ensure main process has the latest config
      await updateSettings({ pos: localPosSettings });
      await window.electron.invoke('trigger-cash-drawer');
      toast.success('Test command sent to drawer');
    } catch (error: any) {
      toast.error(`Failed to trigger drawer: ${error.message}`);
    } finally {
      setIsTestingDrawer(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const logsData = await window.electron.invoke('get-logs');
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLocalError('Failed to fetch system logs');
      setShowErrorDialog(true);
    } finally {
      setLogsLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatContext = (context: string | null) => {
    if (!context) return '-';
    try {
      const parsed = JSON.parse(context);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return context;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  const handleSaveGeneralSettings = async () => {
    try {
      setLocalError(null);
      await updateSettings({ general: localGeneralSettings });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setLocalError(errorMessage);
      setShowErrorDialog(true);
    }
  };

  const handleSavePosSettings = async () => {
    try {
      setLocalError(null);
      await updateSettings({ pos: localPosSettings });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setLocalError(errorMessage);
      setShowErrorDialog(true);
    }
  };

  const handleAddUser = async (user: NewUser) => {
    try {
      await addUser(user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user';
      setLocalError(errorMessage);
      setShowErrorDialog(true);
    }
  };

  const handleUpdateUser = async (updatedUser: User & { password?: string }) => {
    try {
      const { password, ...userData } = updatedUser;
      await updateUser(updatedUser.id, {
        ...userData,
        ...(password ? { password } : {}),
      });
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    setUserToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setLocalError(null);
      await deleteUser(userToDelete);
      setShowDeleteDialog(false);
      setUserToDelete(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setLocalError(errorMessage);
      setShowErrorDialog(true);
    }
  };

  const handleAddTable = async (table: Omit<Table, 'id'>) => {
    try {
      setLocalError(null);
      await addTable(table, {
        id: user?.id || 0,
        name: user?.username || '',
        role: user?.role || 'cashier'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add table';
      setLocalError(errorMessage);
      setShowErrorDialog(true);
    }
  };

  const handleUpdateTable = async (table: Omit<Table, 'id'>) => {
    if (!editingTable) return;
    
    try {
      setLocalError(null);
      await updateTable({ ...table, id: editingTable.id }, {
        id: user?.id || 0,
        name: user?.username || '',
        role: user?.role || 'cashier'
      });
      setEditingTable(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update table';
      setLocalError(errorMessage);
      setShowErrorDialog(true);
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    try {
      setLocalError(null);
      await deleteTable(tableId, {
        id: user?.id || 0,
        name: user?.username || '',
        role: user?.role || 'cashier'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete table';
      setLocalError(errorMessage);
      setShowErrorDialog(true);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-8">
        <nav className="h-full py-3 flex space-x-4">
          <Button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-md text-base font-medium ${
              activeTab === 'general'
                ? 'bg-primary/10 hover:bg-primary text-primary hover:text-white'
                : 'text-gray-500 bg-transparent shadow-none hover:bg-muted hover:text-gray-700'
            }`}
          >
            General
          </Button>
          {isManager && (
            <Button
              onClick={() => setActiveTab('pos')}
              className={`px-4 py-2 rounded-md text-base font-medium ${
                activeTab === 'pos'
                  ? 'bg-primary/10 hover:bg-primary text-primary hover:text-white'
                  : 'text-gray-500 bg-transparent shadow-none hover:bg-muted hover:text-gray-700'
              }`}
            >
              POS Settings
            </Button>
          )}
          {isManager && (
            <Button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 rounded-md text-base font-medium ${
                activeTab === 'tables'
                  ? 'bg-primary/10 hover:bg-primary text-primary hover:text-white'
                  : 'text-gray-500 bg-transparent shadow-none hover:bg-muted hover:text-gray-700'
              }`}
            >
              Tables
            </Button>
          )}
          {isAdmin && (
            <Button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-md text-base font-medium ${
                activeTab === 'users'
                  ? 'bg-primary/10 hover:bg-primary text-primary hover:text-white'
                  : 'text-gray-500 bg-transparent shadow-none hover:bg-muted hover:text-gray-700'
              }`}
            >
              Users
            </Button>
          )}
          {isAdmin && (
          <Button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 rounded-md text-base font-medium ${
              activeTab === 'backup'
                ? 'bg-primary/10 hover:bg-primary text-primary hover:text-white'
                : 'text-gray-500 bg-transparent shadow-none hover:bg-muted hover:text-gray-700'
            }`}
          >
            Backup & Restore
          </Button>)}
          {isAdmin && (
            <Button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-md text-base font-medium ${
                activeTab === 'logs'
                  ? 'bg-primary/10 hover:bg-primary text-primary hover:text-white'
                  : 'text-gray-500 bg-transparent shadow-none hover:bg-muted hover:text-gray-700'
              }`}
            >
              Logs
            </Button>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <SimpleAlert
          open={showErrorDialog}
          onOpenChange={setShowErrorDialog}
          message={localError || error || ''}
        />

        <AlertWithActions
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Delete User"
          message="Are you sure you want to delete this user? This action cannot be undone."
          confirmText="Delete"
          onConfirm={confirmDeleteUser}
        />

        <AlertWithActions
          open={showClearDataDialog}
          onOpenChange={setShowClearDataDialog}
          title="Clear All Data"
          message="⚠️ WARNING: This will permanently delete ALL data including orders, products, categories, tables, logs, and settings. All users will be deleted except the default admin user (username: admin). This action CANNOT be undone. Are you absolutely sure?"
          confirmText="Yes, Clear All Data"
          cancelText="Cancel"
          onConfirm={async () => {
            try {
              await clearAllData();
              setShowClearDataDialog(false);
              // Reload the page to reflect changes
              window.location.reload();
            } catch (error) {
              // Error is already handled in clearAllData
            }
          }}
          confirmClassName="bg-red-600 hover:bg-red-700"
        />

        {activeTab === 'general' && (
        <SectionCard title="General Settings">
          <div className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700">
                Business Name
              </Label>
              <Input
                type="text"
                value={localGeneralSettings.businessName}
                onChange={(e) => setLocalGeneralSettings({
                    ...localGeneralSettings,
                    businessName: e.target.value,
                })}
                placeholder="Enter business name"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
                <Label>Business Logo</Label>
                <div className="flex items-center space-x-4">
                    {localGeneralSettings.businessLogo && (
                        <div className="h-16 w-16 border rounded bg-gray-50 flex items-center justify-center p-1">
                            <img 
                                src={localGeneralSettings.businessLogo} 
                                alt="Logo" 
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    )}
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setLocalGeneralSettings({
                                        ...localGeneralSettings,
                                        businessLogo: reader.result as string,
                                    });
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                        className="flex-1 cursor-pointer"
                    />
                    {localGeneralSettings.businessLogo && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setLocalGeneralSettings({...localGeneralSettings, businessLogo: ""})}
                            className="text-red-500 hover:text-red-700"
                        >
                            Clear
                        </Button>
                    )}
                </div>
                <p className="text-xs text-gray-400">This logo will appear at the top of your printed receipts.</p>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700">
                Default Currency
              </Label>
              <select
                value={localGeneralSettings.defaultCurrency}
                onChange={(e) =>
                  setLocalGeneralSettings({
                    ...localGeneralSettings,
                    defaultCurrency: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
              >
                <option value="GHS">GHS</option>
              </select>
            </div>
            <div className="flex items-center hidden">
              <Input
                type="checkbox"
                checked={localGeneralSettings.printReceipts}
                onChange={(e) =>
                  setLocalGeneralSettings({
                    ...localGeneralSettings,
                    printReceipts: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/90"
              />
              <Label className="ml-2 block text-sm text-gray-900">
                Print Receipts
              </Label>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveGeneralSettings}
                className="bg-primary text-white hover:bg-primary"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === 'pos' && (
        <SectionCard title="POS Settings">
          <div className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700">
                Default Tax Rate (%)
              </Label>
              <Input
                type="number"
                value={localPosSettings.defaultTaxRate}
                onChange={(e) =>
                  setLocalPosSettings({
                    ...localPosSettings,
                    defaultTaxRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
              />
            </div>
            <div className="flex items-center hidden">
              <Input
                type="checkbox"
                checked={localPosSettings.showTaxOnReceipt}
                onChange={(e) =>
                  setLocalPosSettings({
                    ...localPosSettings,
                    showTaxOnReceipt: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/90"
              />
              <Label className="ml-2 block text-sm text-gray-900">
                Show Tax on Receipt
              </Label>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700">
                Auto Logout Timeout (minutes)
              </Label>
              <Input
                type="number"
                value={localPosSettings.autoLogoutTimeout}
                onChange={(e) =>
                  setLocalPosSettings({
                    ...localPosSettings,
                    autoLogoutTimeout: parseInt(e.target.value) || 30,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
              />
            </div>
            <div className='hidden'>
              <Label className="block text-sm font-medium text-gray-700">
                Receipt Footer Note
              </Label>
              <Input
                type="text"
                value={localPosSettings.receiptFooterNote}
                onChange={(e) =>
                  setLocalPosSettings({
                    ...localPosSettings,
                    receiptFooterNote: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Cash Drawer Integration</h4>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> If your drawer is connected <strong>to the printer</strong> (RJ11 cable), select your printer below. If it's <strong>directly USB</strong>, select a COM port.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700">
                    Printer Connection (RJ11)
                  </Label>
                  <select
                    value={localPosSettings.receiptPrinter || ''}
                    onChange={(e) =>
                      setLocalPosSettings({
                        ...localPosSettings,
                        receiptPrinter: e.target.value,
                        cashDrawerPort: e.target.value ? '' : localPosSettings.cashDrawerPort
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm h-10"
                  >
                    <option value="">Select printer...</option>
                    {availablePrinters.map((printer) => (
                      <option key={printer.name} value={printer.name}>
                        {printer.name} {printer.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">For drawers plugged into the thermal printer.</p>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700">
                    Direct COM Port (USB)
                  </Label>
                  <select
                    value={localPosSettings.cashDrawerPort || ''}
                    onChange={(e) =>
                      setLocalPosSettings({
                        ...localPosSettings,
                        cashDrawerPort: e.target.value,
                        receiptPrinter: e.target.value ? '' : localPosSettings.receiptPrinter
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm h-10"
                  >
                    <option value="">Select port...</option>
                    {availablePorts.map((port) => (
                      <option key={port.path} value={port.path}>
                        {port.path} {port.friendlyName ? `- ${port.friendlyName}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">For drawers plugged directly into the PC.</p>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700">
                    Kick Code
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. 0x07"
                    value={localPosSettings.cashDrawerKickCode || ''}
                    onChange={(e) =>
                      setLocalPosSettings({
                        ...localPosSettings,
                        cashDrawerKickCode: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestDrawer}
                  disabled={isTestingDrawer || (!localPosSettings.cashDrawerPort && !localPosSettings.receiptPrinter)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {isTestingDrawer ? 'Testing...' : 'Test Drawer Connection'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { fetchSerialPorts(); fetchPrinters(); }}
                  className="text-gray-500"
                >
                  Refresh Devices
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Customer-Facing Display</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700">
                    Display Port (VFD)
                  </Label>
                  <select
                    value={localPosSettings.customerDisplayPort || ''}
                    onChange={(e) =>
                      setLocalPosSettings({
                        ...localPosSettings,
                        customerDisplayPort: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm h-10"
                  >
                    <option value="">Select port...</option>
                    {availablePorts.map((port) => (
                      <option key={port.path} value={port.path}>
                        {port.path} {port.friendlyName ? `- ${port.friendlyName}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Connects to the monitor/pole at the back of the POS.</p>
                </div>

              </div>

              {/* Display Test Panel */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Display</p>

                {/* Amount test buttons */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Send a test amount:</p>
                  <div className="flex flex-wrap gap-2">
                    {['10.00', '50.00', '99.99', '150.00'].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        disabled={!localPosSettings.customerDisplayPort}
                        onClick={async () => {
                          try {
                            await window.electron.invoke('update-customer-display', localPosSettings.customerDisplayPort, amount);
                            toast.success(`Sent ${amount} to display`);
                          } catch (err: any) {
                            toast.error(`Test failed: ${err.message}`);
                          }
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 font-mono"
                      >
                        {amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!localPosSettings.customerDisplayPort}
                    onClick={async () => {
                      try {
                        await window.electron.invoke('update-customer-display', localPosSettings.customerDisplayPort, '0.00');
                        toast.success('Display cleared to 0.00');
                      } catch (err: any) {
                        toast.error(`Clear failed: ${err.message}`);
                      }
                    }}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    Clear Display (0.00)
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!localPosSettings.customerDisplayPort}
                    onClick={async () => {
                      try {
                        await window.electron.invoke('update-customer-display', localPosSettings.customerDisplayPort, '0.00');
                        toast.success('Welcome message sent to display');
                      } catch (err: any) {
                        toast.error(`Test failed: ${err.message}`);
                      }
                    }}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    Test Welcome Message
                  </Button>
                </div>

                {!localPosSettings.customerDisplayPort && (
                  <p className="text-xs text-amber-600">Select a display port above to enable test buttons.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">On-Screen Keyboard</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Auto-open Keyboard</p>
                  <p className="text-xs text-gray-500">Automatically open Windows on-screen keyboard when clicking an input field.</p>
                </div>
                <Switch
                  checked={localPosSettings.autoOpenKeyboard || false}
                  onCheckedChange={(checked) =>
                    setLocalPosSettings({
                      ...localPosSettings,
                      autoOpenKeyboard: checked,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSavePosSettings}
                className="bg-primary text-white hover:bg-primary"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === 'tables' && isManager && (
        <SectionCard title="Table Management" className='relative'>
          <div className="space-y-4">
            <Button className='absolute top-5 right-6 z-10' onClick={() => setIsAddTableDialogOpen(true)}>
              Add Table
            </Button>

            <div className="mt-4">
              {tablesLoading ? (
                <div className="text-center py-8">
                  <div className="text-lg">Loading tables...</div>
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-lg text-gray-500">No tables found</div>
                  <div className="text-sm text-gray-400 mt-2">Add your first table to get started</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Table Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tables.map((table) => (
                        <tr key={table.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {table.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {table.capacity ? `${table.capacity} seats` : 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              table.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {table.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingTable(table)}
                              className="mr-2"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteTable(table.id!)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <AddEditTableDialog
            open={isAddTableDialogOpen}
            onOpenChange={setIsAddTableDialogOpen}
            onSave={handleAddTable}
            loading={tablesLoading}
          />

          <AddEditTableDialog
            open={!!editingTable}
            onOpenChange={(open) => !open && setEditingTable(null)}
            table={editingTable}
            onSave={handleUpdateTable}
            loading={tablesLoading}
          />
        </SectionCard>
      )}

      {activeTab === 'users' && isAdmin && (
        <SectionCard title="Users" className='relative'>
          <div className="space-y-4">
              <Button className='absolute top-5 right-6 z-10' onClick={() => setIsAddUserDialogOpen(true)}>
                Add User
              </Button>

            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.role}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                            className="mr-2"
                          >
                            Edit
                          </Button>
                          {user.role !== "admin" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <AddUserDialog
            open={isAddUserDialogOpen}
            onClose={() => setIsAddUserDialogOpen(false)}
            onSave={handleAddUser}
          />

          {editingUser && (
            <EditUserDialog
              user={editingUser}
              onClose={() => setEditingUser(null)}
              onSave={handleUpdateUser}
            />
          )}
        </SectionCard>
      )}

      {activeTab === 'logs' && isAdmin && (
        <SectionCard title="System Logs" className='relative'>
          <div className="space-y-4">
              <Button className='absolute top-5 right-6 z-10' onClick={fetchLogs} disabled={logsLoading}>
                {logsLoading ? 'Loading...' : 'Refresh Logs'}
              </Button>

            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date/Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Page
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Context
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.admin_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.admin_role || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.page || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          <HoverCard>
                             <HoverCardTrigger asChild>

                          <div className="truncate">
                            {formatContext(log.context)}
                          </div>
                             </HoverCardTrigger>
                             <HoverCardContent className="w-full max-w-md max-h-[50vh] overflow-hidden overflow-y-auto">
                                <div className="flex justify-between gap-4">
                                  <div className="size-10 bg-muted/60 rounded-full flex-shrink-0 flex items-center justify-center">
                                    <Code className="size-4 text-muted-foreground" />
                                  </div>
                                  <div className="space-y-1 overflow-hidden">
                                    <span className='font-medium'>Context:</span>
                                    <p className="break-words text-sm text-muted-foreground">
                                      {formatContext(log.context)}
                                    </p>
                                  </div>
                                </div>
                              </HoverCardContent>
                          </HoverCard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logs.length === 0 && !logsLoading && (
                <div className="text-center py-8 text-gray-500">
                  No system logs found
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === 'theme' && (
        <SectionCard title="Theme Settings">
          <div className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700">
                Theme Mode
              </Label>
              <select
                value={settings?.theme?.mode || 'light'}
                onChange={(e) =>
                  updateSettings({
                    theme: {
                      mode: e.target.value as 'light' | 'dark',
                      primaryColor: settings?.theme?.primaryColor,
                    },
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700">
                Primary Color
              </Label>
              <Input
                type="color"
                value={settings?.theme?.primaryColor || '#4F46E5'}
                onChange={(e) =>
                  updateSettings({
                    theme: {
                      mode: settings?.theme?.mode || 'light',
                      primaryColor: e.target.value,
                    },
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
              />
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === 'backup' && (
        <SectionCard title="Backup & Restore">
          <div className="space-y-6">
            <div>
              <Button
                onClick={exportDatabase}
                className="bg-primary text-white hover:bg-primary"
              >
                Export Database
              </Button>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700">
                Import Database
              </Label>
              <Input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const data = event.target?.result as string;
                      importDatabase(data);
                    };
                    reader.readAsText(file);
                  }
                }}
                className="mt-1 block w-full"
              />
            </div>
            <div className="pt-4 border-t">
              <Label className="block text-sm font-medium text-red-700 mb-2">
                Danger Zone
              </Label>
              <Button
                onClick={() => setShowClearDataDialog(true)}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                Clear All Data
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                This will permanently delete all orders, products, categories, tables, logs, and settings. 
                All users will be deleted except the default admin user (username: admin).
              </p>
            </div>
          </div>
        </SectionCard>
        )}
      </div>
    </div>
  );
};

export default Settings; 