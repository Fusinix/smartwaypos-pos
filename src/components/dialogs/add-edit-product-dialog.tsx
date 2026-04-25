import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getCategoryId, getCategoryName } from "@/lib/utils";
import type { NewProduct, Product } from "@/types/product";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AddEditProductDialogProps {
    product?: Product;
    open: boolean;
    categories: any;
    onClose: () => void;
    onSave: (product: NewProduct) => Promise<Product>;
}


export default function AddEditProductDialog({
    product,
    open,
    onClose,
    categories,
    onSave,
}: AddEditProductDialogProps) {
    const defaultProd:NewProduct = {
                      name: '',
                      description: '',
                      category: categories ? categories[0]?.name :"",
                      price: 0,
                      cost_price: 0,
                      stock: 0,
                      status: 'active',
                      image: ""
                  }
    const [formData, setFormData] = useState<NewProduct>(
        product
            ? {
                  name: product.name,
                  description: product.description || '',
                  category: getCategoryName(product.category as any, categories),
                  price: Number(product.price),
                  cost_price: Number(product.cost_price || 0),
                  stock: Number(product.stock),
                  status: product.status,
                  image: product.image || ""
              }
            : defaultProd
    );
    const [imagePreview, setImagePreview] = useState<string | null>(product?.image || null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSave({...formData, category: getCategoryId(formData.category as any,categories)});
            setFormData(defaultProd)
            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                setFormData((prev) => ({
                    ...prev,
                    image: reader.result as string,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>

                {categories && categories.length > 0 ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <Label htmlFor="category">Category</Label>
                            {
                                categories?.length ? 
                                <Select
                                    value={formData.category as any}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            category: value as any,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="capitalize">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category:any,index:number) => (
                                            <SelectItem key={index} value={category?.name} className="capitalize">
                                                {category?.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                :
                                null
                            }
                        </div>

                        <div>
                            <Label htmlFor="price">Selling Price</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        price: parseFloat(e.target.value),
                                    }))
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="cost_price">Cost Price</Label>
                            <Input
                                id="cost_price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.cost_price}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        cost_price: parseFloat(e.target.value),
                                    }))
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="stock">Stock Quantity</Label>
                            <Input
                                id="stock"
                                type="number"
                                min="0"
                                value={formData.stock}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        stock: parseInt(e.target.value, 10),
                                    }))
                                }
                                required
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="status"
                                checked={formData.status === 'active'}
                                onCheckedChange={(checked: boolean) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        status: checked ? 'active' : 'inactive',
                                    }))
                                }
                            />
                            <Label htmlFor="status">Active</Label>
                        </div>

                        <div>
                            <Label htmlFor="image">Product Image</Label>
                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                            {imagePreview && (
                                <img src={imagePreview} alt="Product Preview" className="mt-2 w-24 h-24 object-cover rounded" />
                            )}
                        </div>

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit">{product ? 'Save Changes' : 'Add Product'}</Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="text-gray-500">
                        <div>You must create a category before adding products.</div>
                        <Button className="mt-4" onClick={() => navigate('/categories')}>
                            Go to Categories
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
} 