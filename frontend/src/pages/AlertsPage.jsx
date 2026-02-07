import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { getAlerts, acknowledgeAlert } from '@/lib/api';
import { timeAgo, DETECTION_COLORS, SEVERITY_COLORS } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread');

  const fetchAlerts = useCallback(async () => {
    try {
      const params = { limit: 100 };
      if (filter === 'unread') params.acknowledged = false;
      if (filter === 'acknowledged') params.acknowledged = true;
      const res = await getAlerts(params);
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId);
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="alerts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-['Chivo'] uppercase">Alerts</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">Notification center</p>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'unread', 'acknowledged'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`alert-filter-${f}`}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 border ${
                filter === f
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert, idx) => (
            <motion.div
              key={alert.alert_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              data-testid={`alert-card-${alert.alert_id}`}
              className={`bg-slate-900/40 backdrop-blur-md border rounded-md p-4 flex items-start gap-4 ${
                alert.acknowledged ? 'border-slate-800 opacity-60' : 'border-slate-700'
              }`}
            >
              <div
                className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${DETECTION_COLORS[alert.alert_type] || '#F59E0B'}15` }}
              >
                <AlertTriangle
                  className="w-5 h-5"
                  style={{ color: DETECTION_COLORS[alert.alert_type] || '#F59E0B' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase badge-${alert.alert_type} px-1.5 py-0.5 rounded-sm`}>
                    {alert.alert_type}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase"
                    style={{ color: SEVERITY_COLORS[alert.severity] }}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{alert.message}</p>
                <p className="text-[10px] font-mono text-slate-500 mt-1">{timeAgo(alert.timestamp)}</p>
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => handleAcknowledge(alert.alert_id)}
                  data-testid={`acknowledge-alert-${alert.alert_id}`}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-sm p-2 text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex-shrink-0"
                  title="Acknowledge"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-400">No alerts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
