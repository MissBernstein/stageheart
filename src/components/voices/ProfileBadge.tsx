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
import { LogOut, User, Settings, Mic2 } from 'lucide-react';

interface ProfileBadgeProps {
  displayName?: string | null;
  email?: string | null;
  onLogout?: () => void;
  avatarUrl?: string | null;
}

export const ProfileBadge: React.FC<ProfileBadgeProps> = ({ displayName, email, onLogout, avatarUrl }) => {
  const navigate = useNavigate();
  const initial = (displayName || email || '?').charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex items-center gap-2 rounded-full border border-card-border/60 bg-card/70 pl-1 pr-3 py-1.5 hover:bg-card/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName || email || 'Profile'} />}
            <AvatarFallback className="text-sm font-medium">
              {initial}
            </AvatarFallback>
          </Avatar>
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
        <DropdownMenuItem onClick={() => navigate('/app/voices')} className="gap-2 cursor-pointer">
          <Mic2 className="w-4 h-4" />
          <span>Voices & Profiles</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/app/p/me')} className="gap-2 cursor-pointer">
          <User className="w-4 h-4" />
          <span>My Voice Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/app/settings')} className="gap-2 cursor-pointer">
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
