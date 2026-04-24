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
import type { UserRole } from "@/types";
import type { NewUser } from "@/types/settings";
import { useState } from "react";

interface AddUserDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (user: NewUser) => Promise<void>;
}

export default function AddUserDialog({ open, onClose, onSave }: AddUserDialogProps) {
    const [newUser, setNewUser] = useState<NewUser>({
        username: '',
        password: '',
        role: 'cashier',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSave(newUser);
            setNewUser({
                username: '',
                password: '',
                role: 'cashier',
            });
            onClose();
        } catch (error) {
            console.error('Error adding user:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            type="text"
                            value={newUser.username}
                            onChange={(e) =>
                                setNewUser((prev: NewUser) => ({
                                    ...prev,
                                    username: e.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) =>
                                setNewUser((prev: NewUser) => ({
                                    ...prev,
                                    password: e.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="role">Role</Label>
                        <Select
                            value={newUser.role}
                            onValueChange={(value) =>
                                setNewUser((prev: NewUser) => ({
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
                        <Button type="submit">Add User</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 