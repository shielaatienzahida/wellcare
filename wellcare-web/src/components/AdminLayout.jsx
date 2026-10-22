import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Inbox, LogOut, Menu, Bell, BarChart2, Activity, User, Archive } from 'lucide-react';
import { api } from '../api';
import logoImg from '../assets/logo.jpg';

export default function AdminLayout({ children, unreadMsgCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const adminSession = JSON.parse(localStorage.getItem('heiwa_session_admin') || '{}');
        const stateKey = `heiwa_admin_notifications_${adminSession.username || 'admin'}`;
        let notifState = { readIds: [], deletedIds: [] };
        try {
          notifState = JSON.parse(localStorage.getItem(stateKey) || '{"readIds":[],"deletedIds":[]}');
        } catch {}

        const [clientsRes, archRes] = await Promise.all([
          api.getClients().catch(() => ({ clients: [] })),
          api.getArchivedStaff().catch(() => ({ staff: [] })),
        ]);

        const clients = clientsRes.clients || [];
        const recent = clients
          .filter(c => c.created_at)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 30);
        const visible = recent.filter(c => !notifState.deletedIds.includes(String(c.id)));
        const unread = visible.filter(c => !notifState.readIds.includes(String(c.id)));
        setNotificationCount(unread.length);
        setArchivedCount((archRes.staff || []).length);
      } catch {
        // quiet error
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: '/dashboard',        label: 'Dashboard',        icon: LayoutDashboard },
    { path: '/staff-monitoring', label: 'Staff Monitoring', icon: Activity },
    { path: '/admin-messages',   label: 'Messages',          icon: Inbox, badge: unreadMsgCount },
    { path: '/reports',          label: 'Reports',          icon: BarChart2 },
    { path: '/admin-profile',    label: 'Admin Profile',    icon: User },
  ];

  const handleLogout = () => {
    localStorage.removeItem('heiwa_session_admin');
    navigate('/');
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-wellcare-light via-white to-wellcare-light/30 text-wellcare-deep">
      {/* ── Top Navbar (Fixed) ── */}
      <nav className="h-[72px] flex items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/40 shadow-glass-sm z-50 px-5 md:px-7 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center text-wellcare-dark hover:bg-wellcare-accent/10 active:scale-95 transition-all duration-300"
            onClick={() => {
              if (window.innerWidth <= 768) {
                setMobileOpen(true);
              } else {
                setCollapsed(c => !c);
              }
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={20} />
          </button>

          <div 
            className="flex items-center gap-2.5 select-none cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/dashboard')}
          >
            <img
              src={logoImg}
              alt="WellCare Logo"
              style={{ height: '44px', width: '44px', borderRadius: '10px', objectFit: 'cover', boxShadow: '0 2px 8px rgba(4,106,56,0.18)' }}
            />
            <span className="font-bold tracking-widest text-wellcare-deep text-lg">WELLCARE</span>
            <span className="text-wellcare-primary font-medium text-sm tracking-normal">· Admin</span>
          </div>
        </div>

        {/* ── Header Top Right Actions (Archive + Notifications) ── */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/archive')}
            title="Archived Clients"
            aria-label="Archive"
            className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-sm ${
              location.pathname === '/archive'
                ? 'bg-wellcare-primary text-white shadow-emerald-900/20'
                : 'bg-white/80 border border-emerald-900/10 hover:bg-emerald-50 active:scale-95 text-emerald-900'
            }`}
          >
            <Archive size={20} />
            {archivedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-sm">
                {archivedCount > 99 ? '99+' : archivedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/admin-notifications')}
            title="Notifications"
            aria-label="Notifications"
            className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-sm ${
              location.pathname === '/admin-notifications'
                ? 'bg-wellcare-primary text-white shadow-emerald-900/20'
                : 'bg-white/80 border border-emerald-900/10 hover:bg-emerald-50 active:scale-95 text-emerald-900'
            }`}
          >
            <Bell size={21} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-black min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ── Main Container (Sidebar + Content) ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (Fixed, No Scroll) ── */}
        <aside 
          className={`
            fixed md:relative top-[72px] md:top-0 left-0 bottom-0 z-40 flex flex-col border-r border-wellcare-primary/20 bg-[#0F3A2E] backdrop-blur-2xl transition-all duration-300 ease-in-out p-4 h-[calc(100vh-72px)]
            ${mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0'}
            ${collapsed && !mobileOpen ? 'md:w-[84px] md:items-center' : 'md:w-[260px]'}
          `}
        >
          {/* Navigation Items */}
          <div className="flex flex-col gap-2 w-full flex-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const isCollapsed = collapsed && !mobileOpen;

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-wellcare-accent
                    ${active 
                      ? 'bg-wellcare-accent/25 text-white shadow-[inset_4px_0_0_0_#10b981]' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'justify-start w-full'}
                  `}
                >
                  <item.icon 
                    size={20} 
                    className={`flex-shrink-0 transition-transform duration-300 ${active ? 'text-wellcare-accent scale-110' : 'text-wellcare-accent/70 group-hover:scale-110 group-hover:text-wellcare-accent'}`} 
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                  
                  {!isCollapsed && item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F3A2E] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-white/10">
                      {item.label}
                      {item.badge > 0 && ` (${item.badge})`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Log Out Button (Bottom) */}
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2 w-full flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title={collapsed && !mobileOpen ? 'Log Out' : undefined}
              aria-label="Log out"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-200 hover:bg-red-500/20 hover:text-red-100 transition-all ${collapsed && !mobileOpen ? 'justify-center w-12 h-12 mx-auto px-0' : 'w-full'}`}
            >
              <LogOut size={20} className="flex-shrink-0" />
              {!(collapsed && !mobileOpen) && <span>Log Out</span>}
              {collapsed && !mobileOpen && <span className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F3A2E] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-white/10">Log Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 bg-wellcare-deep/40 backdrop-blur-sm z-30 md:hidden animate-fade-in" 
            onClick={() => setMobileOpen(false)} 
          />
        )}

        {/* ── Main Content (Scrollable) ── */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 animate-fade-in w-full">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setShowLogoutConfirm(false); }}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="admin-logout-title" style={{ maxWidth: 420 }}>
            <div className="modal-icon" aria-hidden="true"><LogOut size={28} /></div>
            <h3 id="admin-logout-title" className="modal-title">Log out?</h3>
            <p className="modal-sub" style={{ marginTop: 6 }}>Are you sure you want to log out of the admin portal?</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-logout" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: '#dc2626' }} onClick={handleLogout}>Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
