// Real Supabase implementation for messages
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Message validation schema
const messageBodySchema = z.string()
  .trim()
  .min(1, 'Message cannot be empty')
  .max(5000, 'Message must be less than 5000 characters');

export type MessageType = 'dm' | 'meet' | 'comment' | 'system';

export interface MessageRecord {
  id: string;
  type: MessageType;
  from?: string;
  from_user_id?: string;
  subject?: string;
  body: string;
  created_at: string;
  unread: boolean;
}

export async function listMessages(): Promise<MessageRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      body,
      is_read,
      created_at,
      from_user_id,
      from:user_profiles(display_name)
    `)
    .eq('to_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  // Map to MessageRecord format
  return (data || []).map(msg => ({
    id: msg.id,
    type: 'dm' as MessageType,
    from: (msg.from as any)?.display_name || 'Unknown User',
    from_user_id: msg.from_user_id,
    body: msg.body,
    created_at: msg.created_at,
    unread: !msg.is_read
  }));
}

export async function markMessageRead(id: string) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('Error marking message as read:', error);
    return { success: false };
  }

  return { success: true };
}

export async function markMessagesRead(ids: string[]) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .in('id', ids);

  if (error) {
    console.error('Error marking messages as read:', error);
    return { success: false };
  }

  return { success: true };
}

export async function markAllMessagesRead() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false };
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('to_user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all messages as read:', error);
    return { success: false };
  }

  return { success: true };
}

export async function sendMessage(toUserId: string, body: string, subject?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate message body
  const validation = messageBodySchema.safeParse(body);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      to_user_id: toUserId,
      from_user_id: user.id,
      body
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    let friendly = error.message;
    const details = [error?.details, error?.hint].filter(Boolean).join(' ');
    const combined = [friendly, details].filter(Boolean).join(' ').toLowerCase();

    if (combined.includes('row level security') || combined.includes('violates row-level security')) {
      friendly = 'This performer does not currently accept direct messages.';
    } else if (combined.includes('not null') || combined.includes('null value')) {
      friendly = 'Message could not be sent because a required field was missing.';
    } else if (!friendly) {
      friendly = 'Message could not be sent. Please try again in a moment.';
    }

    return { success: false, error: friendly.trim() };
  }

  return { success: true, id: data.id };
}

export async function sendReply(parentId: string, body: string) {
  // For replies, we need to get the original message to find the sender
  const { data: originalMessage } = await supabase
    .from('messages')
    .select('from_user_id')
    .eq('id', parentId)
    .single();

  if (!originalMessage) {
    return { success: false, error: 'Original message not found' };
  }

  const result = await sendMessage(originalMessage.from_user_id, body);
  
  return {
    success: result.success,
    id: result.id || '',
    parentId,
    body
  };
}
