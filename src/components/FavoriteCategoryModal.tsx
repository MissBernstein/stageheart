import { useState, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import { useFavorites } from '@/hooks/useFavorites';
import { FeelingMap } from '@/types';
import { toast } from 'sonner';

interface FavoriteCategoryModalProps {
  song: FeelingMap;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function FavoriteCategoryModal({ song, open, onOpenChange, onSave }: FavoriteCategoryModalProps) {
  const { categories, createCategory, setSongCategories, getSongCategories } = useCategories();
  const { addFavorite } = useFavorites();
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      const songCategories = getSongCategories(song.id);
      setSelectedCategories(songCategories);
      setNewCategoryName('');
      setIsCreating(false);
    }
  }, [open, song.id]);

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCreateCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      toast.error('Category name cannot be empty');
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }

    const newCategory = createCategory(trimmedName);
    setSelectedCategories(prev => [...prev, newCategory.id]);
    setNewCategoryName('');
    setIsCreating(false);
    toast.success(`Created "${trimmedName}"`);
  };

  const handleSave = () => {
    addFavorite(song);
    setSongCategories(song.id, selectedCategories);
    toast.success('Saved to favorites');
    onSave?.();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newCategoryName.trim()) {
      e.preventDefault();
      handleCreateCategory();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Favorites</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {song.title} - {song.artist}
          </p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            <Label className="text-sm font-medium">Select categories:</Label>
            
            {categories.map(category => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleToggleCategory(category.id)}
                />
                <label
                  htmlFor={category.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                >
                  {category.name}
                  {category.isPreset && (
                    <span className="ml-2 text-xs text-muted-foreground">(preset)</span>
                  )}
                </label>
              </div>
            ))}

            {isCreating ? (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    setNewCategoryName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="w-full mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create new category
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
