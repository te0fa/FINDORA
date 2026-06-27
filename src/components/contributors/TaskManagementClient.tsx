'use client'

import React, { useState } from 'react'

export default function TaskManagementClient({ locale, initialTasks }: { locale: string, initialTasks: any[] }) {
  const isAr = locale === 'ar'
  const [tasks, setTasks] = useState(initialTasks)
  const [isCreating, setIsCreating] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    taskType: 'market_intel',
    titleEn: '', titleAr: '',
    descriptionEn: '', descriptionAr: '',
    requiredRole: '', minLevel: 1, minTrustScore: 0,
    baseRewardEgp: 0, baseRewardPoints: 50, timeLimitMinutes: 60, priority: 0
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const res = await fetch('/api/staff/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requiredRole: formData.requiredRole === '' ? null : formData.requiredRole
        })
      })
      const data = await res.json()
      if (data.success) {
        setTasks([data.task, ...tasks])
        alert(isAr ? 'تم إنشاء المهمة بنجاح.' : 'Task created successfully.')
        setFormData({
          taskType: 'market_intel',
          titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '',
          requiredRole: '', minLevel: 1, minTrustScore: 0,
          baseRewardEgp: 0, baseRewardPoints: 50, timeLimitMinutes: 60, priority: 0
        })
      } else {
        alert(data.error || 'Failed to create task')
      }
    } catch (err) {
      alert('Error creating task')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white">
          {isAr ? 'إدارة وإنشاء المهام 🏗️' : 'Task Creation & Management 🏗️'}
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Create Form */}
        <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl h-fit">
          <h3 className="text-lg font-bold text-white mb-4">{isAr ? 'إنشاء مهمة جديدة' : 'Create New Task'}</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-[hsl(220,10%,60%)] mb-1 block">Title (English)</label>
                <input required value={formData.titleEn} onChange={e => setFormData({...formData, titleEn: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-[hsl(220,10%,60%)] mb-1 block">Title (Arabic)</label>
                <input required value={formData.titleAr} onChange={e => setFormData({...formData, titleAr: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-[hsl(220,10%,60%)] mb-1 block">Description (EN)</label>
                <textarea required rows={2} value={formData.descriptionEn} onChange={e => setFormData({...formData, descriptionEn: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"></textarea>
              </div>
              <div>
                <label className="text-xs font-bold text-[hsl(220,10%,60%)] mb-1 block">Description (AR)</label>
                <textarea required rows={2} value={formData.descriptionAr} onChange={e => setFormData({...formData, descriptionAr: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"></textarea>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-[hsl(220,10%,60%)] mb-1 block">Target Role</label>
                <select value={formData.requiredRole} onChange={e => setFormData({...formData, requiredRole: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none">
                  <option value="">Any (All Roles)</option>
                  <option value="field_scout">Field Scout</option>
                  <option value="store_insider">Store Insider</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[hsl(220,10%,60%)] mb-1 block">Min Level</label>
                <input type="number" min="1" max="5" required value={formData.minLevel} onChange={e => setFormData({...formData, minLevel: Number(e.target.value)})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-[hsl(220,10%,60%)] mb-1 block">Min Trust Score</label>
                <input type="number" min="0" max="100" required value={formData.minTrustScore} onChange={e => setFormData({...formData, minTrustScore: Number(e.target.value)})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-[hsl(152,69%,51%)] mb-1 block">Reward EGP</label>
                <input type="number" required value={formData.baseRewardEgp} onChange={e => setFormData({...formData, baseRewardEgp: Number(e.target.value)})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(152,69%,51%)] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-[hsl(43,96%,56%)] mb-1 block">Reward Points</label>
                <input type="number" required value={formData.baseRewardPoints} onChange={e => setFormData({...formData, baseRewardPoints: Number(e.target.value)})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(43,96%,56%)] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-white mb-1 block">Priority (Higher=Top)</label>
                <input type="number" required value={formData.priority} onChange={e => setFormData({...formData, priority: Number(e.target.value)})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none" />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isCreating}
              className="w-full rounded-lg bg-[hsl(258,89%,66%)] py-4 font-bold text-white shadow-lg transition hover:bg-[hsl(258,89%,70%)] disabled:opacity-50 mt-4"
            >
              {isCreating ? 'Creating...' : (isAr ? 'نشر المهمة للمندوبين' : 'Publish Task')}
            </button>
          </form>
        </div>

        {/* Existing Open Tasks List */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">{isAr ? 'المهام المفتوحة حالياً' : 'Currently Open Tasks'}</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {tasks.filter(t => t.status === 'open').map(task => (
              <div key={task.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white">{isAr ? task.title_ar : task.title_en}</h4>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-white/10 px-2 py-1 rounded text-[hsl(220,10%,80%)]">Lvl {task.min_level}+</span>
                      {task.required_role && <span className="text-xs bg-white/10 px-2 py-1 rounded text-[hsl(220,10%,80%)]">{task.required_role}</span>}
                      {task.priority > 0 && <span className="text-xs bg-[hsl(0,84%,60%,0.2)] text-[hsl(0,84%,60%)] px-2 py-1 rounded">High Priority</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {task.base_reward_egp > 0 && <div className="text-sm font-bold text-[hsl(152,69%,51%)]">{task.base_reward_egp} EGP</div>}
                    {task.base_reward_points > 0 && <div className="text-sm font-bold text-[hsl(43,96%,56%)]">{task.base_reward_points} Pts</div>}
                  </div>
                </div>
              </div>
            ))}
            {tasks.filter(t => t.status === 'open').length === 0 && (
              <div className="text-center text-[hsl(220,10%,60%)] py-8">{isAr ? 'لا توجد مهام مفتوحة' : 'No open tasks'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
