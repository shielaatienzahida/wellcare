import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Bell, User, ChevronDown, MessageCircle, Search, Archive } from 'lucide-react';
import logoImg from '../assets/logo.jpg';

export default function AppLayout({
  navItems = [],
  activeTab,
  onTabChange,
  onLogout,
  userName = '',
  userRole = '',
  confirmLogout = false,
  unreadCount = 0,
  logoLabel = '· Portal',
  isMobile = false,
  showArchive = false,
  archiveCount = 0,
  showNotifications = false,
  notificationCount = 0,
  children,
}) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const requestLogout = () => {
    if (confirmLogout) {
      setShowLogoutConfirm(true);
      return;
    }
    onLogout?.();
  };

  const content = (
    <div
      className={`
        relative flex flex-col min-h-screen bg-gradient-to-br from-wellcare-light via-white to-wellcare-light/30 text-wellcare-deep
        ${isMobile ? 'w-full max-w-[480px] mx-auto shadow-glass-lg shadow-wellcare-primary/20' : 'w-full'}
      `}
    >
      {/* ── Top Navbar (Modern & Slim) ── */}
      <nav
        className={`
          flex items-center justify-between h-[56px] bg-white/50 backdrop-blur-xl border-b border-white/40 shadow-sm z-50
          ${isMobile ? 'sticky top-0 px-4' : 'sticky top-0 px-6'}
        `}
      >
        <div className="flex items-center gap-2.5">
          {!isMobile && (
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-wellcare-dark hover:bg-wellcare-accent/10 active:scale-95 transition-all duration-300"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Menu"
            >
              <Menu size={16} />
            </button>
          )}
          <div className="flex items-center gap-1.5 select-none cursor-default">
            <img
              src={logoImg}
              alt="WellCare Logo"
              style={{ height: '32px', width: '32px', borderRadius: '6px', objectFit: 'cover', boxShadow: '0 1px 4px rgba(4,106,56,0.12)' }}
            />
            <span className="font-bold tracking-widest text-wellcare-deep text-sm">WELLCARE</span>
            <span className="text-wellcare-accent font-medium text-[11px] tracking-normal">{logoLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Header Action Buttons (Archive & Notifications) */}
          {showArchive && (
            <button
              onClick={() => onTabChange?.('archived-clients')}
              title="Archived Clients"
              aria-label="Archived Clients"
              className={`relative w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                activeTab === 'archived-clients'
                  ? 'bg-wellcare-primary text-white shadow-emerald-900/20'
                  : 'bg-white/80 border border-emerald-900/10 hover:bg-emerald-50 active:scale-95 text-emerald-900'
              }`}
            >
              <Archive size={17} />
              {archiveCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-sm">
                  {archiveCount > 99 ? '99+' : archiveCount}
                </span>
              )}
            </button>
          )}

          {showNotifications && (
            <button
              onClick={() => onTabChange?.('notifications')}
              title="Notifications"
              aria-label="Notifications"
              className={`relative w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                activeTab === 'notifications'
                  ? 'bg-wellcare-primary text-white shadow-emerald-900/20'
                  : 'bg-white/80 border border-emerald-900/10 hover:bg-emerald-50 active:scale-95 text-emerald-900'
              }`}
            >
              <Bell size={17} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {isMobile && !showNotifications && navItems.some(item => item.key === 'messages') && (
            <>
              <button
                onClick={() => onTabChange('notifications')}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-wellcare-accent/20 bg-white/60 text-wellcare-dark transition-all hover:bg-wellcare-accent/15 active:scale-95"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} />
                {navItems.find(item => item.key === 'notifications')?.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                    {navItems.find(item => item.key === 'notifications')?.badge}
                  </span>
                )}
              </button>
              <button
                onClick={() => onTabChange('messages')}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-wellcare-accent/20 bg-white/60 text-wellcare-dark transition-all hover:bg-wellcare-accent/15 active:scale-95"
                aria-label="Messages"
                title="Messages"
              >
                <MessageCircle size={16} />
                {navItems.find(item => item.key === 'messages')?.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                    {navItems.find(item => item.key === 'messages')?.badge}
                  </span>
                )}
              </button>
            </>
          )}
          
          {/* Profile Avatar - Far Right */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-xl bg-wellcare-primary text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 active:scale-95"
              title={userName || 'Profile'}
            >
              {(userName || 'U').charAt(0).toUpperCase()}
            </button>

            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl border border-wellcare-accent/20 shadow-lg rounded-xl p-1 animate-slide-up origin-top-right z-50"
              >
                <div className="px-3 py-2.5 border-b border-wellcare-accent/10 mb-1">
                  <div className="font-bold text-wellcare-deep text-sm">{userName || 'User'}</div>
                  <div className="text-wellcare-primary/70 text-xs font-medium">{userRole || 'Member'}</div>
                </div>
                
                {isMobile && navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onTabChange(item.key);
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-wellcare-dark rounded-lg hover:bg-wellcare-accent/8 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-wellcare-accent" /> {item.label}
                      </div>
                      {item.badge > 0 && (
                        <span className="bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
                {isMobile && <div className="h-px bg-wellcare-accent/10 my-1" />}
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  onClick={() => {
                    requestLogout();
                    setShowProfileMenu(false);
                  }}
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className={`flex flex-1 relative ${isMobile ? 'pb-20' : ''}`}>
        {/* ── Sidebar (Desktop Mode) ── */}
        {!isMobile && (
          <aside 
            className={`
              flex flex-col border-r border-wellcare-primary/15 bg-wellcare-deep/85 backdrop-blur-lg transition-all duration-300 ease-in-out z-40 p-2.5
              h-[calc(100vh-56px)] sticky top-[56px] shrink-0
              ${mobileOpen ? 'w-[68px] items-center' : 'w-[220px]'}
            `}
          >
            <div className="flex flex-col gap-1 w-full">
              {navItems.map((item) => {
                const active = item.key === activeTab;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => onTabChange(item.key)}
                    className={`
                      flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-bold transition-all duration-300 border focus:outline-none focus-visible:ring-2 focus-visible:ring-wellcare-accent
                      ${active 
                        ? 'bg-wellcare-accent/25 text-wellcare-light border-wellcare-accent/40 shadow-sm' 
                        : 'text-wellcare-light/70 border-transparent hover:bg-wellcare-accent/15 hover:text-wellcare-light'
                      }
                      ${mobileOpen ? 'justify-center' : 'justify-start w-full'}
                    `}
                  >
                    <Icon 
                      size={18} 
                      className={`flex-shrink-0 transition-transform duration-300 ${active ? 'text-wellcare-accent scale-110' : 'text-wellcare-accent/70'}`} 
                    />
                    {!mobileOpen && <span>{item.label}</span>}
                    {!mobileOpen && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto w-full border-t border-white/10 pt-2">
              <button
                onClick={requestLogout}
                title={mobileOpen ? 'Log Out' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg border border-transparent p-2.5 text-xs font-bold text-red-200 transition-colors hover:border-red-400/20 hover:bg-red-400/10 hover:text-white ${mobileOpen ? 'justify-center' : 'justify-start'}`}
              >
                <LogOut size={18} className="flex-shrink-0" />
                {!mobileOpen && <span>Log Out</span>}
              </button>
            </div>
          </aside>
        )}

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto p-3 md:p-5 lg:p-6 animate-fade-in">
          <div className="max-w-[1200px] w-full h-full mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Floating Bottom Navigation ── */}
      {isMobile && navItems.length > 0 && (
        <nav
          className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[456px] h-16 bg-white/90 backdrop-blur-2xl border border-wellcare-accent/20 shadow-[0_16px_48px_rgba(4,106,56,0.2)] flex items-center justify-around z-50 rounded-2xl px-2 py-2"
        >
          {navItems.map((item) => {
            const active = item.key === activeTab;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className="relative flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all duration-300 hover:bg-wellcare-accent/10 focus:outline-none focus:ring-2 focus:ring-wellcare-accent/40 flex-1 active:scale-95"
              >
                <Icon 
                  size={active ? 22 : 20} 
                  className={`transition-all duration-300 ${active ? 'text-wellcare-primary' : 'text-wellcare-dark/60'}`} 
                />
                <span className={`text-[8px] transition-all duration-300 ${active ? 'text-wellcare-primary font-bold' : 'text-wellcare-dark/60 font-medium'}`}>
                  {item.label}
                </span>
                
                {item.badge > 0 && (
                  <span className="absolute top-0 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-[7px] flex items-center justify-center font-bold shadow-md ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {confirmLogout && showLogoutConfirm && (
        <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setShowLogoutConfirm(false); }}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="staff-logout-title" style={{ maxWidth: 420 }}>
            <div className="modal-icon" aria-hidden="true"><LogOut size={28} /></div>
            <h3 id="staff-logout-title" className="modal-title">Log out?</h3>
            <p className="modal-sub" style={{ marginTop: 6 }}>Are you sure you want to log out?</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-logout" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: '#dc2626' }} onClick={() => onLogout?.()}>Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-200/80 flex justify-center w-full">
        {content}
      </div>
    );
  }

  return content;
}
