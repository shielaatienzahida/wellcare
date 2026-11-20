import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
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
  FileText,
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

  // Export PDF Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportPdf = async () => {
    if (isExporting) return;
    setExportError('');

    if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      setExportError('Start date cannot be later than end date.');
      return;
    }

    setIsExporting(true);
    try {
      const summaryRes = await api.getAttendanceSummary({
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
      }).catch(() => ({ history: [] }));

      const rangedAlkaline = (summaryRes?.history || []).filter((item) => {
        const t = String(item.type || '').toLowerCase();
        return t.includes('alkaline') || t.includes('water');
      });

      const reportDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
      const reportTime = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
      const dateRangeLabel = exportStartDate && exportEndDate
        ? `${exportStartDate} to ${exportEndDate}`
        : exportStartDate
          ? `From ${exportStartDate}`
          : exportEndDate
            ? `Up to ${exportEndDate}`
            : 'All Time';

      const dateStamp = new Date().toISOString().slice(0, 10);
      const filename = `WellCare_Alkaline_Inventory_${exportStartDate || 'all'}_to_${exportEndDate || dateStamp}.pdf`;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const drawFooter = (pageNum, totalPagesCount) => {
        pdf.setDrawColor(215, 226, 220);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text('WELLCARE HEALTHCARE SYSTEM · Alkaline Water Bottle Inventory Report', margin, pageHeight - 7.5);
        pdf.text(`Page ${pageNum} of ${totalPagesCount}`, pageWidth - margin, pageHeight - 7.5, { align: 'right' });
      };

      const ensureSpace = (needed) => {
        if (y + needed > pageHeight - 18) {
          pdf.addPage();
          y = margin;
        }
      };

      const drawSectionTitle = (title, subtitle = '') => {
        ensureSpace(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(4, 106, 56);
        pdf.text(title, margin, y);
        if (subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(subtitle, pageWidth - margin, y, { align: 'right' });
        }
        y += 2.2;
        pdf.setDrawColor(4, 106, 56);
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 4.5;
      };

      const drawTable = (columns, rows, emptyText = 'No bottle usage records found.') => {
        const headerHeight = 8;
        const rowHeight = 7;

        const drawHeader = () => {
          ensureSpace(headerHeight + rowHeight);
          pdf.setFillColor(4, 106, 56);
          pdf.rect(margin, y, contentWidth, headerHeight, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8.2);
          pdf.setTextColor(255, 255, 255);
          let x = margin;
          columns.forEach((col) => {
            const align = col.align || 'left';
            const textX = align === 'right' ? x + col.width - 2 : align === 'center' ? x + col.width / 2 : x + 2;
            pdf.text(col.label, textX, y + 5.3, { align });
            x += col.width;
          });
          y += headerHeight;
        };

        drawHeader();

        if (rows.length === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y, contentWidth, 9, 'F');
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.2);
          pdf.rect(margin, y, contentWidth, 9, 'S');
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(emptyText, pageWidth / 2, y + 5.8, { align: 'center' });
          y += 13;
          return;
        }

        rows.forEach((row, rIdx) => {
          if (y + rowHeight > pageHeight - 18) {
            pdf.addPage();
            y = margin;
            drawHeader();
          }
          if (rIdx % 2 === 1) {
            pdf.setFillColor(244, 251, 247);
            pdf.rect(margin, y, contentWidth, rowHeight, 'F');
          }
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.18);
          pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(15, 23, 42);

          let x = margin;
          columns.forEach((col) => {
            const rawVal = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '—';
            const maxChars = Math.max(4, Math.floor(col.width * 0.52));
            const cellText = rawVal.length > maxChars ? `${rawVal.slice(0, maxChars - 1)}…` : rawVal;
            const align = col.align || 'left';
            const textX = align === 'right' ? x + col.width - 2 : align === 'center' ? x + col.width / 2 : x + 2;
            pdf.text(cellText, textX, y + 4.8, { align });
            x += col.width;
          });
          y += rowHeight;
        });

        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.25);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 7;
      };

      // ── Header Banner ──
      pdf.setFillColor(4, 106, 56);
      pdf.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.setTextColor(255, 255, 255);
      pdf.text('WELLCARE HEALTHCARE SYSTEM', margin + 5, y + 9.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(209, 250, 229);
      pdf.text('Alkaline Water Bottle Inventory & Usage Report', margin + 5, y + 15.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Date Range: ${dateRangeLabel}`, pageWidth - margin - 5, y + 9.5, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(209, 250, 229);
      pdf.text(`Generated: ${reportDate} · ${reportTime}`, pageWidth - margin - 5, y + 15.5, { align: 'right' });
      pdf.text(`Records in Period: ${rangedAlkaline.length} bottles`, pageWidth - margin - 5, y + 20.5, { align: 'right' });
      y += 30;

      // ── 1. Inventory Summary Table ──
      const rangedBottles = rangedAlkaline.length;
      const rangedLiters = (rangedBottles * 0.5).toFixed(1);
      const rangedClientsCount = new Set(rangedAlkaline.map((r) => r.client_id)).size;

      drawSectionTitle('1. Alkaline Bottle Inventory Summary', `Period: ${dateRangeLabel}`);
      drawTable(
        [
          { key: 'metric', label: 'Inventory Metric', width: 84 },
          { key: 'value', label: 'Total', width: 38, align: 'right' },
          { key: 'notes', label: 'Details', width: 60 },
        ],
        [
          { metric: 'Bottles Used (Selected Period)', value: `${rangedBottles}`, notes: `${rangedLiters} Liters (${(rangedBottles * 500).toLocaleString()} mL)` },
          { metric: 'Active Consumers (Selected Period)', value: `${rangedClientsCount}`, notes: 'Unique clients served' },
          { metric: 'All-Time Total Bottles Used', value: `${stats.totalBottlesUsed}`, notes: `${stats.totalLiters} Liters cumulative` },
          { metric: 'Used Today', value: `${stats.todaySessions}`, notes: `${(stats.todaySessions * 0.5).toFixed(1)} L dispensed today` },
        ]
      );

      // ── 2. Per-Client Breakdown Table (within selected range) ──
      const perClientMap = {};
      rangedAlkaline.forEach((r) => {
        const key = r.client_id || r.full_name;
        if (!perClientMap[key]) {
          perClientMap[key] = {
            name: r.full_name || `Client #${r.client_id}`,
            cid: r.client_id_number || `ID-${r.client_id}`,
            bottles: 0,
            lastDate: r.date || (r.created_at ? String(r.created_at).slice(0, 16).replace('T', ' ') : '—'),
          };
        }
        perClientMap[key].bottles += 1;
      });
      const perClientRows = Object.values(perClientMap)
        .sort((a, b) => b.bottles - a.bottles)
        .map((c) => ({
          cid: c.cid,
          name: c.name,
          bottles: `${c.bottles} ${c.bottles === 1 ? 'bottle' : 'bottles'}`,
          volume: `${(c.bottles * 0.5).toFixed(1)} L (${(c.bottles * 500).toLocaleString()} mL)`,
          lastDate: c.lastDate,
        }));

      drawSectionTitle('2. Bottle Usage by Client', `${perClientRows.length} clients`);
      drawTable(
        [
          { key: 'cid', label: 'Client ID', width: 24 },
          { key: 'name', label: 'Client Name', width: 54 },
          { key: 'bottles', label: 'Bottles Used', width: 28, align: 'center' },
          { key: 'volume', label: 'Total Volume', width: 38, align: 'right' },
          { key: 'lastDate', label: 'Latest Log', width: 38 },
        ],
        perClientRows,
        'No client bottle consumption recorded for this date range.'
      );

      // ── 3. Detailed Bottle Usage Logs Table ──
      drawSectionTitle('3. Detailed Bottle Dispense Logs', `${rangedAlkaline.length} entries`);
      drawTable(
        [
          { key: 'id', label: 'Log #', width: 16 },
          { key: 'name', label: 'Client Name', width: 52 },
          { key: 'cid', label: 'Client ID', width: 24 },
          { key: 'qty', label: 'Quantity', width: 28, align: 'center' },
          { key: 'by', label: 'Logged By', width: 22 },
          { key: 'date', label: 'Date & Time', width: 40 },
        ],
        rangedAlkaline.map((r) => ({
          id: `#${r.id ?? ''}`,
          name: r.full_name || `Client #${r.client_id}`,
          cid: r.client_id_number || `ID-${r.client_id}`,
          qty: '1 Bottle (500 mL)',
          by: r.logged_by || 'staff',
          date: r.date || (r.created_at ? String(r.created_at).slice(0, 16).replace('T', ' ') : '—'),
        })),
        'No bottle dispense logs found in the selected date range.'
      );

      const totalPagesCount = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPagesCount; p++) {
        pdf.setPage(p);
        drawFooter(p, totalPagesCount);
      }

      pdf.save(filename);
      setShowExportModal(false);
    } catch (err) {
      console.error('Inventory PDF export error:', err);
      setExportError('Failed to generate PDF report. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
              onClick={() => {
                setExportError('');
                setShowExportModal(true);
              }}
              disabled={loading || isExporting}
              className="btn-primary"
              style={{ padding: '9px 16px', fontSize: '0.82rem' }}
            >
              <Download size={15} />
              {isExporting ? 'Generating PDF...' : 'Export PDF'}
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

      {/* ── Export PDF Date Range Modal ── */}
      {showExportModal && (
        <div
          role="presentation"
          onClick={() => !isExporting && setShowExportModal(false)}
          className="modal-overlay"
          style={{ zIndex: 120 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="modal-card"
            style={{ maxWidth: '450px', padding: '26px', borderRadius: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--emerald-50)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-700)' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.12rem', marginBottom: 2 }}>Export Water Inventory PDF</h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>Select date range for tabular bottle records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isExporting && setShowExportModal(false)}
                style={{ background: 'var(--emerald-50)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--emerald-800)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {/* Quick Presets */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--emerald-800)', marginBottom: '6px' }}>
                  Quick Date Presets
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Today', fn: () => { const t = new Date().toISOString().slice(0, 10); setExportStartDate(t); setExportEndDate(t); } },
                    { label: 'Last 7 Days', fn: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 6); setExportStartDate(s.toISOString().slice(0, 10)); setExportEndDate(e.toISOString().slice(0, 10)); } },
                    { label: 'This Month', fn: () => { const e = new Date(); const s = new Date(e.getFullYear(), e.getMonth(), 1); setExportStartDate(s.toISOString().slice(0, 10)); setExportEndDate(e.toISOString().slice(0, 10)); } },
                    { label: 'All Time', fn: () => { setExportStartDate(''); setExportEndDate(''); } },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={preset.fn}
                      style={{
                        padding: '5px 11px', borderRadius: '99px', fontSize: '0.74rem', fontWeight: 700,
                        border: '1px solid rgba(4,106,56,0.2)', background: 'var(--emerald-50)',
                        color: 'var(--emerald-800)', cursor: 'pointer'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--emerald-800)', marginBottom: '5px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="login-input"
                    style={{ padding: '9px 12px', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--emerald-800)', marginBottom: '5px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="login-input"
                    style={{ padding: '9px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {exportError && (
                <div className="login-error" style={{ margin: 0 }}>{exportError}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isExporting}
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={isExporting}
                  onClick={handleExportPdf}
                >
                  <Download size={15} />
                  {isExporting ? 'Generating PDF...' : 'Download PDF'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

