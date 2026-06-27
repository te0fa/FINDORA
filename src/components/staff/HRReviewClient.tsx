'use client'

import React, { useState } from 'react'

export default function HRReviewClient({ 
  pendingApplications, 
  locale 
}: { 
  pendingApplications: any[], 
  locale: string 
}) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(
    pendingApplications.length > 0 ? pendingApplications[0].id : null
  )

  const isAr = locale === 'ar'
  const selectedApp = pendingApplications.find(app => app.id === selectedAppId)

  const handleAction = async (action: 'approve' | 'reject' | 'request_info') => {
    if (!selectedApp) return
    // Mocking the action for the frontend UI. In reality, triggers a Server Action
    alert(`${action.toUpperCase()} action triggered for ${selectedApp.full_name}`)
  }

  if (pendingApplications.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[hsl(220,10%,60%)]">
        {isAr ? 'لا يوجد طلبات معلقة حالياً.' : 'No pending applications at the moment.'}
      </div>
    )
  }

  return (
    <div className="flex h-[80vh] overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[hsl(220,20%,12%)] shadow-2xl">
      
      {/* Sidebar List */}
      <div className="w-1/3 overflow-y-auto border-r border-[rgba(255,255,255,0.05)] bg-black/20">
        <div className="sticky top-0 bg-[hsl(220,20%,12%)] p-4 shadow-sm">
          <h2 className="text-lg font-bold text-white">{isAr ? 'قائمة الطلبات' : 'Applications'}</h2>
          <p className="text-xs text-[hsl(220,10%,60%)]">{pendingApplications.length} {isAr ? 'في الانتظار' : 'pending'}</p>
        </div>
        <div className="flex flex-col">
          {pendingApplications.map(app => (
            <button
              key={app.id}
              onClick={() => setSelectedAppId(app.id)}
              className={`border-b border-white/5 p-4 text-left transition ${
                selectedAppId === app.id ? 'bg-[hsl(258,89%,66%,0.1)] border-l-4 border-l-[hsl(258,89%,66%)]' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{app.full_name || 'Unnamed'}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-[hsl(220,10%,60%)]">{app.role}</span>
              </div>
              <p className="mt-1 text-xs text-[hsl(220,10%,60%)]">{new Date(app.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Split View Content */}
      {selectedApp && (
        <div className="flex w-2/3">
          
          {/* User Data (Left) */}
          <div className="w-1/2 border-r border-[rgba(255,255,255,0.05)] p-6 overflow-y-auto">
            <h3 className="mb-6 text-xl font-bold text-white">{isAr ? 'بيانات المتقدم' : 'Applicant Data'}</h3>
            
            <div className="space-y-4">
              <div className="rounded bg-black/30 p-3">
                <p className="text-xs text-[hsl(220,10%,60%)]">{isAr ? 'الاسم بالكامل' : 'Full Name'}</p>
                <p className="font-medium text-white">{selectedApp.full_name}</p>
              </div>
              
              <div className="rounded bg-black/30 p-3">
                <p className="text-xs text-[hsl(220,10%,60%)]">{isAr ? 'المدينة' : 'City'}</p>
                <p className="font-medium text-white">{selectedApp.city || 'N/A'}</p>
              </div>

              <div className="rounded bg-black/30 p-3">
                <p className="text-xs text-[hsl(220,10%,60%)]">{isAr ? 'الدور المطلوب' : 'Requested Role'}</p>
                <div className="mt-1 inline-block rounded bg-[hsl(258,89%,66%,0.2)] px-2 py-1 text-sm font-bold text-[hsl(258,89%,66%)]">
                  {selectedApp.role}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-bold text-white">{isAr ? 'المستندات المرفقة' : 'Uploaded Documents'}</p>
                <div className="flex h-32 items-center justify-center rounded border border-white/10 bg-black/30">
                  <span className="text-sm text-[hsl(220,10%,60%)]">
                    {isAr ? '[معاينة صورة البطاقة/الكارنيه]' : '[Document Preview]'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis (Right) */}
          <div className="flex w-1/2 flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="mb-6 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(258,89%,66%,0.2)] text-xl">🤖</span>
                <h3 className="text-xl font-bold text-white">{isAr ? 'تحليل الموارد البشرية' : 'AI HR Analysis'}</h3>
              </div>

              {/* Mock AI Analysis Result */}
              <div className="space-y-4">
                <div className="rounded-lg border border-[hsl(152,69%,51%,0.3)] bg-[hsl(152,69%,51%,0.05)] p-4">
                  <h4 className="mb-2 text-sm font-bold text-[hsl(152,69%,51%)]">{isAr ? 'التوصية: قبول' : 'Recommendation: APPROVE'}</h4>
                  <p className="text-sm text-white/80">
                    {isAr 
                      ? 'الإجابات متوافقة مع طبيعة الدور. المستندات تبدو سليمة ولا توجد علامات احتيال في التقييم المبدئي.' 
                      : 'Answers are highly relevant to the role. Documents appear valid and no fraud flags detected in preliminary check.'}
                  </p>
                </div>
                
                <div>
                  <h4 className="mb-2 text-sm font-bold text-white">{isAr ? 'إجابات المقابلة' : 'Interview Answers'}</h4>
                  <div className="rounded bg-black/30 p-3">
                    <p className="mb-1 text-xs font-medium text-[hsl(258,89%,66%)]">Q: What area are you most familiar with?</p>
                    <p className="text-sm text-white/80">"I know Nasr City and Heliopolis electronics markets very well."</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => handleAction('reject')}
                className="flex-1 rounded bg-black/30 py-3 font-bold text-[hsl(0,84%,60%)] hover:bg-[hsl(0,84%,60%,0.2)]"
              >
                {isAr ? 'رفض' : 'Reject'}
              </button>
              <button 
                onClick={() => handleAction('request_info')}
                className="flex-1 rounded bg-black/30 py-3 font-bold text-white hover:bg-white/10"
              >
                {isAr ? 'طلب بيانات' : 'Request Info'}
              </button>
              <button 
                onClick={() => handleAction('approve')}
                className="flex-1 rounded bg-[hsl(152,69%,51%)] py-3 font-bold text-white hover:bg-[hsl(152,69%,55%)] shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {isAr ? 'تفعيل' : 'Approve'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
