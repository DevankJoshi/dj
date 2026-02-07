import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth
export const exchangeSession = (sessionId) => api.post('/auth/session', { session_id: sessionId });
export const getMe = () => api.get('/auth/me');
export const logout = () => api.post('/auth/logout');

// Cameras
export const getCameras = () => api.get('/cameras');
export const createCamera = (data) => api.post('/cameras', data);
export const updateCamera = (id, data) => api.put(`/cameras/${id}`, data);
export const deleteCamera = (id) => api.delete(`/cameras/${id}`);

// Detections
export const getDetections = (params) => api.get('/detections', { params });
export const createDetection = (data) => api.post('/detections', data);
export const getDetectionStats = () => api.get('/detections/stats');
export const getDetectionTimeline = (days = 7) => api.get('/detections/timeline', { params: { days } });

// Alerts
export const getAlerts = (params) => api.get('/alerts', { params });
export const acknowledgeAlert = (id) => api.put(`/alerts/${id}/acknowledge`);
export const getUnreadAlertCount = () => api.get('/alerts/unread-count');

// Model
export const getModelStatus = () => api.get('/model/status');
export const runModelDetection = (data) => api.post('/model/detect', data);

// Seed
export const seedDemoData = () => api.post('/seed-demo-data');

export default api;
