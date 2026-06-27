'use client';

import React from 'react';
import Link from 'next/link';

interface StaffPerf {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  interviewsCount: number;
  studiesCount: number;
  experimentsCount: number;
  totalContributions: number;
}

interface CRMClientProps {
  locale: string;
  summaryMetrics: {
    totalCustomers: number;
    totalMerchants: number;
    totalRequests: number;
    totalDeals: number;
    totalRevenue: number;
    custInterviewsCount: number;
    merchStudiesCount: number;
    experimentsCount: number;
  };
  staffPerformance: StaffPerf[];
  rawRequests: any[];
  rawPayments: any[];
  rawStudies: any[];
}

export default function CRMClient({
  locale,
  summaryMetrics,
  staffPerformance,
  rawRequests,
  rawPayments,
  rawStudies
}: CRMClientProps) {
  const isRTL = locale === 'ar';

  // Calculate Conversion Rate
  const conversionRate = summaryMetrics.totalRequests > 0 
    ? Math.round((summaryMetrics.totalDeals / summaryMetrics.totalRequests) * 100)
    : 0;

  // Group Specializations count for Donut Chart
  const specCounts: Record<string, number> = {};
  rawStudies.forEach((s: any) => {
    if (s.specialization) {
      specCounts[s.specialization] = (specCounts[s.specialization] || 0) + 1;
    }
  });

  const specData = Object.entries(specCounts).map(([name, value]) => ({ name, value })).slice(0, 5);
  const totalSpecStudies = specData.reduce((acc, d) => acc + d.value, 0) || 1;

  // Let's create dummy trend coordinates for the SVG Line Chart representing the last 4 weeks.
  // We can bin real data from rawRequests and rawPayments.
  const getWeeklyTrend = () => {
    const weeks = [0, 0, 0, 0]; // 4 weeks ago to this week
    const now = new Date();
    
    rawRequests.forEach(req => {
      const diffTime = Math.abs(now.getTime() - new Date(req.created_at).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weekIndex = 3 - Math.floor(diffDays / 7);
      if (weekIndex >= 0 && weekIndex < 4) {
        weeks[weekIndex]++;
      }
    });

    return weeks;
  };

  const weeklyRequests = getWeeklyTrend();
  const maxRequests = Math.max(...weeklyRequests, 5);

  // SVG Line Chart coordinates calculation
  const points = weeklyRequests.map((val, idx) => {
    const x = 50 + idx * 100;
    const y = 150 - (val / maxRequests) * 100;
    return { x, y };
  });

  const polylinePath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="crm-dashboard" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .crm-dashboard { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 1200px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Stats Grid */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
        }
        .stat-card.glow-green { border-left: 4px solid #10b981; }
        .stat-card.glow-blue { border-left: 4px solid #3b82f6; }
        .stat-card.glow-orange { border-left: 4px solid #f59e0b; }
        .stat-card.glow-purple { border-left: 4px solid #8b5cf6; }

        .stat-icon { font-size: 2rem; background: rgba(255,255,255,0.03); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-value { font-size: 1.8rem; font-weight: 900; color: white; line-height: 1.2; }
        .stat-label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-top: 2px; }

        /* Charts Layout */
        .charts-row { display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; margin-bottom: 40px; }
        @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }

        .chart-card { background: rgba(255, 255, 255, 0.015); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 24px; padding: 25px; }
        .chart-title { font-size: 1.1rem; font-weight: 900; color: white; margin: 0 0 20px; display: flex; justify-content: space-between; align-items: center; }

        /* Performance Leaderboard Table */
        .leaderboard-card { background: rgba(255, 255, 255, 0.015); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 24px; padding: 25px; margin-bottom: 40px; }
        .leaderboard-table { width: 100%; border-collapse: collapse; text-align: left; }
        [dir="rtl"] .leaderboard-table { text-align: right; }
        
        .leaderboard-table th { padding: 12px 16px; font-size: 0.8rem; font-weight: 850; color: rgba(255,255,255,0.4); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .leaderboard-table td { padding: 16px; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .leaderboard-table tr:hover td { background: rgba(255,255,255,0.01); }

        .role-badge { padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); text-transform: uppercase; }
        .role-badge.admin { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .role-badge.owner { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

        .progress-bar-wrap { width: 120px; display: flex; align-items: center; gap: 8px; }
        .progress-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #3b82f6; border-radius: 3px; }

        /* Radial Dial Gauge */
        .radial-gauge { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; position: relative; }
        .radial-percentage { position: absolute; font-size: 2.2rem; font-weight: 950; color: white; display: flex; flex-direction: column; align-items: center; line-height: 1; }
        .radial-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 4px; font-weight: 800; }
        
        /* Category Legend */
        .legend-list { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
        .legend-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
        .legend-color { width: 12px; height: 12px; border-radius: 3px; display: inline-block; margin-right: 8px; }
        [dir="rtl"] .legend-color { margin-right: 0; margin-left: 8px; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'مركز إدارة ومراقبة النظام 🤝' : 'Executive Platform CRM 🤝'}</h1>
          <p className="subtitle">
            {isRTL ? 'التقييم الشامل لأداء الموظفين ونسب تحويل الطلبات وحالة النظام العام.' : 'Comprehensive evaluation of staff performance, request conversion rates, and overall platform health.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Stats Cards */}
      <section className="stats-grid">
        <div className="stat-card glow-green">
          <div className="stat-icon">💰</div>
          <div>
            <div className="stat-value">{summaryMetrics.totalRevenue.toLocaleString()} EGP</div>
            <div className="stat-label">{isRTL ? 'إجمالي الإيرادات المؤكدة' : 'Confirmed Revenue'}</div>
          </div>
        </div>
        <div className="stat-card glow-blue">
          <div className="stat-icon">📋</div>
          <div>
            <div className="stat-value">{summaryMetrics.totalRequests}</div>
            <div className="stat-label">{isRTL ? 'إجمالي الطلبات' : 'Total Requests'}</div>
          </div>
        </div>
        <div className="stat-card glow-orange">
          <div className="stat-icon">🏪</div>
          <div>
            <div className="stat-value">{summaryMetrics.totalMerchants}</div>
            <div className="stat-label">{isRTL ? 'إجمالي التجار والموردين' : 'Total Merchants'}</div>
          </div>
        </div>
        <div className="stat-card glow-purple">
          <div className="stat-icon">👤</div>
          <div>
            <div className="stat-value">{summaryMetrics.totalCustomers}</div>
            <div className="stat-label">{isRTL ? 'إجمالي العملاء المسجلين' : 'Total Customers'}</div>
          </div>
        </div>
      </section>

      {/* Charts Row */}
      <section className="charts-row">
        {/* Weekly Line Chart */}
        <div className="chart-card">
          <h3 className="chart-title">
            <span>📈 {isRTL ? 'تطور الطلبات الأسبوعي' : 'Weekly Request Growth'}</span>
            <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>{isRTL ? 'آخر 4 أسابيع' : 'Last 4 Weeks'}</span>
          </h3>

          <div style={{ height: '180px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 400 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="50" y1="50" x2="350" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="50" y1="100" x2="350" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="50" y1="150" x2="350" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

              {/* Area under the line */}
              <path
                d={`M 50,150 L ${polylinePath} L 350,150 Z`}
                fill="url(#chart-grad)"
              />

              {/* Smooth Path Line */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                points={polylinePath}
              />

              {/* Data points */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="#020617" strokeWidth="2" />
                  <text x={p.x} y={p.y - 12} fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
                    {weeklyRequests[idx]}
                  </text>
                  <text x={p.x} y="165" fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">
                    {isRTL ? `أسبوع ${idx + 1}` : `Week ${idx + 1}`}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Circular Conversion Rate Gauge */}
        <div className="chart-card">
          <h3 className="chart-title">🎯 {isRTL ? 'معدل تحويل الطلبات لصفقات' : 'Request to Deal Conversion'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
            <div className="radial-gauge">
              <svg width="140" height="140" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="8" 
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * conversionRate) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 0.6s' }}
                />
              </svg>
              <div className="radial-percentage">
                <span>{conversionRate}%</span>
                <span className="radial-label">{isRTL ? 'معدل التحويل' : 'Conversion'}</span>
              </div>
            </div>

            <div>
              <div className="legend-list">
                <div className="legend-item">
                  <span>🟢 {isRTL ? 'التحويل الناجح' : 'Successful Deals'}</span>
                  <strong>{summaryMetrics.totalDeals}</strong>
                </div>
                <div className="legend-item">
                  <span>⚪ {isRTL ? 'الطلبات المفتوحة' : 'Total Pipeline'}</span>
                  <strong>{summaryMetrics.totalRequests}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Staff Leaderboard */}
      <section className="leaderboard-card">
        <h3 className="chart-title">👥 {isRTL ? 'مؤشرات أداء الموظفين وفريق العمل' : 'Staff Contributions Leaderboard'}</h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>{isRTL ? 'الموظف' : 'Staff Member'}</th>
                <th>{isRTL ? 'الدور' : 'Role'}</th>
                <th>{isRTL ? 'مقابلات العملاء' : 'Customer Discovery'}</th>
                <th>{isRTL ? 'دراسات التجار' : 'Merchant Discovery'}</th>
                <th>{isRTL ? 'تجارب تدار' : 'Experiments Managed'}</th>
                <th>{isRTL ? 'إجمالي المساهمات' : 'Total Contributions'}</th>
              </tr>
            </thead>
            <tbody>
              {staffPerformance.map(st => (
                <tr key={st.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'white' }}>{st.name}</div>
                  </td>
                  <td>
                    <span className={`role-badge ${st.role}`}>
                      {st.role}
                    </span>
                  </td>
                  <td>{st.interviewsCount}</td>
                  <td>{st.studiesCount}</td>
                  <td>{st.experimentsCount}</td>
                  <td>
                    <div className="progress-bar-wrap">
                      <strong>{st.totalContributions}</strong>
                      <div className="progress-bar-track">
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${Math.min(100, (st.totalContributions / (Math.max(...staffPerformance.map(s => s.totalContributions)) || 1)) * 100)}%`,
                            background: st.totalContributions > 5 ? '#10b981' : '#3b82f6'
                          }} 
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Donut Chart Category distribution */}
      {specData.length > 0 && (
        <section className="chart-card" style={{ marginBottom: '40px' }}>
          <h3 className="chart-title">🍕 {isRTL ? 'توزيع مجالات الموردين المسجلين' : 'Supplier Specialization Distribution'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {specData.map((d, idx) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                const pct = Math.round((d.value / totalSpecStudies) * 100);
                return (
                  <div key={d.name} className="legend-item">
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="legend-color" style={{ background: colors[idx % colors.length] }} />
                      <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{d.name.replace('_', ' ')}</span>
                    </span>
                    <strong>{d.value} ({pct}%)</strong>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg width="150" height="150" viewBox="0 0 36 36" style={{ overflow: 'visible' }}>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                {(() => {
                  let accumulatedOffset = 0;
                  return specData.map((d, idx) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                    const pct = (d.value / totalSpecStudies) * 100;
                    const strokeDash = `${pct} ${100 - pct}`;
                    const offset = 100 - accumulatedOffset;
                    accumulatedOffset += pct;

                    return (
                      <circle
                        key={d.name}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="transparent"
                        stroke={colors[idx % colors.length]}
                        strokeWidth="3.5"
                        strokeDasharray={strokeDash}
                        strokeDashoffset={offset}
                        transform="rotate(-90 18 18)"
                      />
                    );
                  });
                })()}
              </svg>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
