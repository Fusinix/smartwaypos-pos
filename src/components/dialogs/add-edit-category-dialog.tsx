import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Category, NewCategory } from '@/types/category';

interface AddEditCategoryDialogProps {
    category?: Category;
    open: boolean;
    onClose: () => void;
    onSave: (category: NewCategory) => Promise<void>;
}

export function AddEditCategoryDialog({
    category,
    open,
    onClose,
    onSave,
}: AddEditCategoryDialogProps) {
    const [formData, setFormData] = useState<NewCategory>({
        name: '',
        description: '',
        status: 'active',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                description: category.description || '',
                status: category.status,
            });
        } else {
            setFormData({
                name: '',
                description: '',
                status: 'active',
            });
        }
    }, [category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            return;
        }
        
        setIsSubmitting(true);
        try {
            await onSave(formData);
            setFormData({
                name: '',
                description: '',
                status: 'active',
            });
            onClose();
        } catch (error) {
            console.error('Error saving category:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {category ? 'Edit Category' : 'Add New Category'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="status"
                                checked={formData.status === 'active'}
                                onCheckedChange={(checked: boolean) =>
                                    setFormData({
                                        ...formData,
                                        status: checked ? 'active' : 'inactive',
                                    })
                                }
                                disabled={isSubmitting}
                            />
                            <Label htmlFor="status">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                        >
                            {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 