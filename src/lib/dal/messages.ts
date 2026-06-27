import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:messages');


export type RequestMessage = {
  id: string;
  request_id: string;
  sender_type: 'customer' | 'staff' | 'system';
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  metadata: any;
}

export async function getRequestMessages(requestId: string): Promise<RequestMessage[]> {
  try {
    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('request_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })

    if (error) {
      // Table may not exist yet — return empty array silently
      if (error.code === 'PGRST205' || error.message?.includes('request_messages')) {
        return []
      }
      log.error('getRequestMessages error', { code: error.code, message: error.message })
      return []
    }

    return (data ?? []) as RequestMessage[]
  } catch {
    return []
  }
}

export async function sendMessage(requestId: string, message: string): Promise<RequestMessage> {
  // Verify auth first
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const adminClient = await createAdminClient()

  const { data, error } = await adminClient
    .from('request_messages')
    .insert({
      request_id: requestId,
      sender_type: 'customer',
      sender_id: user.id,
      message,
    })
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('request_messages')) {
      throw new Error('CHAT_NOT_CONFIGURED')
    }
    throw new Error(error.message || 'Failed to send message')
  }

  return data as RequestMessage
}

export async function markMessagesAsRead(requestId: string) {
  try {
    const adminClient = await createAdminClient()

    const { error } = await adminClient
      .from('request_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('request_id', requestId)
      .eq('sender_type', 'staff')
      .is('read_at', null)

    if (error && !error.message?.includes('request_messages')) {
      log.error('[DAL] markMessagesAsRead error:', error.message)
    }
  } catch {
    // Silently ignore if table doesn't exist
  }
}
