import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import { toast } from 'sonner';

interface CategoryManageDialogProps {
  mode: 'rename' | 'delete';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  currentName?: string;
  categoryName?: string;
  onConfirmDelete?: () => void;
}

export function CategoryManageDialog({
  mode,
  open,
  onOpenChange,
  categoryId,
  currentName = '',
  categoryName = '',
  onConfirmDelete
}: CategoryManageDialogProps) {
  const { renameCategory, categories } = useCategories();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open && mode === 'rename') {
      setNewName(currentName);
    }
  }, [open, mode, currentName]);

  const handleRename = () => {
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
      toast.error('Category name cannot be empty');
      return;
    }

    if (categories.some(cat => cat.id !== categoryId && cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Category name already exists');
      return;
    }

    renameCategory(categoryId, trimmedName);
    toast.success('Category renamed');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newName.trim()) {
      e.preventDefault();
      handleRename();
    }
  };

  if (mode === 'rename') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="categoryName" className="mb-2 block">
              Category Name
            </Label>
            <Input
              id="categoryName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="Enter new name"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{categoryName}"? This will only remove the category, not the songs themselves.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirmDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
