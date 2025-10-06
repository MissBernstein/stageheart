// @keep - Mock messages API abstraction (client-side only)
// KEEP: integration-pending - Will be replaced with real Supabase API calls
export type MessageType = 'dm' | 'meet' | 'comment' | 'system';

export interface MessageRecord {
  id: string;
  type: MessageType;
  from?: string;
  subject?: string;
  body: string;
  created_at: string; // ISO date
  unread: boolean;
}

let MOCK_MESSAGES: MessageRecord[] = Array.from({ length: 14 }).map((_, i) => {
  const t: MessageType[] = ['dm','meet','comment','system'];
  return {
    id: `m${i+1}`,
    type: t[i % 4],
    from: ['Sarah','Jon','Maya','System'][i%4],
    subject: ['Follow up','Meet request','New comment','Update'][i%4] + (i < 3 ? ' (new)' : ''),
    body: `Mock message #${i+1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus fermentum.`,
    created_at: new Date(Date.now() - i * 37 * 60_000).toISOString(),
    unread: i < 3,
  } as MessageRecord;
}).sort((a,b)=> b.created_at.localeCompare(a.created_at));

const delay = (ms:number) => new Promise(r=> setTimeout(r, ms));

export async function listMessages(): Promise<MessageRecord[]> {
  await delay(160);
  return MOCK_MESSAGES.map(m => ({ ...m }));
}

export async function markMessageRead(id: string) {
  await delay(40);
  const msg = MOCK_MESSAGES.find(m => m.id === id);
  if (msg) msg.unread = false;
  return { success: true };
}

export async function markMessagesRead(ids: string[]) {
  await delay(50);
  const set = new Set(ids);
  MOCK_MESSAGES = MOCK_MESSAGES.map(m => set.has(m.id) ? { ...m, unread:false } : m);
  return { success: true };
}

export async function markAllMessagesRead() {
  await delay(70);
  MOCK_MESSAGES = MOCK_MESSAGES.map(m => ({ ...m, unread:false }));
  return { success: true };
}

export async function sendReply(parentId: string, body: string) {
  await delay(120);
  return { success: true, id: `r_${Date.now()}`, parentId, body };
}
