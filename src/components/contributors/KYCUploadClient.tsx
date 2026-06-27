'use client';
import React, { useState, useCallback } from 'react';

type KYCStep = 'front' | 'back' | 'selfie' | 'done';

interface KYCUploadClientProps {
  locale: string;
  contributorId: string;
  currentStatus?: string; // 'pending' | 'verified' | 'rejected' | null
}

const STEPS: Array<{ key: KYCStep; icon: string; label_ar: string; label_en: string; hint_ar: string; hint_en: string }> = [
  { key: 'front', icon: '🪪', label_ar: 'وجه البطاقة', label_en: 'ID Front', hint_ar: 'صورة واضحة للوجه الأمامي لبطاقة الرقم القومي', hint_en: 'Clear photo of the front of your National ID card' },
  { key: 'back', icon: '↩️', label_ar: 'ظهر البطاقة', label_en: 'ID Back', hint_ar: 'صورة واضحة للوجه الخلفي لبطاقة الرقم القومي', hint_en: 'Clear photo of the back of your National ID card' },
  { key: 'selfie', icon: '🤳', label_ar: 'صورة سيلفي', label_en: 'Selfie', hint_ar: 'صورة واضحة لوجهك مع إمساك البطاقة بجانب وجهك', hint_en: 'Clear photo of your face holding your ID card beside it' },
];

