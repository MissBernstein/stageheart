import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, MoreVertical, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { AnimatedAccordion, type AnimatedAccordionItem } from '@/ui/AnimatedAccordion';
import { AnimatedListItem } from '@/ui/AnimatedListItem';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCategories } from '@/hooks/useCategories';
import { useFavorites } from '@/hooks/useFavorites';
import { CategoryManageDialog } from '@/components/CategoryManageDialog';
import { FavoriteCategoryModal } from '@/components/FavoriteCategoryModal';
import generalHeartIcon from '@/assets/generalhearticon.png';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, motionDur, motionEase } from '@/ui/motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';

export default function Favorites() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { categories, deleteCategory, getSongsByCategory } = useCategories();
  const { favorites, removeFavorite } = useFavorites();
  const { success } = useToast();
  const prefersReducedMotion = usePrefersReducedMotion();
  const hoverLift = prefersReducedMotion ? undefined : { y: -2, scale: 1.02 };
  
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
  success(t('favorites.categoryDeleted', 'Category deleted'));
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

  const renderSongActions = (song: any) => (
    <div className="flex items-center gap-2 ml-4">
      <AnimatedButton
        variant="ghost"
        size="sm"
        onClick={() => setEditingSong(song)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {t('favorites.editCategories', 'Edit Categories')}
      </AnimatedButton>
      <AnimatedButton
        variant="ghost"
        size="icon"
        onClick={() => {
          removeFavorite(song);
          success(t('favorites.removed', 'Removed from Favorites'));
        }}
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
        <span className="sr-only">{t('favorites.remove', 'Remove from favorites')}</span>
      </AnimatedButton>
    </div>
  );

  const renderSongsList = (songs: any[]) => (
    <ul className="space-y-2">
      <AnimatePresence>
        {songs.map((song) => (
          <AnimatedListItem
            key={song.id}
            className="group overflow-hidden rounded-2xl border border-card-border/60 bg-card/60"
          >
            <motion.div
              className="flex items-center justify-between px-5 py-4 hover:bg-card/75"
              whileHover={hoverLift}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{song.title}</p>
                <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
              </div>
              {renderSongActions(song)}
            </motion.div>
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </ul>
  );

  const categoryItems: AnimatedAccordionItem[] = categories
    .map((category) => {
      const songs = getSongsInCategory(category.id);
      if (songs.length === 0) return null;

      return {
        id: category.id,
        title: (
          <div className="flex items-center gap-3">
            <span>{category.name}</span>
            <span className="text-sm text-muted-foreground">({songs.length})</span>
          </div>
        ),
  description: category.isPreset ? t('favorites.preset', 'Preset') : undefined,
        content: (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t('favorites.organize', 'Organize this category')}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AnimatedButton variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                    <span className="sr-only">{t('favorites.categoryActions', 'Category actions')}</span>
                  </AnimatedButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setRenameDialog({
                      open: true,
                      categoryId: category.id,
                      currentName: category.name,
                    })}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {t('favorites.rename', 'Rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteDialog({
                      open: true,
                      categoryId: category.id,
                      categoryName: category.name,
                    })}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('favorites.delete', 'Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {renderSongsList(songs)}
          </div>
        ),
      } as AnimatedAccordionItem;
    })
    .filter((item): item is AnimatedAccordionItem => Boolean(item));

  if (uncategorizedSongs.length > 0) {
    categoryItems.push({
      id: 'uncategorized',
      title: (
        <div className="flex items-center gap-3">
          <span>{t('favorites.uncategorized', 'Uncategorized')}</span>
          <span className="text-sm text-muted-foreground">({uncategorizedSongs.length})</span>
        </div>
      ),
      content: renderSongsList(uncategorizedSongs),
    });
  }

  return (
    <MotionIfOkay>
      <motion.div
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        className="min-h-screen bg-background"
      >
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <AnimatedButton variant="ghost" size="icon" onClick={() => navigate('/')} className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">{t('common.backToHome', 'Back to home')}</span>
            </AnimatedButton>
            <Link to="/" className="flex items-center gap-3">
              <img
                src={generalHeartIcon}
                alt="Heart icon"
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-2xl font-bold">{t('favorites.title')}</h1>
            </Link>
          </div>
        </header>

      <main className="container mx-auto px-4 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">{t('favorites.empty')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('favorites.emptyDesc')}</p>
          </div>
        ) : (
          <AnimatedAccordion items={categoryItems} type="multiple" className="space-y-3" />
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
      </motion.div>
    </MotionIfOkay>
  );
}
