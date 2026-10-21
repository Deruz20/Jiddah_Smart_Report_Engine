import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateNotificationParams {
  title: string;
  message: string;
  recipientId?: string | null;
  priority?: 'high' | 'medium' | 'normal';
  type?: string;
}

/**
 * Creates an event-driven notification in Supabase with 5-minute title+message deduplication.
 * Fails gracefully so secondary notification errors never abort primary database operations.
 */
export async function createSystemNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  try {
    const title = params.title.trim();
    const message = params.message.trim();
    const recipientId = params.recipientId || null;
    const priority = params.priority || 'normal';
    const type = params.type || 'info';

    if (!title || !message) return null;

    // Deduplication check: only suppress if BOTH title AND message match for the same recipient in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    let dupQuery = supabase
      .from('notifications')
      .select('id')
      .eq('title', title)
      .eq('message', message)
      .gte('created_at', fiveMinutesAgo);

    if (recipientId) {
      dupQuery = dupQuery.eq('recipient_id', recipientId);
    } else {
      dupQuery = dupQuery.is('recipient_id', null);
    }

    const { data: existing } = await dupQuery.limit(1);
    if (existing && existing.length > 0) {
      return { id: existing[0].id, deduplicated: true };
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          title,
          message,
          recipient_id: recipientId,
          priority,
          type,
          read: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('createSystemNotification insert warning:', error.message);
      return null;
    }

    return { id: data?.id, deduplicated: false };
  } catch (err: any) {
    console.warn('createSystemNotification error:', err?.message || err);
    return null;
  }
}
