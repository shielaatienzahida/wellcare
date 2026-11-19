import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Package,
  Search,
  Calendar,
  RefreshCw,
  User,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  X,
} from 'lucide-react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';

const ITEMS_PER_PAGE = 10;

export default function AdminInventory() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('heiwa_session_admin')) {
      navigate('/login');
    }
  }, [navigate]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [clients, setClients] = useState([]);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loggedByFilter, setLoggedByFilter] = useState('all');
  const [activeView, setActiveView] = useState('logs'); // 'logs' | 'by-client'
  const [page, setPage] = useState(1);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [summaryRes, clientsRes] = await Promise.all([
        api.getAttendanceSummary().catch(() => ({ history: [] })),
        api.getClients().catch(() => ({ clients: [] })),
      ]);

      const allHistory = summaryRes.history || [];
      const alkalineOnly = allHistory.filter((item) => {
        const t = String(item.type || '').toLowerCase();
        return t.includes('alkaline') || t.includes('water');
      });

      setHistory(alkalineOnly);
      setClients(clientsRes.clients || []);
    } catch (err) {
      setError(err.message || 'Failed to load alkaline bottle inventory records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(true), 15000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Helper to check if a record matches a YYYY-MM-DD date string
  const matchesDate = (record, targetIso) => {
    if (!targetIso) return true;
    const createdStr = String(record.created_at || '');
    const dateStr = String(record.date || '');
    if (createdStr.startsWith(targetIso) || dateStr.startsWith(targetIso)) return true;

    try {
      const [y, m, d] = targetIso.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fmt1 = `${months[m - 1]} ${d}, ${y}`;
      const fmt2 = `${months[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
      if (dateStr.includes(fmt1) || dateStr.includes(fmt2)) return true;
    } catch {}
    return false;
  };

  // Summary metrics
  const stats = useMemo(() => {
    const todayIso = new Date().toLocaleDateString('en-CA');
    const thisMonthPrefix = todayIso.slice(0, 7);

    const totalSessions = history.length;
    const totalFromClients = clients.reduce((sum, c) => sum + Number(c.total_bottles || 0), 0);
    const totalBottlesUsed = Math.max(totalSessions, totalFromClients);
    const totalLiters = (totalBottlesUsed * 0.5).toFixed(1);

    const todaySessions = history.filter((h) => matchesDate(h, todayIso)).length;
    const monthSessions = history.filter((h) => {
      const createdStr = String(h.created_at || '');
      if (createdStr.startsWith(thisMonthPrefix)) return true;
      const [y, m] = thisMonthPrefix.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return String(h.date || '').includes(`${months[m - 1]} `) && String(h.date || '').includes(String(y));
    }).length;

    const activeConsumers = new Set(history.map((h) => h.client_id)).size;

    return {
      totalBottlesUsed,
      totalLiters,
      todaySessions,
      monthSessions,
      activeConsumers,
    };
  }, [history, clients]);

  // Filtered usage logs
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((item) => {
      if (q) {
        const name = String(item.full_name || '').toLowerCase();
        const cid = String(item.client_id_number || item.client_id || '').toLowerCase();
        const date = String(item.date || '').toLowerCase();
        if (!name.includes(q) && !cid.includes(q) && !date.includes(q)) return false;
      }
      if (dateFilter && !matchesDate(item, dateFilter)) return false;
      if (loggedByFilter !== 'all') {
        const by = String(item.logged_by || 'staff').toLowerCase();
        if (by !== loggedByFilter) return false;
      }
      return true;
    });
  }, [history, search, dateFilter, loggedByFilter]);

  // Client breakdown sorted by highest bottles used
  const clientBreakdown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...clients]
      .filter((c) => {
        const bottles = Number(c.total_bottles || 0);
        if (bottles <= 0) return false;
        if (!q) return true;
        return (
          String(c.full_name || '').toLowerCase().includes(q) ||
          String(c.client_id_number || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.total_bottles || 0) - Number(a.total_bottles || 0));
  }, [clients, search]);

  const activeList = activeView === 'logs' ? filteredLogs : clientBreakdown;
  const totalPages = Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedItems = activeList.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const exportCsv = () => {
    const headers = ['Record ID', 'Client Name', 'Client ID', 'Type', 'Logged By', 'Date & Time'];
    const rows = filteredLogs.map((r) => [
      r.id ?? '',
      `"${String(r.full_name || 'Unknown Client').replace(/"/g, '""')}"`,
      r.client_id_number || r.client_id || '',
      `"${String(r.type || 'Alkaline Session').replace(/"/g, '""')}"`,
      r.logged_by || 'staff',
      `"${String(r.date || r.created_at || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alkaline-water-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <main className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="page-eyebrow">Supply & Usage Tracking</p>
            <h2 className="page-title flex items-center gap-2.5">
              <Package size={26} className="text-emerald-700" />
              Alkaline Water Inventory
            </h2>
            <p className="page-sub">
              Complete record of alkaline water bottles dispensed and consumed across all clients.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="btn-secondary"
              style={{ padding: '9px 15px', fontSize: '0.82rem' }}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredLogs.length === 0}
              className="btn-primary"
              style={{ padding: '9px 16px', fontSize: '0.82rem' }}
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
            {error}
          </div>
        )}

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/75 backdrop-blur-xl border border-white/70 shadow-glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-wellcare-dark/60">
                Total Bottles Used
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Droplets size={18} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-wellcare-deep">
              {stats.totalBottlesUsed}
            </div>
            <div className="mt-1 text-xs font-semibold text-emerald-700">
              {stats.totalLiters} Liters total dispensed
            </div>
          </div>

          <div className="bg-white/75 backdrop-blur-xl border border-white/70 shadow-glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-wellcare-dark/60">
                Used Today
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-wellcare-deep">
              {stats.todaySessions}
            </div>
            <div className="mt-1 text-xs font-semibold text-sky-700">
              {(stats.todaySessions * 0.5).toFixed(1)} L dispensed today
            </div>
          </div>

          <div className="bg-white/75 backdrop-blur-xl border border-white/70 shadow-glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-wellcare-dark/60">
                This Month
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-wellcare-deep">
              {stats.monthSessions}
            </div>
            <div className="mt-1 text-xs font-semibold text-amber-700">
              {(stats.monthSessions * 0.5).toFixed(1)} L this month
            </div>
          </div>

          <div className="bg-white/75 backdrop-blur-xl border border-white/70 shadow-glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-wellcare-dark/60">
                Active Clients
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <User size={18} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-wellcare-deep">
              {stats.activeConsumers}
            </div>
            <div className="mt-1 text-xs font-semibold text-teal-700">
              Clients with recorded bottle usage
            </div>
          </div>
        </div>

        {/* ── View Switcher + Filter Toolbar ── */}
        <div className="bg-white/75 backdrop-blur-xl border border-white/70 shadow-glass rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="inline-flex bg-emerald-50/80 border border-emerald-900/10 p-1 rounded-xl self-start">
              <button
                type="button"
                onClick={() => { setActiveView('logs'); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'logs'
                    ? 'bg-wellcare-primary text-white shadow-sm'
                    : 'text-emerald-900/70 hover:text-emerald-900'
                }`}
              >
                Bottle Usage Logs ({filteredLogs.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveView('by-client'); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'by-client'
                    ? 'bg-wellcare-primary text-white shadow-sm'
                    : 'text-emerald-900/70 hover:text-emerald-900'
                }`}
              >
                Usage by Client ({clientBreakdown.length})
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search client name or ID..."
                  className="bg-white border border-emerald-900/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-wellcare-deep focus:outline-none focus:ring-2 focus:ring-emerald-600/25 w-52"
                />
              </div>

              {activeView === 'logs' && (
                <>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/60 pointer-events-none" />
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                      className="bg-white border border-emerald-900/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-wellcare-deep focus:outline-none focus:ring-2 focus:ring-emerald-600/25"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <Filter size={14} className="absolute left-3 text-emerald-700/60 pointer-events-none" />
                    <select
                      value={loggedByFilter}
                      onChange={(e) => { setLoggedByFilter(e.target.value); setPage(1); }}
                      className="bg-white border border-emerald-900/15 rounded-xl pl-8 pr-7 py-2 text-xs font-semibold text-wellcare-deep focus:outline-none focus:ring-2 focus:ring-emerald-600/25"
                    >
                      <option value="all">All Sources</option>
                      <option value="staff">Logged by Staff</option>
                      <option value="admin">Logged by Admin</option>
                      <option value="client">Logged by Client</option>
                    </select>
                  </div>
                </>
              )}

              {(search || dateFilter || loggedByFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDateFilter('');
                    setLoggedByFilter('all');
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Table Content ── */}
          {loading ? (
            <div className="py-16 text-center text-sm font-semibold text-emerald-800/60">
              Loading alkaline water bottle records...
            </div>
          ) : pagedItems.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Droplets size={24} />
              </div>
              <p className="text-sm font-bold text-wellcare-deep">No bottle usage records found</p>
              <p className="text-xs text-wellcare-dark/60">
                Try adjusting your search or date filter.
              </p>
            </div>
          ) : activeView === 'logs' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-emerald-900/10 text-[11px] font-extrabold uppercase tracking-wider text-wellcare-dark/60">
                    <th className="py-3 px-4">Record #</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Client ID</th>
                    <th className="py-3 px-4">Bottle / Session</th>
                    <th className="py-3 px-4">Logged By</th>
                    <th className="py-3 px-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/5 text-sm">
                  {pagedItems.map((row) => (
                    <tr key={row.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-wellcare-dark/60">#{row.id}</td>
                      <td className="py-3.5 px-4 font-bold text-wellcare-deep">
                        {row.full_name || `Client #${row.client_id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="badge-emerald text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {row.client_id_number || `ID-${row.client_id}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          <Droplets size={12} />
                          1 Bottle (500 mL)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-xs font-semibold text-wellcare-dark/75">
                        {row.logged_by || 'staff'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-wellcare-dark/70">
                        {row.date || row.created_at || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-emerald-900/10 text-[11px] font-extrabold uppercase tracking-wider text-wellcare-dark/60">
                    <th className="py-3 px-4">Client Name</th>
                    <th className="py-3 px-4">Client ID</th>
                    <th className="py-3 px-4">Total Bottles Used</th>
                    <th className="py-3 px-4">Total Volume</th>
                    <th className="py-3 px-4">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/5 text-sm">
                  {pagedItems.map((c) => {
                    const bottles = Number(c.total_bottles || 0);
                    return (
                      <tr key={c.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-wellcare-deep">{c.full_name}</td>
                        <td className="py-3.5 px-4">
                          <span className="badge-emerald text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            {c.client_id_number || `ID-${c.id}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Droplets size={12} />
                            {bottles} {bottles === 1 ? 'bottle' : 'bottles'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-sky-700">
                          {(bottles * 0.5).toFixed(1)} L ({(bottles * 500).toLocaleString()} mL)
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-wellcare-dark/70">
                          {c.last_seen || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination Controls ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-emerald-900/10">
              <span className="text-xs font-semibold text-wellcare-dark/60">
                Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(safePage * ITEMS_PER_PAGE, activeList.length)} of {activeList.length} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-900/15 bg-white text-xs font-bold text-wellcare-deep disabled:opacity-40 hover:bg-emerald-50"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-xs font-extrabold text-wellcare-deep px-2">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-900/15 bg-white text-xs font-bold text-wellcare-deep disabled:opacity-40 hover:bg-emerald-50"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

