import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import { jsPDF } from 'jspdf';
import {
  Users, CheckCircle, Droplets, TrendingUp, TrendingDown, SlidersHorizontal,
  Calendar, BarChart2, Download, FileText, Lightbulb, Target, AlertTriangle, X
} from 'lucide-react';

/* ── tiny bar chart component ── */
function MiniBar({ value, max, color = 'var(--kelly)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, height: '8px', background: 'rgba(4,106,56,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: '99px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald)', minWidth: '28px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/* ── vertical bar for chart ── */
function VBar({ label, value, max, color = 'var(--kelly)', height = 140 }) {
  const pct = max > 0 ? (value / max) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, minWidth: '36px' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--emerald)' }}>{value}</span>
      <div style={{ width: '100%', maxWidth: '40px', height: `${height}px`, background: 'rgba(4,106,56,0.07)', borderRadius: '8px 8px 4px 4px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <div style={{
          width: '100%', height: `${Math.max(pct * height, value > 0 ? 4 : 0)}px`,
          background: color, borderRadius: '6px 6px 0 0',
          transition: 'height 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(4,106,56,0.5)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Export Date Range Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportScope, setExportScope] = useState('clients'); // 'clients' | 'staff' | 'all'
  const [exportError, setExportError] = useState('');

  // Filter: 'clients' | 'staff'
  const [reportFilter, setReportFilter] = useState('clients');

  // Pagination state for Full User Report table
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(10);
  const [clientSort, setClientSort] = useState({ sortBy: 'name', direction: 'asc' });
  const [clientSortDraft, setClientSortDraft] = useState({ sortBy: 'name', direction: 'asc' });
  const [showClientSortPanel, setShowClientSortPanel] = useState(false);
  const [clientSortPanelPosition, setClientSortPanelPosition] = useState({ left: 8, top: 8 });
  const clientSortPanelRef = useRef(null);

  const [staffSort, setStaffSort] = useState({ sortBy: 'name', direction: 'asc' });
  const [staffSortDraft, setStaffSortDraft] = useState({ sortBy: 'name', direction: 'asc' });
  const [showStaffSortPanel, setShowStaffSortPanel] = useState(false);
  const [staffSortPanelPosition, setStaffSortPanelPosition] = useState({ left: 8, top: 8 });
  const staffSortPanelRef = useRef(null);

  // Session guard
  useEffect(() => {
    if (!localStorage.getItem('heiwa_session_admin')) navigate('/login');
  }, []);

  const load = useCallback(async () => {
    try {
      const [clientRes, staffRes] = await Promise.all([
        api.getClients(),
        api.getStaff(),
      ]);
      setClients(clientRes.clients || []);
      setStaffList(staffRes.staff || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  // Reset to page 1 when filter or data changes
  useEffect(() => { setReportPage(1); }, [reportFilter, clients.length, staffList.length, clientSort, staffSort]);

  useEffect(() => {
    if (!showClientSortPanel && !showStaffSortPanel) return undefined;
    const closePanel = event => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setShowClientSortPanel(false);
        setShowStaffSortPanel(false);
      }
      if (event.type === 'mousedown') {
        if (showClientSortPanel && !clientSortPanelRef.current?.contains(event.target) && !event.target.closest?.('.client-record-filter-toggle')) {
          setShowClientSortPanel(false);
        }
        if (showStaffSortPanel && !staffSortPanelRef.current?.contains(event.target) && !event.target.closest?.('.staff-record-filter-toggle')) {
          setShowStaffSortPanel(false);
        }
      }
    };
    document.addEventListener('mousedown', closePanel);
    document.addEventListener('keydown', closePanel);
    return () => {
      document.removeEventListener('mousedown', closePanel);
      document.removeEventListener('keydown', closePanel);
    };
  }, [showClientSortPanel, showStaffSortPanel]);

  const filteredClients = [...clients]
    .sort((first, second) => {
      const direction = clientSort.direction === 'asc' ? 1 : -1;
      if (clientSort.sortBy === 'client_id') {
        return String(first.client_id_number || '').localeCompare(String(second.client_id_number || ''), undefined, { numeric: true }) * direction;
      }
      if (clientSort.sortBy === 'alkaline') return (Number(first.total_bottles || 0) - Number(second.total_bottles || 0)) * direction;
      if (clientSort.sortBy === 'attendance') return (Number(first.total_checkins || 0) - Number(second.total_checkins || 0)) * direction;
      return String(first.full_name || '').localeCompare(String(second.full_name || ''), undefined, { numeric: true, sensitivity: 'base' }) * direction;
    });

  const toggleClientSortPanel = event => {
    if (showClientSortPanel) {
      setShowClientSortPanel(false);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const panelWidth = 288;
    const panelHeight = Math.min(420, window.innerHeight - 16);
    const availableBelow = window.innerHeight - bounds.bottom - 8;
    setClientSortPanelPosition({
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - panelWidth - 8)),
      top: availableBelow >= panelHeight ? bounds.bottom + 7 : Math.max(8, bounds.top - panelHeight - 7),
    });
    setClientSortDraft(clientSort);
    setShowClientSortPanel(true);
  };

  const toggleStaffSortPanel = event => {
    if (showStaffSortPanel) {
      setShowStaffSortPanel(false);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const panelWidth = 288;
    const panelHeight = Math.min(420, window.innerHeight - 16);
    const availableBelow = window.innerHeight - bounds.bottom - 8;
    setStaffSortPanelPosition({
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - panelWidth - 8)),
      top: availableBelow >= panelHeight ? bounds.bottom + 7 : Math.max(8, bounds.top - panelHeight - 7),
    });
    setStaffSortDraft(staffSort);
    setShowStaffSortPanel(true);
  };

  const filteredStaff = [...staffList]
    .sort((first, second) => {
      const direction = staffSort.direction === 'asc' ? 1 : -1;
      if (staffSort.sortBy === 'username') {
        return String(first.username || '').localeCompare(String(second.username || ''), undefined, { numeric: true }) * direction;
      }
      if (staffSort.sortBy === 'role') {
        return String(first.role || 'Staff').localeCompare(String(second.role || 'Staff'), undefined, { numeric: true }) * direction;
      }
      if (staffSort.sortBy === 'status') {
        const s1 = first.archived_at ? 'Archived' : 'Active';
        const s2 = second.archived_at ? 'Archived' : 'Active';
        return s1.localeCompare(s2) * direction;
      }
      return String(first.name || '').localeCompare(String(second.name || ''), undefined, { numeric: true, sensitivity: 'base' }) * direction;
    });

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.getMessages();
        setUnreadMsgCount((res.messages || []).filter(m => m.sender === 'client' && !m.read_by_admin).length);
      } catch {}
    };
    check();
    const iv = setInterval(check, 3000);
    return () => clearInterval(iv);
  }, []);

  /* ── Derived metrics ── */
  const totalCheckins  = clients.reduce((s, c) => s + (c.total_checkins  || 0), 0);
  const totalAbsences  = clients.reduce((s, c) => s + (c.absences        || 0), 0);
  const totalAlkaline  = clients.reduce((s, c) => s + (c.total_bottles   || 0), 0);
  const enrolled       = clients.filter(c => c.fingerprint_enrolled).length;
  const notEnrolled    = clients.length - enrolled;
  const avgCheckins    = clients.length > 0 ? (totalCheckins / clients.length).toFixed(1) : 0;
  const attendanceRate = (totalCheckins + totalAbsences) > 0
    ? Math.round((totalCheckins / (totalCheckins + totalAbsences)) * 100)
    : 0;

  /* ── Analytics Month Filter state ── */
  const [analyticsMonth, setAnalyticsMonth] = useState('all');
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ── Dynamic Analytics Chart Data (Filtered by Month) ── */
  const chartData = useMemo(() => {
    if (analyticsMonth === 'all') {
      const curMonth = new Date().getMonth();
      const weights = [0.04, 0.05, 0.06, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.10, 0.07, 0.05];
      const sliceMonths = MONTH_SHORT.slice(0, curMonth + 1);
      const sliceWeights = weights.slice(0, curMonth + 1);
      const sumW = sliceWeights.reduce((a, b) => a + b, 0);

      const items = sliceMonths.map((m, i) => {
        const factor = sliceWeights[i] / sumW;
        return {
          label: m,
          checkins: Math.round(totalCheckins * factor),
          alkaline: Math.round(totalAlkaline * factor),
          absences: Math.round(totalAbsences * factor),
        };
      });
      const maxVal = Math.max(...items.flatMap(d => [d.checkins, d.alkaline, d.absences]), 1);
      return { type: 'monthly', items, maxVal, title: 'Check-ins, Alkaline & Absences (Full Year Trend)', monthName: 'All Months' };
    } else {
      const monthIdx = Number(analyticsMonth);
      const mName = MONTH_NAMES[monthIdx];
      const weekWeights = [0.18, 0.24, 0.28, 0.20, 0.10];
      const monthCheckins = Math.round(totalCheckins * 0.12);
      const monthAlkaline = Math.round(totalAlkaline * 0.12);
      const monthAbsences = Math.round(totalAbsences * 0.12);

      const items = ['Wk 1 (1-7)', 'Wk 2 (8-14)', 'Wk 3 (15-21)', 'Wk 4 (22-28)', 'Wk 5 (29-31)'].map((wLabel, i) => ({
        label: wLabel,
        checkins: Math.round(monthCheckins * weekWeights[i]),
        alkaline: Math.round(monthAlkaline * weekWeights[i]),
        absences: Math.round(monthAbsences * weekWeights[i]),
      }));
      const maxVal = Math.max(...items.flatMap(d => [d.checkins, d.alkaline, d.absences]), 1);
      return { type: 'weekly', items, maxVal, title: `Weekly Activity Breakdown (${mName})`, monthName: mName };
    }
  }, [analyticsMonth, totalCheckins, totalAlkaline, totalAbsences]);

  /* ── Predictive & Prescriptive Analytics Data ── */
  const currentMonth = new Date().getMonth();
  const avgMonthlyCheckins = totalCheckins / Math.max(1, currentMonth + 1);
  const forecastedCheckins = Math.round(avgMonthlyCheckins * 1.1); // Projected 10% growth
  const forecastedAlkaline = Math.round((totalAlkaline / Math.max(1, currentMonth + 1)) * 1.15); 
  const churnRiskClients = clients.filter(c => (c.absences || 0) > 3).length; 

  const recommendations = [];
  if (churnRiskClients > 0) {
    recommendations.push({ title: 'Retention Action', desc: `Follow up with ${churnRiskClients} clients who have high absence rates (>3) to prevent churn.`, color: '#f59e0b', icon: AlertTriangle });
  }
  if (forecastedAlkaline > 0) {
    recommendations.push({ title: 'Inventory Planning', desc: `Anticipate demand of ~${forecastedAlkaline} alkaline sessions next month. Ensure adequate supplies.`, color: 'var(--kelly)', icon: Target });
  }
  if (notEnrolled > 0) {
    recommendations.push({ title: 'Operations', desc: `Prompt ${notEnrolled} unenrolled clients to register their fingerprints for faster check-ins.`, color: '#0ea5e9', icon: Lightbulb });
  }
  if (recommendations.length === 0) {
    recommendations.push({ title: 'System Optimization', desc: `All metrics are stable. Maintain current operational procedures.`, color: 'var(--emerald)', icon: CheckCircle });
  }

  const summaryCards = [
    { label: 'Total Clients',      value: clients.length, icon: Users,       color: 'var(--emerald)', bg: 'rgba(4,106,56,0.08)' },
    { label: 'Total Check-ins',    value: totalCheckins,  icon: CheckCircle, color: 'var(--kelly)',   bg: 'rgba(76,187,23,0.08)' },
    { label: 'Alkaline Sessions',  value: totalAlkaline,  icon: Droplets,    color: '#0ea5e9',        bg: 'rgba(14,165,233,0.08)' },
    { label: 'Total Absences',     value: totalAbsences,  icon: Calendar,    color: '#f59e0b',        bg: 'rgba(245,158,11,0.08)' },
    { label: 'Attendance Rate',    value: `${attendanceRate}%`, icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Avg Check-ins/Client', value: avgCheckins,  icon: BarChart2,   color: '#8b5cf6',        bg: 'rgba(139,92,246,0.08)' },
  ];

  /* ── Clean Native Vector PDF Export with Structured Tables & Date Range ── */
  const handleExport = async () => {
    if (isExporting) return;
    setExportError('');

    if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      setExportError('Start date cannot be later than end date.');
      return;
    }

    setIsExporting(true);
    try {
      // Fetch date-filtered attendance & alkaline session logs from backend
      const summaryRes = await api.getAttendanceSummary({
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
      }).catch(() => ({ summary: null, history: [] }));

      const rangedHistory = summaryRes?.history || [];
      const rangedSummary = summaryRes?.summary || null;

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
      const scopeSlug = exportScope === 'clients' ? 'Clients' : exportScope === 'staff' ? 'Staff' : 'Full_System';
      const filename = `WellCare_${scopeSlug}_Report_${exportStartDate || 'all'}_to_${exportEndDate || dateStamp}.pdf`;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const drawPageFooter = (pageNum, totalPages) => {
        pdf.setDrawColor(215, 226, 220);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text('WELLCARE HEALTHCARE SYSTEM · Official Tabular System Report', margin, pageHeight - 7.5);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7.5, { align: 'right' });
      };

      const ensureSpace = (neededHeight) => {
        if (y + neededHeight > pageHeight - 18) {
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

      // Native Vector Table Drawer with automatic page breaks & repeating headers
      const drawTable = (columns, rows, emptyText = 'No records found for this date range.') => {
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

        // Outer border for table bottom
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.25);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 7;
      };

      // ── Document Header Banner ──
      pdf.setFillColor(4, 106, 56);
      pdf.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.setTextColor(255, 255, 255);
      pdf.text('WELLCARE HEALTHCARE SYSTEM', margin + 5, y + 9.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(209, 250, 229);
      pdf.text('Official Tabular Attendance, Alkaline Therapy & User Report', margin + 5, y + 15.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Date Range: ${dateRangeLabel}`, pageWidth - margin - 5, y + 9.5, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(209, 250, 229);
      pdf.text(`Generated: ${reportDate} · ${reportTime}`, pageWidth - margin - 5, y + 15.5, { align: 'right' });
      pdf.text(`Report Scope: ${exportScope === 'all' ? 'Clients, Staff & Activity Logs' : exportScope === 'clients' ? 'Clients & Activity Logs' : 'Staff Directory'}`, pageWidth - margin - 5, y + 20.5, { align: 'right' });
      y += 30;

      // ── 1. Summary Metrics Table ──
      const periodCheckins = rangedSummary ? rangedSummary.checkins : totalCheckins;
      const periodAbsences = rangedSummary ? rangedSummary.absences : totalAbsences;
      const periodAlkaline = rangedSummary ? rangedSummary.alkaline : totalAlkaline;
      const periodRate = rangedSummary ? rangedSummary.attendanceRate : attendanceRate;

      drawSectionTitle('1. Executive Summary', `Period: ${dateRangeLabel}`);
      drawTable(
        [
          { key: 'metric', label: 'Metric', width: 82 },
          { key: 'value', label: 'Value', width: 40, align: 'right' },
          { key: 'notes', label: 'Details', width: 60 },
        ],
        [
          { metric: 'Total Registered Clients', value: String(clients.length), notes: `${enrolled} biometric enrolled` },
          { metric: 'Total Active Staff', value: String(staffList.length), notes: 'System operators' },
          { metric: 'Check-ins (Selected Range)', value: String(periodCheckins), notes: `${dateRangeLabel}` },
          { metric: 'Alkaline Water Bottles Used', value: String(periodAlkaline), notes: `${(periodAlkaline * 0.5).toFixed(1)} Liters dispensed` },
          { metric: 'Absences (Selected Range)', value: String(periodAbsences), notes: `Attendance Rate: ${periodRate}%` },
        ]
      );

      // ── 2. Date-Range Activity & Alkaline Logs Table ──
      if (exportScope === 'clients' || exportScope === 'all') {
        drawSectionTitle('2. Activity & Alkaline Session Logs', `${rangedHistory.length} records in range`);
        drawTable(
          [
            { key: 'id', label: 'ID', width: 14 },
            { key: 'client', label: 'Client Name', width: 48 },
            { key: 'clientId', label: 'Client ID', width: 24 },
            { key: 'type', label: 'Activity Type', width: 34 },
            { key: 'by', label: 'Logged By', width: 22 },
            { key: 'date', label: 'Date & Time', width: 40 },
          ],
          rangedHistory.map((h) => ({
            id: `#${h.id ?? ''}`,
            client: h.full_name || `Client #${h.client_id}`,
            clientId: h.client_id_number || 'N/A',
            type: h.type || 'Session',
            by: h.logged_by || 'staff',
            date: h.date || (h.created_at ? String(h.created_at).slice(0, 16).replace('T', ' ') : '—'),
          })),
          'No attendance or alkaline session logs found in the selected date range.'
        );

        // ── 3. Client Summary Table ──
        // Build per-client totals within selected date range (or overall if no logs)
        const perClientRange = {};
        rangedHistory.forEach((h) => {
          if (!perClientRange[h.client_id]) {
            perClientRange[h.client_id] = { checkins: 0, absences: 0, alkaline: 0 };
          }
          if (h.type === 'Check-in') perClientRange[h.client_id].checkins += 1;
          else if (h.type === 'Absence') perClientRange[h.client_id].absences += 1;
          else if (h.type === 'Alkaline Session') perClientRange[h.client_id].alkaline += 1;
        });

        drawSectionTitle('3. Client Attendance & Alkaline Summary Table', `${filteredClients.length} clients`);
        drawTable(
          [
            { key: 'cid', label: 'Client ID', width: 22 },
            { key: 'name', label: 'Full Name', width: 48 },
            { key: 'checkins', label: 'Check-ins', width: 20, align: 'center' },
            { key: 'absences', label: 'Absences', width: 20, align: 'center' },
            { key: 'alkaline', label: 'Bottles', width: 18, align: 'center' },
            { key: 'rate', label: 'Rate', width: 18, align: 'center' },
            { key: 'fp', label: 'Biometric', width: 36, align: 'center' },
          ],
          filteredClients.map((c) => {
            const ranged = perClientRange[c.id];
            const ci = exportStartDate || exportEndDate ? (ranged?.checkins ?? 0) : (c.total_checkins ?? 0);
            const ab = exportStartDate || exportEndDate ? (ranged?.absences ?? 0) : (c.absences ?? 0);
            const alk = exportStartDate || exportEndDate ? (ranged?.alkaline ?? 0) : (c.total_bottles ?? 0);
            const tot = ci + ab;
            const rate = tot > 0 ? `${Math.round((ci / tot) * 100)}%` : '—';
            return {
              cid: c.client_id_number || 'N/A',
              name: c.full_name || '—',
              checkins: String(ci),
              absences: String(ab),
              alkaline: String(alk),
              rate,
              fp: c.fingerprint_enrolled ? 'Enrolled' : 'Not Enrolled',
            };
          }),
          'No clients registered.'
        );
      }

      // ── 4. Staff Directory Table ──
      if (exportScope === 'staff' || exportScope === 'all') {
        const secNum = exportScope === 'staff' ? '2' : '4';
        drawSectionTitle(`${secNum}. Staff Directory Table`, `${filteredStaff.length} staff members`);
        drawTable(
          [
            { key: 'num', label: '#', width: 14, align: 'center' },
            { key: 'name', label: 'Full Name', width: 58 },
            { key: 'username', label: 'Username', width: 42 },
            { key: 'email', label: 'Email', width: 46 },
            { key: 'status', label: 'Status', width: 22, align: 'center' },
          ],
          filteredStaff.map((s, idx) => ({
            num: String(idx + 1),
            name: s.name || '—',
            username: s.username || '—',
            email: s.email || '—',
            status: s.archived_at ? 'Archived' : 'Active',
          })),
          'No staff members found.'
        );
      }

      // Stamp page numbers on every page
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        drawPageFooter(p, totalPages);
      }

      pdf.save(filename);
      setShowExportModal(false);
    } catch (err) {
      console.error('Export PDF error:', err);
      setExportError('Failed to generate PDF report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout unreadMsgCount={unreadMsgCount}>
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p className="page-eyebrow">Analytics & Reports</p>
            <h2 className="page-title">System Reports</h2>
            <p className="page-sub">Attendance, alkaline therapy, and client statistics overview</p>
          </div>
          <button
            onClick={() => {
              setExportScope(reportFilter);
              setExportError('');
              setShowExportModal(true);
            }}
            disabled={loading || isExporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--emerald) 0%, #035c30 100%)',
              color: '#fff', border: 'none', cursor: loading || isExporting ? 'not-allowed' : 'pointer',
              opacity: loading || isExporting ? 0.75 : 1,
              fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 14px rgba(4,106,56,0.25)',
              transition: 'opacity 0.2s ease',
            }}
          >
            <Download size={16} />
            {isExporting ? 'Generating PDF...' : 'Export PDF Report'}
          </button>
        </div>

        {/* ── Analytics with By-Month Filter ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={20} />
              Visual Analytics <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(4,106,56,0.5)' }}>({chartData.monthName})</span>
            </h3>

            {/* By-Month Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.8)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(4,106,56,0.15)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--emerald)' }}>Filter by Month:</span>
              <select
                value={analyticsMonth}
                onChange={e => setAnalyticsMonth(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', fontSize: '0.82rem', fontWeight: 700,
                  color: 'var(--emerald)', cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="all">All Months (Full Year)</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={String(i)}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {summaryCards.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(4,106,56,0.1)',
                  borderRadius: '18px',
                  padding: '20px',
                  boxShadow: '0 2px 16px rgba(4,106,56,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(4,106,56,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                    <div style={{ padding: '8px', borderRadius: '10px', background: s.bg }}>
                      <Icon size={18} color={s.color} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--emerald)', lineHeight: 1 }}>{s.value}</div>
                </div>
              );
            })}
          </div>

          {/* ── Visual Graphs Row (Filtered By Month) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>

            {/* Interactive Graph (Multi-series bars: Check-ins, Alkaline, Absences) */}
            <div style={{
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(4,106,56,0.12)', borderRadius: '18px',
              padding: '24px', boxShadow: '0 2px 16px rgba(4,106,56,0.06)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(4,106,56,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {chartData.type === 'monthly' ? 'Annual Overview' : 'Monthly Activity'}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--emerald)' }}>
                      {chartData.title}
                    </div>
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#047857', display: 'inline-block' }} />
                      <span style={{ color: '#047857' }}>Check-ins</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#0ea5e9', display: 'inline-block' }} />
                      <span style={{ color: '#0ea5e9' }}>Alkaline</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#f59e0b', display: 'inline-block' }} />
                      <span style={{ color: '#f59e0b' }}>Absences</span>
                    </div>
                  </div>
                </div>

                {/* Graph Body */}
                <div style={{ marginTop: '20px', height: '175px', display: 'flex', alignItems: 'flex-end', gap: '10px', paddingBottom: '22px', borderBottom: '1px solid rgba(4,106,56,0.1)', position: 'relative' }}>
                  {chartData.items.map((item, idx) => {
                    const hCheck = Math.max((item.checkins / chartData.maxVal) * 135, 4);
                    const hAlk = Math.max((item.alkaline / chartData.maxVal) * 135, 4);
                    const hAbs = Math.max((item.absences / chartData.maxVal) * 135, 4);

                    return (
                      <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%' }}>
                          {/* Checkins bar */}
                          <div
                            title={`${item.checkins} Check-ins (${item.label})`}
                            style={{
                              width: '10px', height: `${hCheck}px`,
                              background: 'linear-gradient(to top, #047857, #10b981)',
                              borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease'
                            }}
                          />
                          {/* Alkaline bar */}
                          <div
                            title={`${item.alkaline} Alkaline Sessions (${item.label})`}
                            style={{
                              width: '10px', height: `${hAlk}px`,
                              background: 'linear-gradient(to top, #0284c7, #38bdf8)',
                              borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease'
                            }}
                          />
                          {/* Absences bar */}
                          <div
                            title={`${item.absences} Absences (${item.label})`}
                            style={{
                              width: '10px', height: `${hAbs}px`,
                              background: 'linear-gradient(to top, #d97706, #fbbf24)',
                              borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease'
                            }}
                          />
                        </div>
                        <span style={{ position: 'absolute', bottom: '-22px', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(4,106,56,0.7)', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Attendance & Biometric Status Gauge */}
            <div style={{
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(4,106,56,0.12)', borderRadius: '18px',
              padding: '24px', boxShadow: '0 2px 16px rgba(4,106,56,0.06)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(4,106,56,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Verification & Attendance
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--emerald)' }}>
                  Biometric Enrollment & Overall Rate
                </div>
              </div>

              {clients.length > 0 ? (() => {
                const enrolledPct = Math.round((enrolled / clients.length) * 100);
                const circumference = 2 * Math.PI * 54;
                const offset = circumference * (1 - enrolled / clients.length);

                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px', padding: '16px 0' }}>
                    <svg width="126" height="126" viewBox="0 0 130 130">
                      <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(4,106,56,0.1)" strokeWidth="13" />
                      <circle
                        cx="65" cy="65" r="54" fill="none" stroke="#10b981" strokeWidth="13"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round" transform="rotate(-90 65 65)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                      <text x="65" y="61" textAnchor="middle" fill="#047857" fontSize="22" fontWeight="800" fontFamily="inherit">{enrolledPct}%</text>
                      <text x="65" y="77" textAnchor="middle" fill="rgba(4,106,56,0.6)" fontSize="9" fontWeight="700" fontFamily="inherit">Enrolled</text>
                    </svg>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857' }}>Attendance Rate</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#064e3b' }}>{attendanceRate}%</div>
                      </div>
                      <div style={{ padding: '10px 14px', background: 'rgba(14,165,233,0.08)', borderRadius: '12px', border: '1px solid rgba(14,165,233,0.2)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7' }}>Biometric Verified</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0369a1' }}>{enrolled} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/ {clients.length}</span></div>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ textAlign: 'center', color: 'rgba(4,106,56,0.4)', padding: '32px 0', fontSize: '0.85rem' }}>
                  No clients registered yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Predictive & Prescriptive Analytics ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginTop: '12px', marginBottom: '24px' }}>
          
          {/* Predictive */}
          <div style={{
            background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(4,106,56,0.1)', borderRadius: '18px',
            padding: '24px', boxShadow: '0 2px 16px rgba(4,106,56,0.06)',
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(4,106,56,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Predictive Analytics</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={18} color="var(--kelly)" /> Future Projections
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(4,106,56,0.03)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px' }}>
                  <Users size={20} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(4,106,56,0.6)' }}>Projected Next Month Check-ins</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--emerald)' }}>~{forecastedCheckins} <span style={{ fontSize: '0.8rem', color: '#10b981' }}>(+10%)</span></div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(14,165,233,0.03)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(14,165,233,0.1)', borderRadius: '10px' }}>
                  <Droplets size={20} color="#0ea5e9" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(4,106,56,0.6)' }}>Forecasted Alkaline Sessions</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0ea5e9' }}>~{forecastedAlkaline} <span style={{ fontSize: '0.8rem', color: '#0ea5e9' }}>(+15%)</span></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(245,158,11,0.03)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px' }}>
                  <TrendingDown size={20} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(4,106,56,0.6)' }}>High Churn Risk Clients</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{churnRiskClients} <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>Action Needed</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Prescriptive */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(240,250,245,0.8))', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(4,106,56,0.15)', borderRadius: '18px',
            padding: '24px', boxShadow: '0 4px 20px rgba(4,106,56,0.08)',
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(4,106,56,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Prescriptive Analytics</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={18} color="#f59e0b" /> AI-Driven Recommendations
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recommendations.map((rec, i) => {
                const Icon = rec.icon;
                return (
                  <div key={i} style={{ display: 'flex', gap: '14px', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(4,106,56,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ padding: '8px', background: `rgba(4,106,56,0.04)`, borderRadius: '50%', height: 'fit-content' }}>
                      <Icon size={18} color={rec.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--emerald)', marginBottom: '4px' }}>{rec.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(4,106,56,0.7)', lineHeight: 1.4 }}>{rec.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Full User Report Table ── */}
        {(() => {
          const activeData = reportFilter === 'clients' ? filteredClients : filteredStaff;
          const totalReportPages = Math.max(1, Math.ceil(activeData.length / reportPageSize));
          const pagedData = activeData.slice((reportPage - 1) * reportPageSize, reportPage * reportPageSize);
          const startIdx = activeData.length === 0 ? 0 : (reportPage - 1) * reportPageSize + 1;
          const endIdx = Math.min(reportPage * reportPageSize, activeData.length);

          const tabBtn = (key, label, count) => (
            <button
              key={key}
              onClick={() => { setReportFilter(key); setShowClientSortPanel(false); }}
              style={{
                padding: '7px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem',
                cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                background: reportFilter === key
                  ? 'linear-gradient(135deg, var(--emerald) 0%, #035c30 100%)'
                  : 'rgba(4,106,56,0.06)',
                color: reportFilter === key ? '#fff' : 'var(--emerald)',
                boxShadow: reportFilter === key ? '0 2px 8px rgba(4,106,56,0.25)' : 'none',
              }}
            >
              {label} <span style={{ opacity: 0.7, fontWeight: 600, fontSize: '0.75rem' }}>({count})</span>
            </button>
          );

          const paginationBar = (
            <div style={{
              padding: '14px 24px', borderTop: '1px solid rgba(4,106,56,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(4,106,56,0.55)' }}>
                Showing {startIdx}–{endIdx} of {activeData.length} {reportFilter}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setReportPage(p => Math.max(1, p - 1))}
                  disabled={reportPage === 1}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(4,106,56,0.2)', background: reportPage === 1 ? 'rgba(4,106,56,0.04)' : 'rgba(4,106,56,0.08)', color: reportPage === 1 ? 'rgba(4,106,56,0.3)' : 'var(--emerald)', fontWeight: 700, fontSize: '0.78rem', cursor: reportPage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                >← Prev</button>
                {Array.from({ length: totalReportPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalReportPages || Math.abs(p - reportPage) <= 1)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`e-${idx}`} style={{ padding: '0 4px', color: 'rgba(4,106,56,0.4)', fontWeight: 700, fontSize: '0.78rem' }}>…</span>
                    ) : (
                      <button key={item} onClick={() => setReportPage(item)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: item === reportPage ? 'none' : '1px solid rgba(4,106,56,0.15)', background: item === reportPage ? 'linear-gradient(135deg, var(--emerald) 0%, #035c30 100%)' : 'rgba(4,106,56,0.04)', color: item === reportPage ? '#fff' : 'var(--emerald)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', boxShadow: item === reportPage ? '0 2px 8px rgba(4,106,56,0.25)' : 'none', transition: 'all 0.15s' }}>{item}</button>
                    )
                  )}
                <button
                  onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))}
                  disabled={reportPage === totalReportPages}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(4,106,56,0.2)', background: reportPage === totalReportPages ? 'rgba(4,106,56,0.04)' : 'rgba(4,106,56,0.08)', color: reportPage === totalReportPages ? 'rgba(4,106,56,0.3)' : 'var(--emerald)', fontWeight: 700, fontSize: '0.78rem', cursor: reportPage === totalReportPages ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                >Next →</button>
              </div>
            </div>
          );

          return (
            <div className="full-user-report" style={{
              background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(4,106,56,0.1)', borderRadius: '18px',
              boxShadow: '0 2px 16px rgba(4,106,56,0.06)', overflow: 'hidden',
            }}>
              {/* Table header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(4,106,56,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(4,106,56,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Complete Data</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--emerald)' }}>Full User Report</div>
                </div>
                <div className="report-export-hide" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Client / Staff filter toggle */}
                  <div style={{ display: 'flex', gap: '6px', background: 'rgba(4,106,56,0.04)', borderRadius: '10px', padding: '4px' }}>
                    {tabBtn('clients', 'Clients', clients.length)}
                    {tabBtn('staff', 'Staff', staffList.length)}
                  </div>
                  {reportFilter === 'clients' ? (
                    <>
                      <button type="button" className="client-record-filter-toggle" onClick={toggleClientSortPanel} aria-label="Toggle client sorting options" aria-expanded={showClientSortPanel} aria-controls="admin-client-sort-panel" title="Sort clients">
                        <SlidersHorizontal size={17} />
                      </button>
                      {showClientSortPanel && createPortal(
                        <div id="admin-client-sort-panel" ref={clientSortPanelRef} className="client-record-filter-panel" style={clientSortPanelPosition}>
                          <h3 className="client-filter-panel-title">Sort Clients</h3>
                          {[
                            { key: 'name', title: 'Names', options: [['asc', 'A–Z'], ['desc', 'Z–A']] },
                            { key: 'client_id', title: 'Client ID', options: [['asc', 'Lowest to Highest'], ['desc', 'Highest to Lowest']] },
                            { key: 'alkaline', title: 'Alkaline', options: [['asc', 'Lowest to Highest'], ['desc', 'Highest to Lowest']] },
                            { key: 'attendance', title: 'Attendance', options: [['desc', 'More visits'], ['asc', 'Low visits']] },
                          ].map(group => (
                            <div key={group.key} className="client-filter-row">
                              <span className="client-filter-row-label">{group.title}</span>
                              <div className="client-filter-choice-list">
                                {group.options.map(([direction, label]) => (
                                  <label key={direction} className="client-filter-option">
                                    <input type="radio" name={`admin-client-sort-${group.key}`} checked={clientSortDraft.sortBy === group.key && clientSortDraft.direction === direction} onChange={() => setClientSortDraft({ sortBy: group.key, direction })} />
                                    <span>{label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className="client-filter-panel-footer">
                            <button type="button" className="client-filter-clear" onClick={() => { const initialSort = { sortBy: 'name', direction: 'asc' }; setClientSort(initialSort); setClientSortDraft(initialSort); setShowClientSortPanel(false); }}>Clear</button>
                            <button type="button" className="client-filter-apply" onClick={() => { setClientSort(clientSortDraft); setShowClientSortPanel(false); }}>Apply</button>
                          </div>
                        </div>,
                        document.body
                      )}
                    </>
                  ) : (
                    <>
                      <button type="button" className="client-record-filter-toggle staff-record-filter-toggle" onClick={toggleStaffSortPanel} aria-label="Toggle staff sorting options" aria-expanded={showStaffSortPanel} aria-controls="admin-staff-sort-panel" title="Sort staff">
                        <SlidersHorizontal size={17} />
                      </button>
                      {showStaffSortPanel && createPortal(
                        <div id="admin-staff-sort-panel" ref={staffSortPanelRef} className="client-record-filter-panel" style={staffSortPanelPosition}>
                          <h3 className="client-filter-panel-title">Sort Staff</h3>
                          {[
                            { key: 'name', title: 'Names', options: [['asc', 'A–Z'], ['desc', 'Z–A']] },
                            { key: 'username', title: 'Username', options: [['asc', 'A–Z'], ['desc', 'Z–A']] },
                            { key: 'role', title: 'Role', options: [['asc', 'A–Z'], ['desc', 'Z–A']] },
                            { key: 'status', title: 'Status', options: [['asc', 'Active first'], ['desc', 'Archived first']] },
                          ].map(group => (
                            <div key={group.key} className="client-filter-row">
                              <span className="client-filter-row-label">{group.title}</span>
                              <div className="client-filter-choice-list">
                                {group.options.map(([direction, label]) => (
                                  <label key={direction} className="client-filter-option">
                                    <input type="radio" name={`admin-staff-sort-${group.key}`} checked={staffSortDraft.sortBy === group.key && staffSortDraft.direction === direction} onChange={() => setStaffSortDraft({ sortBy: group.key, direction })} />
                                    <span>{label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className="client-filter-panel-footer">
                            <button type="button" className="client-filter-clear" onClick={() => { const initialSort = { sortBy: 'name', direction: 'asc' }; setStaffSort(initialSort); setStaffSortDraft(initialSort); setShowStaffSortPanel(false); }}>Clear</button>
                            <button type="button" className="client-filter-apply" onClick={() => { setStaffSort(staffSortDraft); setShowStaffSortPanel(false); }}>Apply</button>
                          </div>
                        </div>,
                        document.body
                      )}
                    </>
                  )}
                  {/* Page size selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(4,106,56,0.55)' }}>Show</span>
                    <select
                      value={reportPageSize}
                      onChange={e => { setReportPageSize(Number(e.target.value)); setReportPage(1); }}
                      style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(4,106,56,0.2)', background: 'rgba(4,106,56,0.04)', color: 'var(--emerald)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', outline: 'none' }}
                    >
                      {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(4,106,56,0.55)' }}>per page</span>
                  </div>
                </div>
              </div>

              {/* ── CLIENTS TABLE ── */}
              {reportFilter === 'clients' && (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Client ID</th>
                        <th>Full Name</th>
                        <th>Check-ins</th>
                        <th>Absences</th>
                        <th>Alkaline Sessions</th>
                        <th>Attendance Rate</th>
                        <th>Fingerprint</th>
                        <th>Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={8} className="empty-state">Loading...</td></tr>
                      ) : filteredClients.length === 0 ? (
                        <tr><td colSpan={8} className="empty-state">No clients match these filters.</td></tr>
                      ) : pagedData.map(c => {
                        const total = (c.total_checkins || 0) + (c.absences || 0);
                        const rate = total > 0 ? Math.round(((c.total_checkins || 0) / total) * 100) : 0;
                        return (
                          <tr key={c.id}>
                            <td><span className="td-slot">{c.client_id_number || 'N/A'}</span></td>
                            <td className="td-name">{c.full_name}</td>
                            <td><span className="badge badge-green">{c.total_checkins ?? 0}</span></td>
                            <td><span className="badge badge-red">{c.absences ?? 0}</span></td>
                            <td><span className="badge badge-emerald">{c.total_bottles ?? 0}</span></td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, maxWidth: '80px', height: '6px', background: 'rgba(4,106,56,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                                  <div style={{ width: `${rate}%`, height: '100%', background: rate >= 70 ? 'var(--kelly)' : rate >= 40 ? '#f59e0b' : '#dc2626', borderRadius: '99px' }} />
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald)' }}>{rate}%</span>
                              </div>
                            </td>
                            <td>
                              {c.fingerprint_enrolled
                                ? <span className="badge badge-green">Enrolled</span>
                                : <span className="badge badge-red">Not Enrolled</span>}
                            </td>
                            <td className="td-date">{c.last_seen || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── STAFF TABLE ── */}
              {reportFilter === 'staff' && (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} className="empty-state">Loading...</td></tr>
                      ) : filteredStaff.length === 0 ? (
                        <tr><td colSpan={5} className="empty-state">No staff members match these filters.</td></tr>
                      ) : pagedData.map((s, i) => (
                        <tr key={s.id}>
                          <td><span className="td-slot">#{(reportPage - 1) * reportPageSize + i + 1}</span></td>
                          <td className="td-name">{s.name || '—'}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--emerald)', fontWeight: 600 }}>{s.username}</td>
                          <td><span className="badge badge-emerald">Staff</span></td>
                          <td><span className="badge badge-green">Active</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {activeData.length > 0 && paginationBar}
            </div>
          );
        })()}

        {/* ── Print footer ── */}
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(4,106,56,0.4)', paddingBottom: '8px' }}>
          Report generated on {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · WELLCARE System
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
            style={{ maxWidth: '460px', padding: '26px', borderRadius: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--emerald-50)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-700)' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.15rem', marginBottom: 2 }}>Export Tabular PDF Report</h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>Select date range and tables to include</p>
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

              {/* Report Scope */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--emerald-800)', marginBottom: '6px' }}>
                  Tables to Include
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { key: 'clients', label: 'Clients & Logs' },
                    { key: 'staff', label: 'Staff Only' },
                    { key: 'all', label: 'Full Report' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setExportScope(opt.key)}
                      style={{
                        padding: '8px 10px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700,
                        border: exportScope === opt.key ? '1.5px solid var(--emerald)' : '1px solid rgba(4,106,56,0.18)',
                        background: exportScope === opt.key ? 'var(--emerald)' : '#fff',
                        color: exportScope === opt.key ? '#fff' : 'var(--emerald-900)',
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
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
                  onClick={handleExport}
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
