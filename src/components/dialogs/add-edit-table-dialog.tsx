import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Table } from '@/types/settings';

interface AddEditTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table?: Table | null;
  onSave: (table: Omit<Table, 'id'>) => Promise<void>;
  loading?: boolean;
}

export const AddEditTableDialog: React.FC<AddEditTableDialogProps> = ({
  open,
  onOpenChange,
  table,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    status: 'active' as 'active' | 'inactive',
  });

  const isEditing = !!table;

  useEffect(() => {
    if (table) {
      setFormData({
        name: table.name,
        capacity: table.capacity?.toString() || '',
        status: table.status,
      });
    } else {
      setFormData({
        name: '',
        capacity: '',
        status: 'active',
      });
    }
  }, [table, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    try {
      await onSave({
        name: formData.name.trim(),
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        status: formData.status,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving table:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Table' : 'Add New Table'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Table Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Table 1, VIP Table, etc."
              required
            />
          </div>
          
          <div>
            <Label htmlFor="capacity">Capacity (Optional)</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => handleInputChange('capacity', e.target.value)}
              placeholder="e.g., 4"
              min="1"
            />
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'inactive') => 
                handleInputChange('status', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Saving...' : isEditing ? 'Update Table' : 'Add Table'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 