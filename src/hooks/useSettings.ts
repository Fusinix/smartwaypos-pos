import { useState, useEffect } from 'react';
import type { Settings, User, NewUser } from '../types/settings';
import { useAlertStore } from '../stores/useAlertStore';
import { useAuth } from '@/context/AuthContext';
import { useSettingsStore } from '../stores/useSettingsStore';

declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export const useSettings = () => {
  const { settings, setSettings } = useSettingsStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: adminUser } = useAuth();
  const { setLoading: setGlobalLoading, showSuccess, showError } = useAlertStore();

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        setGlobalLoading(true, "Loading settings...");
        
        const settingsData = await window.electron.invoke('get-settings');
        setSettings(settingsData);

        const usersData = await window.electron.invoke('get-users');
        setUsers(usersData);
      } catch (err) {
        console.error('Error initializing settings:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
        setError(errorMessage);
        showError(errorMessage);
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    };

    if (!settings) {
      initializeData();
    } else {
      setLoading(false);
    }
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      setGlobalLoading(true, "Updating settings...");
      await window.electron.invoke('update-settings', { ...newSettings, author: adminUser });
      const updatedSettings = await window.electron.invoke('get-settings');
      setSettings(updatedSettings);
      showSuccess('Settings updated successfully');
    } catch (err) {
      console.error('Error updating settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      showError(errorMessage);
      throw err;
    } finally {
      setGlobalLoading(false);
    }
  };

  const addUser = async (user: NewUser ) => {
    try {
      setGlobalLoading(true, "Adding user...");
      // console.log('Adding user with data:', user);
      
      if (!user.username || !user.password || !user.role) {
        throw new Error('Username, password, and role are required');
      }

      const users = await window.electron.invoke('add-user', { ...user, author:adminUser });
      // console.log('Users after adding:', users);
      setUsers(users);
      showSuccess(`User ${user.username} added successfully`);
    } catch (err) {
      console.error('Error adding user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user';
      showError(errorMessage);
      throw err;
    } finally {
      setGlobalLoading(false);
    }
  };

  const updateUser = async (id: number, user: Omit<User, 'id'>, ) => {
    try {
      setGlobalLoading(true, "Updating user...");
      // console.log('Updating user:', { id, user });
      await window.electron.invoke('update-user', id, { ...user, author:adminUser });
      const updatedUsers = await window.electron.invoke('get-users');
      setUsers(updatedUsers);
      showSuccess(`User ${user.username} updated successfully`);
    } catch (err) {
      console.error('Error updating user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      showError(errorMessage);
      throw err;
    } finally {
      setGlobalLoading(false);
    }
  };

  const deleteUser = async (id: number, ) => {
    try {
      setGlobalLoading(true, "Deleting user...");
      // console.log('Deleting user:', id);
      const userToDelete = users.find(u => u.id === id);
      await window.electron.invoke('delete-user', id, { author:adminUser });
      const updatedUsers = await window.electron.invoke('get-users');
      setUsers(updatedUsers);
      showSuccess(`User ${userToDelete?.username} deleted successfully`);
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      showError(errorMessage);
      throw err;
    } finally {
      setGlobalLoading(false);
    }
  };

  const exportDatabase = async () => {
    try {
      setGlobalLoading(true, "Exporting database...");
      const data = await window.electron.invoke('export-database', 'all', { author:adminUser });
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartwaypos-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Database exported successfully');
    } catch (err) {
      console.error('Error exporting database:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to export database';
      showError(errorMessage);
      throw err;
    } finally {
      setGlobalLoading(false);
    }
  };

  const importDatabase = async (data: string, ) => {
    try {
      setGlobalLoading(true, "Importing database...");
      // console.log('Importing database...');
      await window.electron.invoke('import-database', data, 'all', { author:adminUser });
      const updatedSettings = await window.electron.invoke('get-settings');
      const updatedUsers = await window.electron.invoke('get-users');
      setSettings(updatedSettings);
      setUsers(updatedUsers);
      showSuccess('Database imported successfully');
    } catch (err) {
      console.error('Error importing database:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to import database';
      showError(errorMessage);
      throw err;
    } finally {
      setGlobalLoading(false);
    }
  };

  const clearAllData = async () => {
    try {
      setGlobalLoading(true, "Clearing all data...");
      await window.electron.invoke('clear-all-data', { author: adminUser });
      // Reload settings and users after clearing
      const updatedSettings = await window.electron.invoke('get-settings');
      const updatedUsers = await window.electron.invoke('get-users');
      setSettings(updatedSettings);
      setUsers(updatedUsers);
      showSuccess('All data cleared successfully. Default admin user has been recreated.');
    } catch (err) {
      console.error('Error clearing all data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear all data';
      showError(errorMessage);
      throw err;
    } finally {
      setGlobalLoading(false);
    }
  };

  return {
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
  };
}; 