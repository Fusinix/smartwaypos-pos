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
import type { User, UserRole } from "@/types";
import { useState } from "react";

interface EditUserDialogProps {
    user: User;
    onClose: () => void;
    onSave: (user: User & { password?: string }) => Promise<void>;
}

export default function EditUserDialog({ user, onClose, onSave }: EditUserDialogProps) {
    const [editingUser, setEditingUser] = useState<User & { password?: string }>({
        ...user,
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSave(editingUser);
            onClose();
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            type="text"
                            value={editingUser.username}
                            onChange={(e) =>
                                setEditingUser((prev) => ({
                                    ...prev,
                                    username: e.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                        <Input
                            id="password"
                            type="password"
                            value={editingUser.password}
                            onChange={(e) =>
                                setEditingUser((prev) => ({
                                    ...prev,
                                    password: e.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="role">Role</Label>
                        <Select
                            value={editingUser.role}
                            onValueChange={(value) =>
                                setEditingUser((prev) => ({
                                    ...prev,
                                    role: value as UserRole,
                                }))
                            }
                        >
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cashier">Cashier</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


