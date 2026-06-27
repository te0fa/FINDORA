import Link from 'next/link'

export default function OfflinePage({ params }: { params: { locale: string } }) {
  const isRTL = params.locale === 'ar'
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] text-white px-4 text-center">
      <div className="card glass-card p-10 max-w-md border border-accent/20 rounded-3xl shadow-[0_0_50px_rgba(212,166,60,0.05)] space-y-6">
        <div className="text-6xl animate-pulse">📡</div>
        <h1 className="text-3xl font-black text-white">
          {isRTL ? 'أنت غير متصل بالإنترنت' : 'You are Offline'}
        </h1>
        <p className="text-white/60 leading-relaxed text-sm">
          {isRTL 
            ? 'يبدو أنك تواجه مشكلة في الاتصال بالشبكة حالياً. جميع البيانات التي قمت بإدخالها للبحث الميداني تم حفظها محلياً على جهازك وسيتم مزامنتها تلقائياً عند عودة الاتصال.'
            : 'It looks like you are currently disconnected. Any field findings or quotes you input are saved locally and will auto-sync as soon as your connection is restored.'}
        </p>
        <Link href={`/${params.locale || 'ar'}/dashboard`}>
          <button className="btn-accent py-3 px-8 rounded-xl font-black text-sm transition-all shadow-[0_0_30px_rgba(212,166,60,0.2)]">
            {isRTL ? 'الذهاب للوحة التحكم' : 'Go to Dashboard'}
          </button>
        </Link>
      </div>
    </div>
  )
}
