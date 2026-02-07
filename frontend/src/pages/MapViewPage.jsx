import { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { getDetections } from '@/lib/api';
import { DETECTION_COLORS, formatTimestamp } from '@/lib/utils';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapViewPage() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchDetections = useCallback(async () => {
    try {
      const params = { limit: 200 };
      if (typeFilter !== 'all') params.detection_type = typeFilter;
      const res = await getDetections(params);
      setDetections(res.data.filter(d => d.lat && d.lng));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchDetections();
  }, [fetchDetections]);

  // Center map on first detection or default
  const center = detections.length > 0
    ? [detections[0].lat, detections[0].lng]
    : [28.47, 77.04];

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="map-view-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-['Chivo'] uppercase">Map View</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">{detections.length} detections with GPS data</p>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'pothole', 'billboard', 'railing', 'barrier'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              data-testid={`map-filter-${t}`}
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
      </div>

      {/* Map Container */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="rounded-md"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {detections.map(det => (
              <CircleMarker
                key={det.detection_id}
                center={[det.lat, det.lng]}
                radius={8}
                pathOptions={{
                  color: DETECTION_COLORS[det.detection_type] || '#38BDF8',
                  fillColor: DETECTION_COLORS[det.detection_type] || '#38BDF8',
                  fillOpacity: 0.6,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1" style={{ minWidth: '150px' }}>
                    <p className="font-bold text-sm capitalize">{det.detection_type}</p>
                    <p>Camera: {det.camera_name || det.camera_id}</p>
                    <p>Confidence: {(det.confidence * 100).toFixed(0)}%</p>
                    <p>Severity: <span className="font-bold uppercase">{det.severity}</span></p>
                    <p className="text-slate-500">{formatTimestamp(det.timestamp)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {Object.entries(DETECTION_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-mono text-slate-400 uppercase">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
