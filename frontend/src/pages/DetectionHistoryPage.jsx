import { useState, useEffect, useCallback } from 'react';
import { History, Filter, ChevronDown, Loader2 } from 'lucide-react';
import { getDetections } from '@/lib/api';
import { formatTimestamp, DETECTION_COLORS, SEVERITY_COLORS } from '@/lib/utils';
import { motion } from 'framer-motion';

const detectionTypes = ['all', 'pothole', 'billboard', 'railing', 'barrier'];
const severityLevels = ['all', 'low', 'medium', 'high', 'critical'];

export default function DetectionHistoryPage() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const fetchDetections = useCallback(async () => {
    try {
      const params = { limit: 100 };
      if (typeFilter !== 'all') params.detection_type = typeFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      const res = await getDetections(params);
      setDetections(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, severityFilter]);

  useEffect(() => {
    setLoading(true);
    fetchDetections();
  }, [fetchDetections]);

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="detection-history-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-['Chivo'] uppercase">Detection History</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">{detections.length} records found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type:</span>
          {detectionTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              data-testid={`filter-type-${t}`}
              className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 border ${
                typeFilter === t
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Severity:</span>
          {severityLevels.map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              data-testid={`filter-severity-${s}`}
              className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 border ${
                severityFilter === s
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        ) : detections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="text-left">ID</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Camera</th>
                  <th className="text-left">Location</th>
                  <th className="text-left">Confidence</th>
                  <th className="text-left">Severity</th>
                  <th className="text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {detections.map((det, idx) => (
                  <motion.tr
                    key={det.detection_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    data-testid={`detection-row-${det.detection_id}`}
                  >
                    <td>
                      <span className="font-mono text-xs text-slate-500">{det.detection_id}</span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase badge-${det.detection_type}`}
                      >
                        {det.detection_type}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{det.camera_name || det.camera_id}</td>
                    <td className="text-xs text-slate-400">{det.location || 'N/A'}</td>
                    <td>
                      <span className="font-mono text-xs" style={{ color: det.confidence > 0.85 ? '#10B981' : '#F59E0B' }}>
                        {(det.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs font-bold uppercase severity-${det.severity}`}>
                        {det.severity}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-500">{formatTimestamp(det.timestamp)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <History className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-400">No detections found</p>
            <p className="text-xs text-slate-500 mt-1">Adjust filters or seed demo data from Dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}
