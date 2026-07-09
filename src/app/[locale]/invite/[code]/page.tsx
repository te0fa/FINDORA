import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ locale: string; code: string }>
}

export default async function InviteRedirectPage({
  params
}: PageProps) {
  const { locale, code } = await params
  redirect(`/${locale}/auth/signup?ref=${code}`)
}