export default function KYCUploadClient({ locale, contributorId, currentStatus }: KYCUploadClientProps) {
  const isAr = locale === 'ar';
  const [currentStep, setCurrentStep] = useState(0);
  const [uploads, setUploads] = useState<Record<string, { file: File; preview: string; uploaded: boolean; path?: string }>>({});
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(currentStatus === 'pending' || currentStatus === 'verified');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [dragging, setDragging] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileSelect = useCallback(async (stepKey: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      return showToast(isAr ? 'يرجى رفع صورة فقط' : 'Please upload an image file', 'error');
    }
    if (file.size > 10 * 1024 * 1024) {
      return showToast(isAr ? 'الصورة أكبر من 10 ميجا' : 'Image must be under 10MB', 'error');
    }

    const preview = URL.createObjectURL(file);
    setUploads(p => ({ ...p, [stepKey]: { file, preview, uploaded: false } }));

    // Auto-upload immediately
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contributorId', contributorId);
      formData.append('fileType', stepKey);

      const res = await fetch('/api/contributors/kyc', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploads(p => ({ ...p, [stepKey]: { ...p[stepKey], uploaded: false } }));
        return showToast(data.error || 'Upload failed', 'error');
      }

      setUploads(p => ({ ...p, [stepKey]: { ...p[stepKey], uploaded: true, path: data.path } }));
      showToast(isAr ? 'تم الرفع ✅' : 'Uploaded ✅');
    } catch {
      showToast(isAr ? 'فشل الرفع' : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }, [contributorId, isAr]);

  const handleDrop = useCallback((e: React.DragEvent, stepKey: string) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(stepKey, file);
  }, [handleFileSelect]);

  const handleSubmitKYC = async () => {
    const allUploaded = STEPS.every(s => uploads[s.key]?.uploaded);
    if (!allUploaded) {
      return showToast(isAr ? 'يرجى رفع جميع الصور أولاً' : 'Please upload all required images', 'error');
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contributors/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorId,
          frontPath: uploads.front?.path,
          backPath: uploads.back?.path,
          selfiePath: uploads.selfie?.path,
        }),
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Error', 'error');
      setSubmitted(true);
      showToast(isAr ? 'تم إرسال طلب التوثيق بنجاح! سيتم المراجعة خلال 24 ساعة ✅' : 'KYC submitted! Review within 24 hours ✅');
    } finally {
      setSubmitting(false);
    }
  };

  // Already verified or pending
  if (currentStatus === 'verified') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#10b981' }}>{isAr ? 'تم التحقق من هويتك' : 'Identity Verified'}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{isAr ? 'حسابك موثق بالكامل' : 'Your account is fully verified'}</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>⏳</div>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#f59e0b' }}>{isAr ? 'طلبك قيد المراجعة' : 'Under Review'}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{isAr ? 'سيتم الرد خلال 24 ساعة' : 'You\'ll hear back within 24 hours'}</div>
      </div>
    );
  }

  const step = STEPS[currentStep];
  const stepUpload = uploads[step.key];
  const completedCount = STEPS.filter(s => uploads[s.key]?.uploaded).length;

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '0', fontFamily: "'Outfit','Cairo',sans-serif" }} dir={isAr ? 'rtl' : 'ltr'}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '14px 20px', borderRadius: 12, background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, color: 'white', fontWeight: 600, backdropFilter: 'blur(12px)' }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }} onClick={() => setCurrentStep(i)}>
            <div style={{ height: 4, borderRadius: 2, background: uploads[s.key]?.uploaded ? '#10b981' : i === currentStep ? '#6366f1' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
            <div style={{ fontSize: '0.72rem', color: uploads[s.key]?.uploaded ? '#10b981' : i === currentStep ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', fontWeight: 600, textAlign: 'center' }}>
              {uploads[s.key]?.uploaded ? '✓ ' : ''}{isAr ? s.label_ar : s.label_en}
            </div>
          </div>
        ))}
      </div>

      {/* Current Step Upload */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>{step.icon}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{isAr ? step.label_ar : step.label_en}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{isAr ? step.hint_ar : step.hint_en}</div>
          </div>
        </div>

        {/* Drop Zone */}
        <label
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => handleDrop(e, step.key)}
          style={{ display: 'block', border: `2px dashed ${dragging ? '#6366f1' : stepUpload?.uploaded ? '#10b981' : 'rgba(255,255,255,0.15)'}`, borderRadius: 16, padding: stepUpload?.preview ? 0 : '32px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragging ? 'rgba(99,102,241,0.05)' : stepUpload?.uploaded ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <input type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(step.key, f); }} style={{ display: 'none' }} />

          {stepUpload?.preview ? (
            <div style={{ position: 'relative' }}>
              <img src={stepUpload.preview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 10px', borderRadius: 8, background: stepUpload.uploaded ? 'rgba(16,185,129,0.9)' : 'rgba(245,158,11,0.9)', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                {stepUpload.uploaded ? (isAr ? '✓ تم الرفع' : '✓ Uploaded') : (isAr ? 'جاري الرفع...' : 'Uploading...')}
              </div>
              <div style={{ padding: '10px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                {isAr ? 'اضغط لتغيير الصورة' : 'Tap to change photo'}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
              <div style={{ fontWeight: 700, marginBottom: 4, color: 'rgba(255,255,255,0.8)' }}>{isAr ? 'اسحب الصورة هنا أو اضغط للاختيار' : 'Drag & drop or tap to select'}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>JPG, PNG — {isAr ? 'حتى 10 ميجا' : 'up to 10MB'}</div>
            </div>
          )}
        </label>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10 }}>
        {currentStep > 0 && (
          <button onClick={() => setCurrentStep(p => p - 1)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 700, cursor: 'pointer' }}>
            {isAr ? '← السابق' : '← Prev'}
          </button>
        )}
        {currentStep < STEPS.length - 1 ? (
          <button onClick={() => setCurrentStep(p => p + 1)} style={{ flex: 1, padding: '12px', background: stepUpload?.uploaded ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 800, cursor: 'pointer' }}>
            {isAr ? 'التالي →' : 'Next →'}
          </button>
        ) : (
          <button onClick={handleSubmitKYC} disabled={completedCount < 3 || submitting} style={{ flex: 1, padding: '12px', background: completedCount === 3 ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 800, cursor: completedCount === 3 ? 'pointer' : 'not-allowed', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? '...' : (isAr ? `🚀 إرسال (${completedCount}/3)` : `🚀 Submit (${completedCount}/3)`)}
          </button>
        )}
      </div>
    </div>
  );
}
