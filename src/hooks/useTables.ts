import { useState, useCallback } from 'react';
import type { Table } from '../types/settings';

export const useTables = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electron.invoke('get-tables');
      setTables(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tables';
      setError(errorMessage);
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTable = useCallback(async (table: Omit<Table, 'id'>, author: { id: number; name: string; role: string }) => {
    try {
      setError(null);
      const newTable = await window.electron.invoke('add-table', table, { author });
      setTables(prev => [...prev, newTable]);
      return newTable;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add table';
      setError(errorMessage);
      console.error('Error adding table:', err);
      throw err;
    }
  }, []);

  const updateTable = useCallback(async (table: Table, author: { id: number; name: string; role: string }) => {
    try {
      setError(null);
      const updatedTable = await window.electron.invoke('update-table', table, { author });
      setTables(prev => prev.map(t => t.id === table.id ? updatedTable : t));
      return updatedTable;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update table';
      setError(errorMessage);
      console.error('Error updating table:', err);
      throw err;
    }
  }, []);

  const deleteTable = useCallback(async (tableId: number, author: { id: number; name: string; role: string }) => {
    try {
      setError(null);
      await window.electron.invoke('delete-table', tableId, { author });
      setTables(prev => prev.filter(t => t.id !== tableId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete table';
      setError(errorMessage);
      console.error('Error deleting table:', err);
      throw err;
    }
  }, []);

  return {
    tables,
    loading,
    error,
    getTables,
    addTable,
    updateTable,
    deleteTable,
  };
}; 