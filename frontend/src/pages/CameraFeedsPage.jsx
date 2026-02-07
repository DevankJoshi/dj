import { useState, useEffect, useCallback } from 'react';
import { Camera, Plus, Grid3X3, Grid2X2, Maximize2, Settings2, Loader2 } from 'lucide-react';
import { getCameras } from '@/lib/api';
import { motion } from 'framer-motion';

const gridLayouts = [
  { cols: 1, icon: Maximize2, label: '1x1' },
  { cols: 2, icon: Grid2X2, label: '2x2' },
  { cols: 3, icon: Grid3X3, label: '3x3' },
];

const placeholderImages = [
  'https://images.unsplash.com/photo-1603999703976-8439bd798042?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1580445906908-607bf4f552bc?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1595334259698-eb00258b62a1?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=640&h=360&fit=crop',
];

export default function CameraFeedsPage() {
  const [cameras, setCameras] = useState([]);
  const [gridCols, setGridCols] = useState(2);
  const [loading, setLoading] = useState(true);
  const [selectedCam, setSelectedCam] = useState(null);

  const fetchCameras = useCallback(async () => {
    try {
      const res = await getCameras();
      setCameras(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="camera-feeds-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-['Chivo'] uppercase">Camera Feeds</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">{cameras.length} cameras configured</p>
        </div>
        <div className="flex items-center gap-2">
          {gridLayouts.map(layout => (
            <button
              key={layout.cols}
              onClick={() => setGridCols(layout.cols)}
              data-testid={`grid-layout-${layout.label}`}
              className={`w-8 h-8 flex items-center justify-center rounded-sm transition-colors duration-200 ${
                gridCols === layout.cols
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
            >
              <layout.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Feeds Grid */}
      {cameras.length > 0 ? (
        <div
          className={`grid gap-3`}
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {cameras.map((cam, idx) => (
            <motion.div
              key={cam.camera_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedCam(selectedCam === cam.camera_id ? null : cam.camera_id)}
              data-testid={`camera-feed-${cam.camera_id}`}
              className={`bg-slate-900/40 border rounded-md overflow-hidden cursor-pointer transition-colors duration-200 ${
                selectedCam === cam.camera_id ? 'border-cyan-500/50' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="relative aspect-video bg-slate-950">
                {/* Placeholder image simulating camera feed */}
                <img
                  src={placeholderImages[idx % placeholderImages.length]}
                  alt={cam.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="feed-overlay" />

                {/* Top overlay - Camera info */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="bg-slate-950/80 backdrop-blur-sm border border-slate-700 rounded-sm px-2 py-0.5 text-[10px] font-mono font-bold text-slate-200">
                    {cam.name}
                  </span>
                </div>

                {/* Live indicator */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {cam.is_active && (
                    <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 rounded-sm px-1.5 py-0.5">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-live-pulse" />
                      <span className="text-[9px] font-mono font-bold text-red-400">REC</span>
                    </span>
                  )}
                </div>

                {/* Bottom overlay - Location */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">{cam.location || 'Unknown Location'}</span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {new Date().toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>

                {/* Model placeholder overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-slate-950/60 backdrop-blur-sm border border-slate-700/50 rounded-sm px-3 py-1.5">
                    <span className="text-[10px] font-mono text-cyan-400/70">Model Feed Placeholder</span>
                  </div>
                </div>
              </div>

              {/* Camera details bar */}
              <div className="px-3 py-2 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cam.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  <span className="text-[10px] text-slate-400 font-mono">{cam.is_active ? 'Connected' : 'Disconnected'}</span>
                </div>
                <span className="text-[10px] text-slate-600 font-mono">{cam.camera_id}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Camera className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-sm text-slate-400">No cameras configured</p>
          <p className="text-xs text-slate-500 mt-1">Go to Settings to add cameras</p>
        </div>
      )}
    </div>
  );
}
