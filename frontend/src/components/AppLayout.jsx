import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Camera, History, MapPin, Bell, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Shield, AlertTriangle
} from 'lucide-react';
import { logout, getUnreadAlertCount } from '@/lib/api';
import { useEffect } from 'react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/cameras', icon: Camera, label: 'Camera Feeds' },
  { path: '/detections', icon: History, label: 'Detection History' },
  { path: '/map', icon: MapPin, label: 'Map View' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout({ children, user }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await getUnreadAlertCount();
        setAlertCount(res.data.count);
      } catch {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-950" data-testid="app-layout">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-900/60 backdrop-blur-md border-r border-slate-800 flex flex-col z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-slate-800">
          <Shield className="w-6 h-6 text-cyan-400 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-bold text-slate-100 tracking-tight font-['Chivo'] whitespace-nowrap">
              RoadSentinel AI
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-500/8 border-l-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {item.path === '/alerts' && alertCount > 0 && !collapsed && (
                <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                  {alertCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800 p-3">
          {!collapsed && user && (
            <div className="flex items-center gap-2 mb-3">
              {user.picture ? (
                <img src={user.picture} alt="" className="w-7 h-7 rounded-sm object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-sm bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">
                  {user.name?.[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-sm text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && 'Logout'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          data-testid="sidebar-toggle"
          className="absolute top-4 -right-3 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors duration-200"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {children}
      </main>
    </div>
  );
}
