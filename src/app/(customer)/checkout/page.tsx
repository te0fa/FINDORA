'use client'

import { useState } from 'react';
import { acquireLock, releaseLock } from '@/lib/utils/checkoutLock';
import { setRequestId } from '@/lib/utils/logger';
import * as Sentry from '@sentry/nextjs';

export default function CheckoutPage({
  searchParams
}: {
  searchParams?: Promise<{ requestId?: string; sessionId?: string; offerId?: string; amount?: string }>
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    // Simulated checkout execution delay / API call
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  async function onSubmit() {
    setError(null);
    setIsProcessing(true);
    const resolvedParams = searchParams ? await searchParams : undefined;
    const currentRequestId = resolvedParams?.requestId || resolvedParams?.sessionId || 'checkout_session';
    setRequestId(currentRequestId);
    Sentry.setTag('request_id', currentRequestId);

    // 1️⃣ طلب القفل
    const lockAcquired = await acquireLock(currentRequestId);
    if (!lockAcquired) {
      setError('عملية إتمام الشراء قيد التنفيذ بالفعل. يرجى الانتظار.');
      setIsProcessing(false);
      return;
    }

    try {
      // 2️⃣ تنفيذ المنطق الأصلي للـ checkout
      await handleCheckout();
      // 3️⃣ تحرير القفل عند النجاح
      await releaseLock(currentRequestId);
    } catch (e: any) {
      // في حالة الفشل – حرّر القفل كذلك
      await releaseLock(currentRequestId);
      setError(e.message ?? 'فشل إتمام الشراء');
      Sentry.captureException(e);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <section className="min-h-screen bg-[hsl(220,25%,8%)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/60 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-2xl font-extrabold text-white mb-6 text-center">إتمام الشراء</h1>
        <button
          disabled={isProcessing}
          onClick={onSubmit}
          className="btn-primary w-full py-3 bg-[hsl(152,69%,51%)] disabled:opacity-50 text-black font-bold rounded-xl hover:bg-[hsl(152,69%,61%)] transition"
        >
          {isProcessing ? 'جاري المعالجة…' : 'إتمام الشراء'}
        </button>
        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
      </div>
    </section>
  );
}
