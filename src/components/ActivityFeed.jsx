import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import useStore from '../store/useStore';

const ICONS = {
  system: '\u2699\uFE0F',
  handoff: '\u27A1\uFE0F',
  agent: '\uD83D\uDCAC',
  success: '\u2705',
  error: '\u274C',
};

export default function ActivityFeed() {
  const { activities } = useStore();
  const bottomRef = useRef(null);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activities.length, collapsed]);

  // Auto-expand when activities start coming in
  useEffect(() => {
    if (activities.length > 0) setCollapsed(false);
  }, [activities.length > 0]);

  return (
    <div className="card activity-card" style={{ flex: collapsed ? 'none' : undefined }}>
      <div
        className="activity-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="card-title" style={{ marginBottom: 0 }}>
          <Activity size={14} /> Activity Feed
          {activities.length > 0 && (
            <span className="activity-count">{activities.length}</span>
          )}
        </div>
        {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {!collapsed && (
        <>
          {activities.length === 0 ? (
            <div className="activity-empty">No activity yet. Run the workflow to see events.</div>
          ) : (
            <div className="activity-feed">
              <div className="activity-list">
                <AnimatePresence>
                  {activities.map((activity, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="activity-item"
                    >
                      <div className="activity-icon">{ICONS[activity.type] || '\uD83D\uDCAC'}</div>
                      <div className="activity-content">
                        <span className="activity-agent" style={{ color: activity.color || 'var(--text-secondary)' }}>
                          {activity.agent}
                        </span>
                        <span className="activity-message">{activity.message}</span>
                      </div>
                      <span className="activity-time">{activity.timestamp}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
