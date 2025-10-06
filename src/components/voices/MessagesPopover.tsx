import React, { useState } from 'react';
import { Loader2, MailOpen, Mail, Reply } from 'lucide-react';
import messagesIcon from '@/assets/messagesicon.png';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface MessagePreview {
  id: string;
  fromDisplay: string;
  snippet: string;
  unread: boolean;
  createdAt: string;
}

interface MessagesPopoverProps {
  messages?: MessagePreview[];
  isLoading?: boolean;
  onOpenInbox?: () => void;
}

const mockMessages: MessagePreview[] = [
  {
    id: 'm1',
    fromDisplay: 'Elena R.',
    snippet: 'Loved the warmth in your recent recording…',
    unread: true,
    createdAt: '2m',
  },
  {
    id: 'm2',
    fromDisplay: 'Jonas',
    snippet: 'Would you be open to collaborating on…',
    unread: false,
    createdAt: '1h',
  },
];

export const MessagesPopover: React.FC<MessagesPopoverProps> = ({ messages = mockMessages, isLoading, onOpenInbox }) => {
  const [open, setOpen] = useState(false);
  const unreadCount = messages.filter(m => m.unread).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-10 w-10 md:h-12 md:w-12 flex items-center justify-center bg-card hover:bg-muted border border-card-border rounded-2xl shadow-card focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <img src={messagesIcon} alt="Messages" className="w-4 h-4 md:w-5 md:h-5" />
          <span className="sr-only">Messages</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center text-[10px] md:text-xs">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={messagesIcon} alt="Messages" className="w-4 h-4" />
            <h4 className="text-sm font-semibold">Messages</h4>
          </div>
          <Button size="sm" variant="ghost" onClick={onOpenInbox} className="text-xs">
            Open Inbox
          </Button>
        </div>
        <div className="h-60">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm px-4 text-center">
              <MailOpen className="w-5 h-5" />
              No messages yet.
              <span className="text-[11px]">Start listening to voices to unlock conversations.</span>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <ul className="divide-y">
                {messages.map(m => (
                  <li key={m.id} className="p-3 hover:bg-muted/40 transition flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1">
                        {m.unread ? <Mail className="w-3 h-3 text-primary" /> : <Reply className="w-3 h-3 text-muted-foreground" />}
                        {m.fromDisplay}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{m.createdAt}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {m.snippet}
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
        <div className="p-3 border-t flex justify-end">
          <Button size="sm" variant="secondary" onClick={onOpenInbox}>
            Go to Inbox
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
