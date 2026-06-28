'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea, Select, Checkbox, Toggle } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert, Modal, Tooltip } from '@/components/ui/Overlays';
import { Avatar, ProfileCard, EmptyState, LoadingSkeleton } from '@/components/ui/States';
import { Container, Grid, Stack, Section } from '@/components/layout/LayoutPrimitives';
import { Settings, Sparkles, AlertCircle, Info, CheckCircle2, Search, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';

export default function DesignSystemPreviewPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [toggleState, setToggleState] = useState(false);

  return (
    <Container size="xl" style={{ paddingBlock: 'var(--space-48)' }}>
      <Stack space="var(--space-48)">
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-24)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
            <span style={{ padding: '6px 12px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 800 }}>
              v1.0.0
            </span>
            <ShieldAlert size={28} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>
              لوحة نظام التصميم / Design System Playground
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-8)', fontSize: '1.05rem' }}>
            مستودع تجربة واجهات الاستخدام وعناصر نظام تصميم فايندورا المتكامل.
          </p>
        </div>

        {/* 1. Color System Preview */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-16)' }}>١. نظام الألوان / 1. Color System</h2>
          <Grid cols={{ sm: 2, md: 4 }} gap="var(--space-16)">
            {[
              { name: 'Primary (Foreground)', varName: 'var(--primary)', hex: '#f8fafc' },
              { name: 'Accent (Findora Gold)', varName: 'var(--accent)', hex: '#c8973b' },
              { name: 'Background', varName: 'var(--background)', hex: '#020617' },
              { name: 'Surface', varName: 'var(--surface)', hex: '#0b0f19' },
              { name: 'Success', varName: 'var(--success)', hex: '#22c55e' },
              { name: 'Warning', varName: 'var(--warning)', hex: '#f59e0b' },
              { name: 'Danger', varName: 'var(--danger)', hex: '#ef4444' },
              { name: 'Info', varName: 'var(--info)', hex: '#3b82f6' },
            ].map((color) => (
              <Card key={color.name} variant="default" style={{ padding: 'var(--space-16)' }}>
                <div style={{ height: '80px', borderRadius: 'var(--radius-sm)', background: color.varName, marginBottom: 'var(--space-12)', border: '1px solid var(--border)' }} />
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{color.name}</h4>
                <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{color.varName}</code>
              </Card>
            ))}
          </Grid>
        </div>

        {/* 2. Typography Scale */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-16)' }}>٢. مقاييس الخطوط / 2. Typography scale</h2>
          <Card variant="glass">
            <Stack space="var(--space-20)">
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Display XL (3.5rem)</span>
                <h3 className="font-display-xl" style={{ margin: 0 }}>فايندورا للتوريد الذكي / Findora Sourcing</h3>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>H1 (2.25rem)</span>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0 }}>أرسل طلبك، وسنبحث لك / Sourcing simplified</h1>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Body Regular (1rem)</span>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  فايندورا هي منصة تسوق ذكية مصرية — أرسل طلبك، وسنبحث لك عن أفضل الأسعار والموردين في مصر.
                </p>
              </div>
            </Stack>
          </Card>
        </div>

        {/* 3. Spacing System */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-16)' }}>٣. المسافات / 3. Spacing scale</h2>
          <Card variant="default">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[8, 12, 16, 24, 32, 48].map((size) => (
                <div key={size} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <code style={{ width: '80px', fontSize: '0.8rem' }}>{size}px</code>
                  <div style={{ height: '16px', background: 'var(--accent)', width: `${size * 4}px`, borderRadius: '4px', opacity: 0.8 }} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 4. Button System */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-16)' }}>٤. الأزرار / 4. Button system</h2>
          <Card variant="default">
            <Stack space="var(--space-20)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Button variant="primary">زر أساسي / Primary</Button>
                <Button variant="secondary">زر ثانوي / Secondary</Button>
                <Button variant="outline">إطار خارجي / Outline</Button>
                <Button variant="ghost">شفاف / Ghost</Button>
                <Button variant="danger">خطر / Danger</Button>
                <Button variant="success">ناجح / Success</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <Button variant="primary" isLoading={true}>قيد التحميل</Button>
                <Button variant="primary" disabled={true}>غير مفعّل</Button>
                <Button variant="primary" size="sm">زر صغير</Button>
                <Button variant="primary" size="lg">زر كبير</Button>
              </div>
            </Stack>
          </Card>
        </div>

        {/* 5. Input System */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-16)' }}>٥. المدخلات / 5. Input controls</h2>
          <Card variant="default">
            <Grid cols={{ sm: 1, md: 2 }} gap="var(--space-24)">
              <Input
                label="الاسم بالكامل / Full Name"
                placeholder="أدخل الاسم بالكامل"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Input
                label="البريد الإلكتروني مع خطأ / Email with Error"
                placeholder="email@example.com"
                error="يرجى إدخال بريد إلكتروني صحيح"
              />
              <Select
                label="المدينة / City"
                options={[
                  { label: 'القاهرة / Cairo', value: 'cairo' },
                  { label: 'الإسكندرية / Alexandria', value: 'alexandria' },
                ]}
              />
              <Textarea label="الملاحظات / Notes" placeholder="اكتب أي ملاحظات إضافية هنا..." />
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <Checkbox label="الموافقة على الشروط" />
                <Toggle label="استلام الإشعارات" checked={toggleState} onChange={() => setToggleState(!toggleState)} />
              </div>
            </Grid>
          </Card>
        </div>

        {/* 6. Badges & Overlays */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-16)' }}>٦. الشارات والتنبيهات / 6. Badges & alerts</h2>
          <Card variant="default">
            <Stack space="var(--space-24)">
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Badge variant="primary">افتراضي</Badge>
                <Badge variant="success" animated={true}>متصل الآن</Badge>
                <Badge variant="warning">قيد المراجعة</Badge>
                <Badge variant="danger">ملغي</Badge>
                <Badge variant="gold" outline={true}>عضوية ذهبية</Badge>
              </div>

              <Stack space="var(--space-12)">
                <Alert type="success" title="عملية ناجحة / Success">
                  تم إرسال الطلب بنجاح إلى الموردين والشركاء المعتمدين.
                </Alert>
                <Alert type="danger" title="خطأ في النظام / Failure">
                  لم نتمكن من العثور على أي موردين يطابقون خياراتك.
                </Alert>
              </Stack>
            </Stack>
          </Card>
        </div>

        {/* 7. Overlay Modals */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-16)' }}>٧. النوافذ المنبثقة / 7. Overlay Modals</h2>
          <Card variant="default" style={{ padding: 'var(--space-24)' }}>
            <Button variant="primary" onClick={() => setModalOpen(true)} style={{ width: 'auto' }}>
              فتح النافذة التجريبية / Open Demo Modal
            </Button>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="تأكيد التوريد / Sourcing Confirmation">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-24)' }}>
                هل تريد الاستمرار وتوزيع هذا الطلب للشركاء المتاحين في منطقتك الجغرافية؟
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="primary" onClick={() => setModalOpen(false)}>تأكيد التوزيع</Button>
                <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
              </div>
            </Modal>
          </Card>
        </div>

        {/* 8. States & Loading */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-16)' }}>٨. الحالات التفاعلية والتحميل / 8. States & Loading Skeletons</h2>
          <Card variant="default">
            <Stack space="var(--space-24)">
              <LoadingSkeleton rows={2} />
              <ProfileCard name="أحمد علي / Ahmed Ali" role="مسؤول فني / Tech Lead" email="ahmed.ali@findora.app" />
            </Stack>
          </Card>
        </div>
      </Stack>
    </Container>
  );
}
