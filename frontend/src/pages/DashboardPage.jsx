import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Camera, Eye, Activity, Shield, Bell, MapPin,
  ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import { getDetectionStats, getAlerts, getCameras, getDetectionTimeline, seedDemoData } from '@/lib/api';
import { formatTimestamp, timeAgo, DETECTION_COLORS } from '@/lib/utils';
import { toast } from 'sonner';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const StatCard = ({ icon: Icon, label, value, color, accent }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-4 relative overflow-hidden card-glow"
  >
    <div className="stat-accent" style={{ backgroundColor: accent }} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-mono font-bold tracking-tighter" style={{ color: color || '#F8FAFC' }}>{value}</p>
      </div>
      <div className="w-9 h-9 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
    </div>
  </motion.div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, alertsRes, camerasRes, timelineRes] = await Promise.all([
        getDetectionStats(),
        getAlerts({ limit: 5, acknowledged: false }),
        getCameras(),
        getDetectionTimeline(7)
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setCameras(camerasRes.data);
      setTimeline(timelineRes.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      toast.success('Demo data seeded successfully');
      fetchData();
    } catch {
      toast.error('Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const hasData = stats && stats.total_detections > 0;

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-['Chivo'] uppercase">
            Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Real-time infrastructure monitoring overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-sm px-3 py-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-live-pulse" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">System Active</span>
          </div>
          {!hasData && (
            <button
              onClick={handleSeedData}
              disabled={seeding}
              data-testid="seed-data-button"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-sm uppercase tracking-wide text-xs h-9 px-4 transition-colors hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50"
            >
              {seeding ? 'Seeding...' : 'Load Demo Data'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={Eye} label="Total Detections" value={stats?.total_detections || 0} accent="#38BDF8" />
        <StatCard icon={AlertTriangle} label="Potholes" value={stats?.potholes || 0} accent="#EF4444" />
        <StatCard icon={Activity} label="Billboards" value={stats?.billboards || 0} accent="#22D3EE" />
        <StatCard icon={Shield} label="Railings" value={stats?.railings || 0} accent="#10B981" />
        <StatCard icon={Shield} label="Barriers" value={stats?.barriers || 0} accent="#F59E0B" />
        <StatCard icon={Camera} label="Active Cameras" value={stats?.active_cameras || 0} accent="#38BDF8" />
        <StatCard icon={Bell} label="Critical Alerts" value={stats?.critical_alerts || 0} accent="#EF4444" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Timeline Chart */}
        <div className="lg:col-span-8 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 font-['Chivo'] uppercase tracking-wide">Detection Timeline</h3>
            <span className="text-[10px] font-mono text-slate-500">Last 7 days</span>
          </div>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="colorPothole" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBillboard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBarrier" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#1E293B' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '4px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Area type="monotone" dataKey="pothole" stroke="#EF4444" fill="url(#colorPothole)" strokeWidth={2} />
                <Area type="monotone" dataKey="billboard" stroke="#22D3EE" fill="url(#colorBillboard)" strokeWidth={2} />
                <Area type="monotone" dataKey="barrier" stroke="#F59E0B" fill="url(#colorBarrier)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-500 text-xs font-mono">
              No detection data yet
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 font-['Chivo'] uppercase tracking-wide">Recent Alerts</h3>
            <span className="text-[10px] font-mono text-slate-500">{alerts.length} unread</span>
          </div>
          <div className="space-y-2">
            {alerts.length > 0 ? alerts.map(alert => (
              <div
                key={alert.alert_id}
                className="bg-slate-950/50 border border-slate-800 rounded-sm p-3 flex items-start gap-3"
                data-testid={`alert-item-${alert.alert_id}`}
              >
                <AlertTriangle
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: DETECTION_COLORS[alert.alert_type] || '#F59E0B' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300 leading-relaxed truncate">{alert.message}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">{timeAgo(alert.timestamp)}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">
                No unread alerts
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Previews */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 font-['Chivo'] uppercase tracking-wide">Camera Status</h3>
          <span className="text-[10px] font-mono text-slate-500">{cameras.length} configured</span>
        </div>
        {cameras.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cameras.map(cam => (
              <div
                key={cam.camera_id}
                className="bg-slate-950/50 border border-slate-800 rounded-sm overflow-hidden relative aspect-video"
                data-testid={`camera-preview-${cam.camera_id}`}
              >
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-700" />
                </div>
                <div className="feed-overlay" />
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-200">{cam.name}</span>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${cam.is_active ? 'bg-emerald-500 animate-live-pulse' : 'bg-slate-600'}`} />
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {cam.is_active ? 'LIVE' : 'OFF'}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="text-[9px] font-mono text-slate-500">{cam.location || 'No location'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">
            No cameras configured. Go to Settings to add cameras.
          </div>
        )}
      </div>
    </div>
  );
}
