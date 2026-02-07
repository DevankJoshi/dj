import { useState, useEffect, useRef, useCallback } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { getMe, exchangeSession } from '@/lib/api';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CameraFeedsPage from '@/pages/CameraFeedsPage';
import DetectionHistoryPage from '@/pages/DetectionHistoryPage';
import MapViewPage from '@/pages/MapViewPage';
import AlertsPage from '@/pages/AlertsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import AppLayout from '@/components/AppLayout';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');
    if (!sessionId) {
      navigate('/login', { replace: true });
      return;
    }

    exchangeSession(sessionId)
      .then(res => {
        navigate('/dashboard', { replace: true, state: { user: res.data } });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-cyan-400 text-sm font-mono">Authenticating...</div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // If user passed from AuthCallback, skip check
  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }
    const checkAuth = async () => {
      try {
        const response = await getMe();
        setUser(response.data);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      }
    };
    checkAuth();
  }, [location.state, navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-mono">Loading RoadSentinel...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <AppLayout user={user}>{children}</AppLayout>;
}

function AppRouter() {
  const location = useLocation();

  // Synchronous check for session_id in hash - BEFORE any route renders
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/cameras" element={<ProtectedRoute><CameraFeedsPage /></ProtectedRoute>} />
      <Route path="/detections" element={<ProtectedRoute><DetectionHistoryPage /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapViewPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
