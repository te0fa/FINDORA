'use client'

import React from 'react'

interface Metrics {
  revenueEgp: number
  netProfitEgp: number
  averageMarginPct: number
  cacEgp: number
  ltvEgp: number
  activeContributors: number
  totalRequests: number
}

export default function InvestorDashboardClient({ locale, initialMetrics }: { locale: string, initialMetrics: Metrics }) {
  const isAr = locale === 'ar'
  const { revenueEgp, netProfitEgp, averageMarginPct, cacEgp, ltvEgp, activeContributors, totalRequests } = initialMetrics

  // For visual graphs, since the user requested no mock data, we will draw an empty state 
  // or a very simple representation of the actual zero/low values.

  return (
    <div className="space-y-8">
      {/* 1. Unit Economics Row */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Unit Economics</h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <div className="text-sm text-[hsl(220,10%,60%)] mb-1">Customer Acquisition Cost (CAC)</div>
            <div className="text-3xl font-bold text-[hsl(0,84%,60%)]">{cacEgp.toFixed(2)} EGP</div>
            <div className="text-xs text-[hsl(220,10%,40%)] mt-2">Marketing spend / New users</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <div className="text-sm text-[hsl(220,10%,60%)] mb-1">Lifetime Value (LTV)</div>
            <div className="text-3xl font-bold text-[hsl(152,69%,51%)]">{ltvEgp.toFixed(2)} EGP</div>
            <div className="text-xs text-[hsl(220,10%,40%)] mt-2">Gross revenue / Total users</div>
          </div>
          <div className="rounded-2xl border border-[hsl(43,96%,56%,0.3)] bg-[hsl(43,96%,56%,0.05)] p-6">
            <div className="text-sm text-[hsl(43,96%,56%)] mb-1 font-bold">LTV:CAC Ratio</div>
            <div className="text-3xl font-bold text-white">{cacEgp > 0 ? (ltvEgp / cacEgp).toFixed(1) : '∞'}</div>
            <div className="text-xs text-[hsl(43,96%,56%,0.7)] mt-2">Target &gt; 3.0x</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <div className="text-sm text-[hsl(220,10%,60%)] mb-1">Avg Platform Margin</div>
            <div className="text-3xl font-bold text-white">{averageMarginPct.toFixed(1)}%</div>
            <div className="text-xs text-[hsl(220,10%,40%)] mt-2">Cut taken across all requests</div>
          </div>
        </div>
      </div>

      {/* 2. Revenue & Growth Flow */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Revenue & Scale</h2>
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Revenue Breakdown */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[hsl(220,20%,12%)] to-black p-8 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">Aggregate Financials</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[hsl(220,10%,60%)]">Gross Merchandise Value (GMV)</span>
                <span className="text-xl font-bold text-white">{revenueEgp.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[hsl(220,10%,60%)]">Contributor Payouts (COGS)</span>
                <span className="text-xl font-bold text-[hsl(0,84%,60%)]">-{(revenueEgp - netProfitEgp).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[hsl(152,69%,51%)] font-bold">Net Platform Profit</span>
                <span className="text-3xl font-extrabold text-[hsl(152,69%,51%)]">{netProfitEgp.toFixed(2)} EGP</span>
              </div>
            </div>
          </div>

          {/* Scale Metrics */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[hsl(220,20%,12%)] to-black p-8 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-[hsl(258,89%,66%)] opacity-20 blur-3xl"></div>
            <h3 className="text-lg font-bold text-white mb-6">Network Scale</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                <div className="text-sm text-[hsl(220,10%,60%)]">Total Market Requests</div>
                <div className="text-3xl font-bold text-white mt-1">{totalRequests}</div>
              </div>
              <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                <div className="text-sm text-[hsl(220,10%,60%)]">Approved Contributors</div>
                <div className="text-3xl font-bold text-[hsl(258,89%,66%)] mt-1">{activeContributors}</div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="text-xs text-[hsl(220,10%,60%)]">Network Density (Req/Contrib)</div>
              <div className="text-lg font-bold text-white">{activeContributors > 0 ? (totalRequests / activeContributors).toFixed(2) : 0}x</div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Empty State Chart Placeholder */}
      <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center mt-8">
        <div className="text-[hsl(220,10%,40%)] mb-2">📈 MRR & Cohort Retention Charts</div>
        <div className="text-sm text-[hsl(220,10%,30%)]">Insufficient historical data to render graphs. The system will plot data automatically as `investor_metrics_snapshots` populates over time.</div>
      </div>

    </div>
  )
}
