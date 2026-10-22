import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { Users, CheckCircle, Droplets, UserCheck, ArrowRight, Activity, CalendarDays, Archive, Calendar, Filter } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [logTarget, setLogTarget] = useState(null);

  // Date range states for Attendance Rate
  const todayStr = new Date().toISOString().slice(0, 10);
  const [dateRangePreset, setDateRangePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('heiwa_session_admin')) { navigate('/login'); return; }
  }, [navigate]);

  const loadClients = useCallback(async () => {
    try {
      const res = await api.getClients();
      setClients(res.clients || []);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchivedCount = useCallback(async () => {
    try {
      const res = await api.getArchivedClients();
      setArchivedCount((res.clients || []).length);
    } catch (err) {
      // quiet
    }
  }, []);

  useEffect(() => {
    loadClients();
    loadArchivedCount();
    const interval = setInterval(() => {
      loadClients();
      loadArchivedCount();
    }, 4000);
    return () => clearInterval(interval);
  }, [loadClients, loadArchivedCount]);

  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await api.getMessages();
        const msgs = res.messages || [];
        setUnreadMsgCount(msgs.filter(m => m.sender === 'client' && !m.read_by_admin).length);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 4000);
    return () => clearInterval(interval);
  }, []);

  // Set dates based on preset
  const handlePresetChange = (preset) => {
    setDateRangePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const d = now.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date(now.setDate(now.getDate() - 1)).toISOString().slice(0, 10);
      setStartDate(y);
      setEndDate(y);
    } else if (preset === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(new Date().toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      setStartDate(`${y}-${m}-01`);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Fetch attendance summary when date range changes
  useEffect(() => {
    let isMounted = true;
    const fetchAttendance = async () => {
      setLoadingAttendance(true);
      try {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const res = await api.getAttendanceSummary(params);
        if (isMounted && res.success) {
          setAttendanceData(res.summary);
        }
      } catch (e) {
        // quiet error
      } finally {
        if (isMounted) setLoadingAttendance(false);
      }
    };

    fetchAttendance();
    return () => { isMounted = false; };
  }, [startDate, endDate]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogAction = async () => {
    if (!logTarget) return;
    const { client: c, type } = logTarget;
    
    let apiType = '';
    if (type === 'checkin') apiType = 'Check-in';
    else if (type === 'absence') apiType = 'Absence';
    else if (type === 'alkaline') apiType = 'Alkaline Session';

    try {
      await api.logSession(c.id, apiType);
      showToast(`${apiType} logged for ${c.full_name}`);
      loadClients();
      // refresh attendance
      const res = await api.getAttendanceSummary({ startDate, endDate });
      if (res.success) setAttendanceData(res.summary);
    } catch (err) {
      console.error('Failed to log session', err);
      showToast('Error logging session: ' + err.message, 'error');
    }
    
    setLogTarget(null);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const totalClientsCheckins = clients.reduce((s, c) => s + (c.total_checkins || 0), 0);
  const totalClientsAlkaline = clients.reduce((s, c) => s + (c.total_bottles || 0), 0);
  const totalClientsAbsences = clients.reduce((s, c) => s + (c.absences || 0), 0);

  // Compute attendance rate for display based on date range
  const displayAttendance = useMemo(() => {
    if (startDate || endDate) {
      if (attendanceData && attendanceData.recordsCount > 0) {
        return {
          checkins: attendanceData.checkins,
          absences: attendanceData.absences,
          alkaline: attendanceData.alkaline,
          rate: attendanceData.attendanceRate,
          isFiltered: true
        };
      }
      return {
        checkins: attendanceData?.checkins || 0,
        absences: attendanceData?.absences || 0,
        alkaline: attendanceData?.alkaline || 0,
        rate: attendanceData?.attendanceRate ?? 100,
        isFiltered: true
      };
    }

    // All time default
    const totalEvents = totalClientsCheckins + totalClientsAbsences;
    const rate = totalEvents > 0
      ? Math.round((totalClientsCheckins / totalEvents) * 100)
      : 100;
    return {
      checkins: totalClientsCheckins,
      absences: totalClientsAbsences,
      alkaline: totalClientsAlkaline,
      rate,
      isFiltered: false
    };
  }, [startDate, endDate, attendanceData, totalClientsCheckins, totalClientsAbsences, totalClientsAlkaline]);

  const enrolled = clients.filter(c => c.fingerprint_enrolled).length;

  const topClients = [...clients]
    .sort((a, b) => (b.total_checkins || 0) - (a.total_checkins || 0))
    .slice(0, 4);

  const maxVisits = Math.max(...clients.map(x => x.total_checkins || 0), 1);

  return (
    <AdminLayout unreadMsgCount={unreadMsgCount}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-glass-lg z-[300] font-bold text-sm flex items-center gap-3 animate-slide-up ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-wellcare-primary text-white'}`}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      {/* Log Action Confirm Modal */}
      {logTarget && (
        <div className="fixed inset-0 bg-wellcare-deep/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-3xl p-8 shadow-glass-lg max-w-[480px] w-full animate-slide-up">
            <h3 className="text-2xl font-bold text-wellcare-deep mb-2">Confirm Action</h3>
            <p className="text-wellcare-dark/80 text-sm mb-8">
              Log a <strong className="text-wellcare-primary">{logTarget.type === 'checkin' ? 'Check-in' : logTarget.type === 'absence' ? 'Absence' : 'Alkaline Session'}</strong> for <strong className="text-wellcare-deep">{logTarget.client.full_name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white/10 backdrop-blur-md border border-wellcare-accent/20 text-wellcare-deep hover:bg-wellcare-accent/10 transition-colors"
                onClick={() => setLogTarget(null)}
              >
                Cancel
              </button>
              <button 
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-wellcare-primary hover:bg-wellcare-accent shadow-lg shadow-wellcare-primary/30 transition-all focus:ring-2 focus:ring-wellcare-accent/50"
                onClick={handleLogAction}
              >
                Confirm & Log
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        
        {/* ── 1. GREETING HEADER ── */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-wellcare-deep">
              {greeting()}, Admin! 👋
            </h2>
            <p className="text-wellcare-dark/70 text-sm mt-1 font-medium">
              Here's what's happening at WellCare today.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-wellcare-dark/70 bg-white/80 px-4 py-2.5 rounded-xl border border-emerald-900/10 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* ── 2. COMPACT 4 STATISTICS CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL CLIENTS', value: clients.length, sub: 'Registered Members', icon: Users, color: 'text-wellcare-primary', bg: 'bg-wellcare-primary/10' },
            { label: 'TOTAL CHECK-INS', value: totalClientsCheckins, sub: 'All-time verified', icon: CheckCircle, color: 'text-wellcare-accent', bg: 'bg-wellcare-accent/10' },
            { label: 'ALKALINE SESSIONS', value: totalClientsAlkaline, sub: 'Therapy sessions', icon: Droplets, color: 'text-sky-500', bg: 'bg-sky-500/10' },
            { label: 'BIOMETRIC ENROLLED', value: `${enrolled}/${clients.length}`, sub: 'Fingerprint active', icon: UserCheck, color: 'text-wellcare-dark', bg: 'bg-wellcare-dark/10' },
          ].map(s => (
            <div key={s.label} className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-glass rounded-2xl p-5 hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-wellcare-primary to-wellcare-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-wellcare-dark/70 tracking-widest">{s.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} border border-white/50 shadow-sm`}>
                  <s.icon size={20} className={s.color} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-wellcare-deep tracking-tight">{s.value}</div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-wellcare-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-wellcare-accent shadow-[0_0_6px_#10b981]"></span> {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── 3. ATTENDANCE RATE WITH PER-DATE RANGE FILTER + CLIENT ACTIVITY GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Attendance Rate with Date Range Filtering */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-glass rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Calendar size={17} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-wellcare-deep">Attendance Rate</h3>
                    <p className="text-[11px] text-wellcare-dark/60 font-medium">Filter by specific date or range</p>
                  </div>
                </div>

                {/* Range Preset Selector */}
                <select
                  value={dateRangePreset}
                  onChange={e => handlePresetChange(e.target.value)}
                  className="bg-wellcare-accent/10 border border-wellcare-accent/20 text-wellcare-primary font-bold text-xs py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellcare-accent/40 cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Date Pickers (Shown for custom or specific filtering) */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-emerald-50/60 border border-emerald-900/10 rounded-xl mb-4">
                <div className="flex items-center gap-1.5 text-xs text-emerald-950 font-bold">
                  <span>From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setDateRangePreset('custom');
                      setStartDate(e.target.value);
                    }}
                    className="px-2 py-1 bg-white border border-emerald-900/15 rounded-lg text-xs font-semibold text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-950 font-bold">
                  <span>To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => {
                      setDateRangePreset('custom');
                      setEndDate(e.target.value);
                    }}
                    className="px-2 py-1 bg-white border border-emerald-900/15 rounded-lg text-xs font-semibold text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => handlePresetChange('all')}
                    className="ml-auto text-[11px] text-emerald-700 font-bold hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 py-2">
              <svg viewBox="0 0 200 110" width="180" height="100">
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="14" strokeLinecap="round" />
                <path
                  d={`M 20 100 A 80 80 0 ${displayAttendance.rate > 50 ? 1 : 0} 1 ${(
                    20 + 160 * Math.cos(Math.PI - (Math.PI * displayAttendance.rate) / 100)
                  ).toFixed(2)} ${(
                    100 - 80 * Math.sin((Math.PI * displayAttendance.rate) / 100)
                  ).toFixed(2)}`}
                  fill="none"
                  stroke={displayAttendance.rate >= 70 ? '#10b981' : displayAttendance.rate >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="14" strokeLinecap="round"
                  style={{ transition: 'all 0.8s ease' }}
                />
                <text x="100" y="86" textAnchor="middle" fill="#022c22" fontSize="28" fontWeight="800" fontFamily="inherit">
                  {displayAttendance.rate}%
                </text>
                <text x="100" y="104" textAnchor="middle" fill="#064e3b" fontSize="10" fontWeight="600" opacity="0.6" fontFamily="inherit">
                  {displayAttendance.isFiltered ? 'Date Range Rate' : 'Overall Rate'}
                </text>
              </svg>
              
              <div className="text-center mt-2">
                <div className="text-sm font-bold text-wellcare-dark">
                  {displayAttendance.checkins} Check-in{displayAttendance.checkins === 1 ? '' : 's'} · {displayAttendance.absences} Absence{displayAttendance.absences === 1 ? '' : 's'}
                </div>
                {displayAttendance.alkaline > 0 && (
                  <div className="text-xs font-semibold text-sky-600 mt-1">
                    {displayAttendance.alkaline} Alkaline Session{displayAttendance.alkaline === 1 ? '' : 's'}
                  </div>
                )}
                {displayAttendance.isFiltered && (
                  <div className="text-[11px] font-semibold text-emerald-800/70 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                    📅 {startDate || 'Start'} to {endDate || 'End'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Attending Clients Leaderboard */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-glass rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-wellcare-deep uppercase tracking-tight">Top Attending Clients</h3>
              </div>

              <div className="flex flex-col gap-4">
                {topClients.map((c, i) => (
                  <div key={c.id} className="border-b border-wellcare-primary/10 last:border-0 pb-3 last:pb-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-wellcare-accent w-5">#{i + 1}</span>
                        <span className="text-sm font-bold text-wellcare-deep">{c.full_name}</span>
                      </div>
                      <span className="text-xs font-bold text-wellcare-dark">{c.total_checkins || 0} visits</span>
                    </div>
                    <div className="h-1.5 bg-wellcare-accent/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-wellcare-accent rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.round(((c.total_checkins || 0) / maxVisits) * 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
                {topClients.length === 0 && (
                  <div className="py-6 text-center">
                    <div className="text-3xl mb-2">🌿</div>
                    <div className="text-sm font-bold text-wellcare-dark/70">No attendance records yet.</div>
                    <div className="text-xs font-medium text-wellcare-dark/50 mt-1">Check-ins will appear here once logged.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => navigate('/clients')}
                className="text-xs font-bold text-wellcare-primary hover:text-wellcare-accent transition-colors inline-flex items-center gap-1 group"
              >
                View All Clients <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

        {/* ── 4. WEEKLY ACTIVITY CHART ── */}
        <section className="overflow-hidden rounded-3xl border border-emerald-100/80 bg-white shadow-[0_18px_50px_rgba(6,78,59,0.08)]">
          <div className="flex flex-col gap-5 border-b border-emerald-950/5 bg-gradient-to-r from-white via-emerald-50/50 to-sky-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-800/15">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-wellcare-deep sm:text-xl">Weekly Activity Overview</h3>
                <p className="mt-1 text-xs font-medium text-wellcare-dark/55 sm:text-sm">Check-ins and Alkaline uses for the last 7 days</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-2 text-xs font-bold text-wellcare-dark">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-[0_0_0_3px_rgba(5,150,105,0.12)]" /> Check-ins
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-2 text-xs font-bold text-wellcare-dark">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]" /> Alkaline
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/[0.04] px-3 py-2 text-[11px] font-bold text-emerald-900/60">
                <CalendarDays size={13} /> Last 7 days
              </span>
            </div>
          </div>

          <div className="px-4 pb-5 pt-6 sm:px-7 sm:pb-7">
            <div className="relative h-56 sm:h-64">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-8 pt-1 text-[10px] font-semibold text-emerald-950/35">
                {[80, 60, 40, 20, 0].map(value => (
                  <div key={value} className="flex items-center gap-3">
                    <span className="w-5 text-right">{value}</span>
                    <span className="h-px flex-1 border-t border-dashed border-emerald-900/10" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-y-1 left-9 right-1 grid grid-cols-7 gap-1 sm:gap-3">
                {[
                  { day: 'Mon', checkins: 45, alkaline: 20 },
                  { day: 'Tue', checkins: 52, alkaline: 25 },
                  { day: 'Wed', checkins: 38, alkaline: 15 },
                  { day: 'Thu', checkins: 65, alkaline: 30 },
                  { day: 'Fri', checkins: 48, alkaline: 22 },
                  { day: 'Sat', checkins: 70, alkaline: 40 },
                  { day: 'Sun', checkins: 30, alkaline: 10 },
                ].map(d => (
                  <div key={d.day} className="group relative flex min-w-0 flex-col items-center justify-end pb-8">
                    <div className="pointer-events-none absolute bottom-[calc(100%-2rem)] left-1/2 z-10 mb-2 -translate-x-1/2 translate-y-1 rounded-xl border border-white/10 bg-emerald-950 px-3 py-2 text-[10px] font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 sm:text-xs">
                      <span className="whitespace-nowrap">{d.checkins} Check-ins · {d.alkaline} Alk</span>
                    </div>
                    <div className="flex h-full w-full items-end justify-center gap-1 sm:gap-2">
                      <div
                        role="img"
                        aria-label={`${d.checkins} check-ins on ${d.day}`}
                        title={`${d.checkins} check-ins`}
                        className="w-[min(30%,24px)] min-w-[8px] rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-500 shadow-sm transition-all duration-300 group-hover:brightness-110"
                        style={{ height: `${(d.checkins / 80) * 100}%` }}
                      />
                      <div
                        role="img"
                        aria-label={`${d.alkaline} alkaline uses on ${d.day}`}
                        title={`${d.alkaline} alkaline uses`}
                        className="w-[min(30%,24px)] min-w-[8px] rounded-t-md bg-gradient-to-t from-sky-600 to-sky-400 shadow-sm transition-all duration-300 group-hover:brightness-110"
                        style={{ height: `${(d.alkaline / 80) * 100}%` }}
                      />
                    </div>
                    <span className="absolute bottom-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-wellcare-dark/55 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-800 sm:text-xs">
                      {d.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
