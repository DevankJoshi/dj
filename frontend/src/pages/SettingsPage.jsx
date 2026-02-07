import { useState, useEffect, useCallback } from 'react';
import { Settings, Camera, Plus, Trash2, Edit3, Save, X, Cpu, Loader2 } from 'lucide-react';
import { getCameras, createCamera, updateCamera, deleteCamera, getModelStatus } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [cameras, setCameras] = useState([]);
  const [modelStatus, setModelStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', source_url: '', location: '', lat: '', lng: '' });

  const fetchData = useCallback(async () => {
    try {
      const [camRes, modelRes] = await Promise.all([getCameras(), getModelStatus()]);
      setCameras(camRes.data);
      setModelStatus(modelRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({ name: '', source_url: '', location: '', lat: '', lng: '' });
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Camera name is required');
      return;
    }
    try {
      const data = {
        name: form.name,
        source_url: form.source_url,
        location: form.location,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        is_active: true
      };

      if (editingId) {
        await updateCamera(editingId, data);
        toast.success('Camera updated');
      } else {
        await createCamera(data);
        toast.success('Camera added');
      }
      resetForm();
      fetchData();
    } catch {
      toast.error('Failed to save camera');
    }
  };

  const handleEdit = (cam) => {
    setEditingId(cam.camera_id);
    setForm({
      name: cam.name,
      source_url: cam.source_url || '',
      location: cam.location || '',
      lat: cam.lat?.toString() || '',
      lng: cam.lng?.toString() || '',
    });
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteCamera(id);
      toast.success('Camera deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete camera');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-['Chivo'] uppercase">Settings</h1>
        <p className="text-xs text-slate-500 mt-1 font-mono">Camera management & model configuration</p>
      </div>

      {/* Model Status */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-5">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-slate-200 font-['Chivo'] uppercase tracking-wide">Model Status</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${modelStatus?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-sm font-mono text-slate-300 capitalize">{modelStatus?.status || 'Unknown'}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Model Name</p>
            <p className="text-sm font-mono text-slate-300 mt-1">{modelStatus?.model_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Version</p>
            <p className="text-sm font-mono text-slate-300 mt-1">{modelStatus?.model_version || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Inference</p>
            <p className="text-sm font-mono text-slate-300 mt-1">{modelStatus?.last_inference || 'Never'}</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-slate-950/50 border border-slate-800 rounded-sm">
          <p className="text-[10px] font-mono text-cyan-400">
            To connect your YOLO/PyTorch model, implement the POST /api/model/detect endpoint in server.py.
            The endpoint receives image data and should return detections with class, confidence, and bounding box data.
          </p>
        </div>
      </div>

      {/* Camera Management */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-200 font-['Chivo'] uppercase tracking-wide">Camera Management</h2>
          </div>
          <button
            onClick={() => { resetForm(); setShowAdd(true); }}
            data-testid="add-camera-button"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-sm uppercase tracking-wide text-xs h-9 px-4 transition-colors hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Camera
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-slate-950/50 border border-slate-800 rounded-sm p-4 mb-4 space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Camera Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  data-testid="camera-name-input"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-sm text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 outline-none"
                  placeholder="e.g., CAM-01"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Source URL</label>
                <input
                  value={form.source_url}
                  onChange={e => setForm({ ...form, source_url: e.target.value })}
                  data-testid="camera-source-input"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-sm text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 outline-none"
                  placeholder="rtsp://... or http://..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Location</label>
                <input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  data-testid="camera-location-input"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-sm text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 outline-none"
                  placeholder="Highway NH-48 KM 52"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Latitude</label>
                  <input
                    value={form.lat}
                    onChange={e => setForm({ ...form, lat: e.target.value })}
                    data-testid="camera-lat-input"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-sm text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 outline-none"
                    placeholder="28.4595"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Longitude</label>
                  <input
                    value={form.lng}
                    onChange={e => setForm({ ...form, lng: e.target.value })}
                    data-testid="camera-lng-input"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-sm text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 outline-none"
                    placeholder="77.0266"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                data-testid="save-camera-button"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-sm uppercase tracking-wide text-xs h-8 px-4 transition-colors hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center gap-1.5"
              >
                <Save className="w-3 h-3" />
                {editingId ? 'Update' : 'Save'}
              </button>
              <button
                onClick={resetForm}
                data-testid="cancel-camera-button"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-sm uppercase tracking-wide text-xs h-8 px-4 flex items-center gap-1.5"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Camera List */}
        <div className="space-y-2">
          {cameras.length > 0 ? cameras.map(cam => (
            <div
              key={cam.camera_id}
              data-testid={`camera-row-${cam.camera_id}`}
              className="bg-slate-950/50 border border-slate-800 rounded-sm p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${cam.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <div>
                  <p className="text-sm font-medium text-slate-200">{cam.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">
                    {cam.location || 'No location'} | {cam.camera_id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(cam)}
                  data-testid={`edit-camera-${cam.camera_id}`}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-sm p-1.5 text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cam.camera_id)}
                  data-testid={`delete-camera-${cam.camera_id}`}
                  className="bg-red-900/20 hover:bg-red-900/40 border border-red-500/20 rounded-sm p-1.5 text-red-400 hover:text-red-300 transition-colors duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-slate-500 text-xs font-mono">
              No cameras configured yet. Click "Add Camera" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
