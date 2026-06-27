import { getRequestTimeline, TimelineEvent } from '@/lib/dal/timeline';

interface ActionHistoryPanelProps {
  requestId: string;
  dictionary: any;
  locale: string;
}

export async function ActionHistoryPanel({
  requestId,
  dictionary: dict,
  locale
}: ActionHistoryPanelProps) {
  const events = await getRequestTimeline(requestId, 'desc');
  const isRTL = locale === 'ar';

  function getRelativeTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return locale === 'ar' ? 'الآن' : 'just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return locale === 'ar' 
        ? `منذ ${diffInMinutes} دقيقة` 
        : `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return locale === 'ar' 
        ? `منذ ${diffInHours} ساعة` 
        : `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return locale === 'ar' 
        ? `منذ ${diffInDays} يوم` 
        : `${diffInDays}d ago`;
    }

    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function getMetadataSummary(metadata: any, transitionName: string) {
    if (!metadata) return null;
    const t = dict.staff_workspace.action_history.metadata;
    
    if (transitionName === 'CUSTOMER_OPTION_UNLOCKED') {
      const label = metadata.option_label;
      if (label) return locale === 'ar' ? `تم كشف الخيار: ${label}` : `Option unlocked: ${label}`;
      return t.option_unlocked;
    }

    const summaries: string[] = [];
    if (metadata.shortlist_id) summaries.push(t.shortlist_recorded);
    if (metadata.merchant_quote_id) summaries.push(t.quote_recorded);
    if (metadata.research_item_id) summaries.push(t.finding_recorded);
    if (metadata.run_id) summaries.push(t.run_linked);
    if (metadata.job_id) summaries.push(t.job_linked);
    if (metadata.report_id) summaries.push(t.report_prepared);
    if (metadata.snapshot_id) summaries.push(t.option_unlocked);

    if (summaries.length > 0) return summaries.join(', ');
    return null;
  }

  return (
    <div className="animate-in" style={{ direction: isRTL ? 'rtl' : 'ltr' }} data-testid="staff-action-history-panel">
      <h3 style={{ 
        fontSize: '1.1rem', 
        fontWeight: 800, 
        marginBlockEnd: '1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem',
        color: 'var(--accent)'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {dict.staff_workspace.action_history.title}
      </h3>

      {events.length === 0 ? (
        <div className="card glass-card empty-state" style={{ padding: '2rem' }}>
          <div className="empty-state-icon" style={{ fontSize: '2rem' }}>📑</div>
          <p className="empty-state-text" style={{ fontSize: '0.9rem', margin: 0 }}>{dict.staff_workspace.action_history.empty}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
          {/* Timeline Line */}
          <div style={{ 
            position: 'absolute', 
            insetInlineStart: '15px', 
            top: '10px', 
            bottom: '10px', 
            width: '2px', 
            background: 'linear-gradient(to bottom, var(--accent), transparent)', 
            opacity: 0.2 
          }} />

          {events.map((event, idx) => {
            const isSystem = event.event_source === 'system'
            const isCustomer = event.event_source === 'customer_action'
            
            return (
              <div key={event.event_id} className="animate-in" style={{ 
                animationDelay: `${idx * 0.05}s`,
                position: 'relative',
                paddingInlineStart: '45px',
                paddingBlock: '0.75rem'
              }}>
                {/* Timeline Dot */}
                <div style={{ 
                  position: 'absolute', 
                  insetInlineStart: '10px', 
                  top: '18px', 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  background: isSystem ? '#3b82f6' : isCustomer ? '#d4a63c' : 'var(--accent)',
                  border: '3px solid var(--background)',
                  boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                  zIndex: 2
                }} />

                <div className="card glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.03)' }} data-testid="staff-timeline-event" data-event-type={event.transition_name} data-artifact-id={event.metadata?.shortlist_id || event.metadata?.merchant_quote_id || event.metadata?.research_item_id || ""}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', flexWrap: 'wrap', marginBlockEnd: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div className="badge badge-muted" style={{ 
                        fontSize: '0.65rem', 
                        padding: '0.15rem 0.6rem', 
                        marginBlockEnd: '0.5rem',
                        background: isSystem ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                        color: isSystem ? '#93c5fd' : 'rgba(255,255,255,0.5)'
                      }}>
                        {isSystem ? dict.staff_workspace.action_history.system : isCustomer ? dict.staff_workspace.action_history.customer_actor : (event.actor_name || dict.staff_workspace.action_history.staff_actor)}
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'white' }}>
                        {dict.staff_workspace.action_history.events[event.transition_name] || event.transition_name}
                      </h4>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', opacity: 0.8 }}>
                      {getRelativeTime(event.event_at)}
                    </div>
                  </div>
 
                  {(getMetadataSummary(event.metadata, event.transition_name) || event.notes) && (
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: 'rgba(255,255,255,0.6)', 
                      lineHeight: 1.5,
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }} data-testid="staff-timeline-event-metadata">
                      {getMetadataSummary(event.metadata, event.transition_name)}
                      {event.notes && <div style={{ fontStyle: 'italic', marginBlockStart: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>"{event.notes}"</div>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
