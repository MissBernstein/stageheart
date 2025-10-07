import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, Heart, Mail } from 'lucide-react';
import { ProceduralAvatar } from '@/components/ui/ProceduralAvatar';
import { useVoiceAvatar } from '@/hooks/useVoiceAvatar';

interface ProfileBadgeProps {
  displayName?: string | null;
  email?: string | null;
  onLogout?: () => void;
  avatarUrl?: string | null;
  favoritesCount?: number;
  unreadMessagesCount?: number;
  onNavigateFavorites?: () => void;
  onNavigateInbox?: () => void;
  onOpenChange?: (open: boolean) => void;
  onOpenSettings?: () => void;
  onOpenMyProfile?: () => void;
}

export const ProfileBadge: React.FC<ProfileBadgeProps> = ({
  displayName,
  email,
  onLogout,
  avatarUrl,
  favoritesCount = 0,
  unreadMessagesCount = 0,
  onNavigateFavorites,
  onNavigateInbox,
  onOpenChange,
  onOpenSettings,
  onOpenMyProfile,
}) => {
  const navigate = useNavigate();
  const initial = (displayName || email || '?').charAt(0).toUpperCase();
  const voiceAvatarSeed = useVoiceAvatar();

  return (
  <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex items-center gap-2 rounded-full border border-card-border/60 bg-card/70 pl-1 pr-3 py-1.5 hover:bg-card/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <div className="relative">
            {avatarUrl ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={displayName || email || 'Profile'} />
                <AvatarFallback className="text-sm font-medium">
                  {initial}
                </AvatarFallback>
              </Avatar>
            ) : (
              <ProceduralAvatar seed={voiceAvatarSeed} className="h-8 w-8" />
            )}
            {unreadMessagesCount > 0 && (
              <>
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </span>
                <span className="sr-only">{unreadMessagesCount} unread messages</span>
              </>
            )}
          </div>
          <span className="text-xs md:text-sm font-medium text-card-foreground max-w-[90px] md:max-w-[140px] truncate">
            {displayName || email || 'Profile'}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold leading-tight truncate">{displayName || 'Your Profile'}</span>
          {email && <span className="text-[11px] text-muted-foreground truncate">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onOpenMyProfile ? onOpenMyProfile() : navigate('/app/p/me'); }} className="gap-2 cursor-pointer">
          <User className="w-4 h-4" />
          <span>My Voice Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onNavigateInbox || (() => navigate('/app/inbox'))}
          className="gap-2 cursor-pointer"
        >
          <Mail className="w-4 h-4" />
          <span className="flex-1">Messages</span>
          {unreadMessagesCount > 0 && (
            <span className="ml-auto bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium">
              {unreadMessagesCount}
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onNavigateFavorites || (() => navigate('/favorites'))}
          className="gap-2 cursor-pointer"
        >
          <Heart className="w-4 h-4" />
          <span className="flex-1">Favorites</span>
          {favoritesCount > 0 && (
            <span className="ml-auto bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 rounded-md font-medium">
              {favoritesCount}
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { onOpenSettings ? onOpenSettings() : navigate('/app/settings'); }} className="gap-2 cursor-pointer">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
