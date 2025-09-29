import { Star, Trash2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useFavorites } from '@/hooks/useFavorites';
import { FeelingMap } from '@/types';

interface FavoritesDrawerProps {
  onSelectFavorite: (feelingMap: FeelingMap) => void;
}

export const FavoritesDrawer = ({ onSelectFavorite }: FavoritesDrawerProps) => {
  const { favorites, removeFavorite } = useFavorites();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          className="fixed top-6 right-6 z-50 h-12 px-4 bg-card hover:bg-muted border border-card-border rounded-2xl shadow-card"
        >
          <Star className="w-5 h-5 mr-2 text-star" />
          <span className="hidden sm:inline">Favorites</span>
          {favorites.length > 0 && (
            <span className="ml-2 bg-star text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {favorites.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md bg-card border-card-border">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-star fill-current" />
            Saved Feeling Maps
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <Music2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No saved feeling maps yet.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Save your favorite song maps to access them quickly!
              </p>
            </div>
          ) : (
            favorites.map((favorite, index) => (
              <div
                key={`${favorite.title}-${favorite.artist}-${index}`}
                className="bg-muted rounded-2xl p-4 border border-card-border hover:bg-secondary transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => onSelectFavorite(favorite)}
                    className="flex-1 text-left"
                  >
                    <h4 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                      {favorite.title}
                    </h4>
                    {favorite.artist && (
                      <p className="text-sm text-muted-foreground mb-2">
                        by {favorite.artist}
                      </p>
                    )}
                    {favorite.isVibeBasedMap && (
                      <p className="text-xs text-accent font-medium mb-2">
                        Vibe: {favorite.vibeLabel}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(favorite.core_feelings || favorite.emotions || []).slice(0, 3).map((feeling, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-emotion-bg text-emotion-text rounded-full"
                        >
                          {feeling}
                        </span>
                      ))}
                      {(favorite.core_feelings || favorite.emotions || []).length > 3 && (
                        <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                          +{(favorite.core_feelings || favorite.emotions || []).length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFavorite(favorite)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive-foreground p-2 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};