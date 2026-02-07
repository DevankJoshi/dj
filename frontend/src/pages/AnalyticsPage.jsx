import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { getDetectionStats, getDetectionTimeline } from '@/lib/api';
import { DETECTION_COLORS } from '@/lib/utils';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, timelineRes] = await Promise.all([
        getDetectionStats(),
        getDetectionTimeline(timeRange)
      ]);
      setStats(statsRes.data);
      setTimeline(timelineRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'Potholes', value: stats.potholes, color: DETECTION_COLORS.pothole },
    { name: 'Billboards', value: stats.billboards, color: DETECTION_COLORS.billboard },
    { name: 'Railings', value: stats.railings, color: DETECTION_COLORS.railing },
    { name: 'Barriers', value: stats.barriers, color: DETECTION_COLORS.barrier },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-['Chivo'] uppercase">Analytics</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">Detection trends and reports</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setTimeRange(d)}
              data-testid={`time-range-${d}`}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 border ${
                timeRange === d
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bar Chart */}
        <div className="lg:col-span-8 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-4">
          <h3 className="text-sm font-semibold text-slate-200 font-['Chivo'] uppercase tracking-wide mb-4">Daily Detections</h3>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#1E293B' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '4px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                <Bar dataKey="pothole" fill={DETECTION_COLORS.pothole} radius={[2, 2, 0, 0]} />
                <Bar dataKey="billboard" fill={DETECTION_COLORS.billboard} radius={[2, 2, 0, 0]} />
                <Bar dataKey="railing" fill={DETECTION_COLORS.railing} radius={[2, 2, 0, 0]} />
                <Bar dataKey="barrier" fill={DETECTION_COLORS.barrier} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500 text-xs font-mono">No data</div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-4">
          <h3 className="text-sm font-semibold text-slate-200 font-['Chivo'] uppercase tracking-wide mb-4">Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  stroke="#0F172A"
                  strokeWidth={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '4px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500 text-xs font-mono">No data</div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Most Common', value: getMostCommon(stats), sub: 'detection type' },
            { label: 'Total Detections', value: stats.total_detections, sub: 'all time' },
            { label: 'Active Cameras', value: stats.active_cameras, sub: 'monitoring' },
            { label: 'Unresolved Alerts', value: stats.critical_alerts, sub: 'critical' },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
              <p className="text-xl font-mono font-bold text-slate-100 mt-1">{item.value}</p>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getMostCommon(stats) {
  const types = [
    { name: 'Pothole', count: stats.potholes },
    { name: 'Billboard', count: stats.billboards },
    { name: 'Railing', count: stats.railings },
    { name: 'Barrier', count: stats.barriers },
  ];
  types.sort((a, b) => b.count - a.count);
  return types[0].count > 0 ? types[0].name : 'N/A';
}
