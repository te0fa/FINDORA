import Link from 'next/link'
import Image from 'next/image'
import { signOut } from '../auth/actions'
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import CustomerNavClient from './CustomerNavClient'

export default async function CustomerLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020617', color: '#f8fafc', display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'visible' }}>
      <CustomerNavClient locale={locale} dict={dict} signOutAction={signOut} />
      <main className="flex-1 container py-8" style={{ flex: '1 0 auto', display: 'block', overflowY: 'visible' }}>
        {children}
      </main>
    </div>
  )
}
