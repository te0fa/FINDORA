import { createClient } from '@/lib/supabase/server'
import { getCustomerByAuthId, createAdminClient } from '@/lib/dal/customers'
import { getCustomerRequests } from '@/lib/dal/requests'
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import { redirect } from 'next/navigation'
import RequestDetailsClient from './RequestDetailsClient'
import { getRequestMessages } from '@/lib/dal/messages'

export default async function RequestDetailsPage({
  params
}: {
  params: Promise<{ locale: string, id: string }>
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as Locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/auth/login`)

  const customer = await getCustomerByAuthId(user.id)
  if (!customer) redirect(`/${locale}/auth/login`)

  // Fetch request details
  const requests = await getCustomerRequests(customer.id)
  const request = requests.find((r: any) => r.request_id === id)
  if (!request) redirect(`/${locale}/dashboard`)

  // Fetch messages (chat)
  const messages = await getRequestMessages(id)

  // Fetch email/outbound notifications sent for this request
  let notifications: any[] = []
  try {
    const adminClient = await createAdminClient()
    const { data } = await adminClient
      .from('outbound_messages')
      .select('id, template_code, rendered_subject, rendered_body, status, channel, created_at')
      .eq('request_id', id)
      .order('created_at', { ascending: true })
    notifications = data ?? []
  } catch {
    notifications = []
  }

  return (
    <div className="animate-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <RequestDetailsClient 
        request={request} 
        initialMessages={messages}
        notifications={notifications}
        locale={locale} 
        dict={dict} 
        customerId={customer.id} 
      />
    </div>
  )
}
