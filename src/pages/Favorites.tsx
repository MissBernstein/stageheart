import { useState } from 'react';
import { Music, MoreVertical, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCategories } from '@/hooks/useCategories';
import { useFavorites } from '@/hooks/useFavorites';
import { CategoryManageDialog } from '@/components/CategoryManageDialog';
import { FavoriteCategoryModal } from '@/components/FavoriteCategoryModal';
import { toast } from 'sonner';

export default function Favorites() {
  const navigate = useNavigate();
  const { categories, deleteCategory, getSongsByCategory } = useCategories();
  const { favorites, removeFavorite } = useFavorites();
  
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; categoryId: string; currentName: string }>({
    open: false,
    categoryId: '',
    currentName: ''
  });
  
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; categoryId: string; categoryName: string }>({
    open: false,
    categoryId: '',
    categoryName: ''
  });

  const [editingSong, setEditingSong] = useState<any>(null);

  const handleDeleteCategory = () => {
    deleteCategory(deleteDialog.categoryId);
    toast.success(`Deleted "${deleteDialog.categoryName}"`);
    setDeleteDialog({ open: false, categoryId: '', categoryName: '' });
  };

  const getSongsInCategory = (categoryId: string) => {
    const songIds = getSongsByCategory(categoryId);
    return favorites.filter(fav => songIds.includes(fav.id));
  };

  const uncategorizedSongs = favorites.filter(fav => {
    const songCategories = categories.flatMap(cat => 
      getSongsByCategory(cat.id).includes(fav.id) ? [cat.id] : []
    );
    return songCategories.length === 0;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">My Favorites</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No favorites yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start adding songs to your favorites from the library
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {categories.map(category => {
              const songs = getSongsInCategory(category.id);
              if (songs.length === 0) return null;

              return (
                <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
                  <div className="flex items-center pr-4">
                    <AccordionTrigger className="flex-1 px-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">{category.name}</span>
                        <span className="text-sm text-muted-foreground">({songs.length})</span>
                        {category.isPreset && (
                          <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                            preset
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setRenameDialog({
                            open: true,
                            categoryId: category.id,
                            currentName: category.name
                          })}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteDialog({
                            open: true,
                            categoryId: category.id,
                            categoryName: category.name
                          })}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {songs.map(song => (
                        <div
                          key={song.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{song.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSong(song)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Edit Categories
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                removeFavorite(song);
                                toast.success('Removed from favorites');
                              }}
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}

            {uncategorizedSongs.length > 0 && (
              <AccordionItem value="uncategorized" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">Uncategorized</span>
                    <span className="text-sm text-muted-foreground">({uncategorizedSongs.length})</span>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {uncategorizedSongs.map(song => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{song.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSong(song)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Edit Categories
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              removeFavorite(song);
                              toast.success('Removed from favorites');
                            }}
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}
      </main>

      <CategoryManageDialog
        mode="rename"
        open={renameDialog.open}
        onOpenChange={(open) => setRenameDialog({ ...renameDialog, open })}
        categoryId={renameDialog.categoryId}
        currentName={renameDialog.currentName}
      />

      <CategoryManageDialog
        mode="delete"
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        categoryId={deleteDialog.categoryId}
        categoryName={deleteDialog.categoryName}
        onConfirmDelete={handleDeleteCategory}
      />

      {editingSong && (
        <FavoriteCategoryModal
          song={editingSong}
          open={!!editingSong}
          onOpenChange={(open) => !open && setEditingSong(null)}
        />
      )}
    </div>
  );
}
