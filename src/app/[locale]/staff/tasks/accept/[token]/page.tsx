import React from 'react'
import { verifyAcceptanceToken, acceptTaskWithToken } from '@/lib/dal/staff'
import { createAdminClient } from '@/lib/dal/customers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AcceptTaskPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string, locale: string }>,
  searchParams: Promise<{ error?: string }>
}) {
  const { token, locale } = await params
  const { error: queryError } = await searchParams
  const isRTL = locale === 'ar'

  const verified = verifyAcceptanceToken(token)
  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,8%)] text-white px-4">
        <div className="card glass-card max-w-md w-full p-8 text-center space-y-6 border border-red-500/20">
          <div className="text-5xl text-red-500">⚠️</div>
          <h1 className="text-2xl font-black">{isRTL ? 'رابط غير صالح أو منتهي الصلاحية' : 'Invalid or Expired Link'}</h1>
          <p className="text-slate-400 text-sm">
            {isRTL 
              ? 'يبدو أن رابط قبول المهمة هذا غير صالح، أو انتهت صلاحيته (تنتهي الصلاحية بعد 48 ساعة من التعيين).'
              : 'This task acceptance link is either invalid or has expired (links expire 48 hours after assignment).'}
          </p>
          <Link href={`/${locale}/staff/dashboard`} className="link block mt-4 text-accent font-bold">
            {isRTL ? 'الذهاب للوحة تحكم الموظفين' : 'Go to Staff Dashboard'}
          </Link>
        </div>
      </div>
    )
  }

  const db = await createAdminClient()
  const { data: request } = await db
    .from('requests')
    .select('id, request_code, title, raw_description, reviewer_assignment_status')
    .eq('id', verified.requestId)
    .single()

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,8%)] text-white px-4">
        <div className="card glass-card max-w-md w-full p-8 text-center space-y-6">
          <h1 className="text-2xl font-black">{isRTL ? 'المهمة غير موجودة' : 'Task Not Found'}</h1>
          <p className="text-slate-400 text-sm">
            {isRTL ? 'لم يتم العثور على الطلب المرتبط بهذه المهمة.' : 'The request associated with this assignment could not be found.'}
          </p>
        </div>
      </div>
    )
  }

  const isAlreadyAccepted = request.reviewer_assignment_status === 'accepted'

  const handleAcceptAction = async () => {
    'use server'
    const res = await acceptTaskWithToken(token)
    if (res.success) {
      redirect(`/${locale}/staff/workspace/${res.requestId}`)
    } else {
      redirect(`/${locale}/staff/tasks/accept/${token}?error=${encodeURIComponent(res.error || '')}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,8%)] text-white px-4">
      <div className="card glass-card max-w-lg w-full p-8 space-y-6 border border-white/10 rounded-3xl bg-gradient-to-br from-black/80 to-accent/5 shadow-[0_0_50px_rgba(212,166,60,0.05)]">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <span className="badge badge-gold py-1 px-3 bg-accent/20 border-accent/30 text-accent font-black text-xs uppercase tracking-wider mb-2 inline-block">
            {isRTL ? 'تعيين مهمة جديدة' : 'New Task Assignment'}
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-2">{isRTL ? 'مهمة مراجعة الطلب' : 'Request Review Task'}</h1>
        </div>

        {queryError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm text-center">
            {queryError}
          </div>
        )}

        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{isRTL ? 'كود الطلب:' : 'Request Code:'}</span>
            <strong className="text-white">{request.request_code}</strong>
          </div>
          <div className="text-sm font-bold text-white border-t border-white/5 pt-2">
            {request.title}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-h-24 overflow-y-auto">
            {request.raw_description}
          </p>
        </div>

        {isAlreadyAccepted ? (
          <div className="text-center space-y-4">
            <div className="text-emerald-400 font-bold flex items-center justify-center gap-2">
              <span>✔</span> {isRTL ? 'لقد قبلت هذه المهمة بالفعل!' : 'You have already accepted this task!'}
            </div>
            <Link href={`/${locale}/staff/workspace/${request.id}`} className="btn-accent w-full block py-3 text-center rounded-xl font-bold">
              {isRTL ? 'الذهاب لبيئة العمل' : 'Go to Workspace'}
            </Link>
          </div>
        ) : (
          <form action={handleAcceptAction} className="space-y-4">
            <p className="text-xs text-center text-slate-400">
              {isRTL 
                ? 'بالنقر على زر القبول، سيتم تأكيد استلامك للطلب وسيجري تحويلك مباشرةً إلى صفحة بيئة العمل للبدء.'
                : 'By clicking accept, you confirm you are taking on this request review and will be redirected to the workspace.'}
            </p>
            <button type="submit" className="btn-accent w-full py-4 rounded-xl transition-all font-black text-base shadow-[0_0_30px_rgba(212,166,60,0.2)]">
              {isRTL ? 'قبول المهمة والبدء' : 'Accept Task & Begin'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
