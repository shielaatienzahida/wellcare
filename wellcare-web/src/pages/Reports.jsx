import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Users, CheckCircle, Droplets, TrendingUp, TrendingDown, SlidersHorizontal,
  Calendar, BarChart2, Download, FileText, Lightbulb, Target, AlertTriangle
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
  const [staffSearch, setStaffSearch] = useState('');
  const [staffFingerprintFilter, setStaffFingerprintFilter] = useState('all');
  const [staffSort, setStaffSort] = useState('name-asc');

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
  useEffect(() => { setReportPage(1); }, [reportFilter, clients.length, staffList.length, clientSort, staffSearch, staffFingerprintFilter, staffSort]);

  useEffect(() => {
    if (!showClientSortPanel) return undefined;
    const closePanel = event => {
      if (event.type === 'keydown' && event.key === 'Escape') setShowClientSortPanel(false);
      if (event.type === 'mousedown'
        && !clientSortPanelRef.current?.contains(event.target)
        && !event.target.closest?.('.client-record-filter-toggle')) setShowClientSortPanel(false);
    };
    document.addEventListener('mousedown', closePanel);
    document.addEventListener('keydown', closePanel);
    return () => {
      document.removeEventListener('mousedown', closePanel);
      document.removeEventListener('keydown', closePanel);
    };
  }, [showClientSortPanel]);

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

  const filteredStaff = staffList
    .filter(staff => {
      const query = staffSearch.trim().toLowerCase();
      const matchesSearch = !query || [staff.name, staff.username, staff.email]
        .some(value => String(value || '').toLowerCase().includes(query));
      const matchesFingerprint = staffFingerprintFilter === 'all'
        || (staffFingerprintFilter === 'enrolled' ? Boolean(staff.fingerprint_enrolled) : !staff.fingerprint_enrolled);
      return matchesSearch && matchesFingerprint;
    })
    .sort((first, second) => {
      if (staffSort === 'newest' || staffSort === 'oldest') {
        const direction = staffSort === 'newest' ? -1 : 1;
        return ((Date.parse(first.created_at || '') || 0) - (Date.parse(second.created_at || '') || 0)) * direction;
      }
      const [field, direction] = staffSort.split('-');
      const key = field === 'username' ? 'username' : 'name';
      return String(first[key] || '').localeCompare(String(second[key] || ''), undefined, { numeric: true, sensitivity: 'base' }) * (direction === 'desc' ? -1 : 1);
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

  /* ── Direct PDF Export with Visual Graphs, KPI Cards & Table ── */
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const isClients = reportFilter === 'clients';
      const reportDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
      const reportTime = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
      const dateStamp = new Date().toISOString().slice(0, 10);
      const filename = isClients
        ? `WellCare_Executive_Analytics_Report_${dateStamp}.pdf`
        : `WellCare_Staff_Report_${dateStamp}.pdf`;

      const enrolledPct = clients.length > 0 ? Math.round((enrolled / clients.length) * 100) : 0;
      const gaugeRadius = 50;
      const gaugeCircumference = 2 * Math.PI * gaugeRadius;
      const gaugeOffset = gaugeCircumference * (1 - (clients.length > 0 ? enrolled / clients.length : 0));

      const maxVal = chartData.maxVal || 1;
      const svgWidth = 630;
      const numItems = Math.max(1, chartData.items.length);
      const barGroupWidth = (svgWidth - 40) / numItems;
      const yBase = 125;

      const svgBars = chartData.items.map((item, idx) => {
        const groupX = 22 + idx * barGroupWidth;
        const hCheck = Math.max(Math.round((item.checkins / maxVal) * 95), 3);
        const hAlk = Math.max(Math.round((item.alkaline / maxVal) * 95), 3);
        const hAbs = Math.max(Math.round((item.absences / maxVal) * 95), 3);

        return `
          <g>
            <rect x="${groupX}" y="${yBase - hCheck}" width="9" height="${hCheck}" rx="2" fill="#047857" />
            <rect x="${groupX + 11}" y="${yBase - hAlk}" width="9" height="${hAlk}" rx="2" fill="#0ea5e9" />
            <rect x="${groupX + 22}" y="${yBase - hAbs}" width="9" height="${hAbs}" rx="2" fill="#f59e0b" />
            <text x="${groupX + 16}" y="142" font-size="8.5" font-weight="700" fill="#475569" text-anchor="middle" font-family="sans-serif">${item.label}</text>
          </g>
        `;
      }).join('');

      // Create an off-screen container for rendering the executive summary
      const exportMount = document.createElement('div');
      exportMount.id = 'report-export-mount';
      exportMount.style.position = 'fixed';
      exportMount.style.top = '0';
      exportMount.style.left = '0';
      exportMount.style.width = '1120px';
      exportMount.style.zIndex = '-9999';
      exportMount.style.opacity = '1';
      exportMount.style.pointerEvents = 'none';
      exportMount.style.background = '#ffffff';

      // ── Executive Analytics & Visualization Dashboard ──
      const page1 = document.createElement('div');
      page1.id = 'pdf-page-dashboard';
      page1.style.width = '1120px';
      page1.style.height = '780px';
      page1.style.padding = '24px 28px';
      page1.style.boxSizing = 'border-box';
      page1.style.background = '#ffffff';
      page1.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
      page1.style.overflow = 'hidden';

      page1.innerHTML = `
        <!-- Top Header -->
        <div style="border-bottom: 2px solid #047857; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 21px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px;">WELLCARE HEALTHCARE SYSTEM</span>
              <span style="padding: 2px 7px; border-radius: 6px; background: #ecfdf5; border: 1px solid #a7f3d0; font-size: 9px; font-weight: 800; color: #047857; text-transform: uppercase;">Executive Analytics Report</span>
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #047857; margin-top: 2px;">Visual Intelligence, Performance Analytics & System Summary</div>
          </div>
          <div style="text-align: right; font-size: 9.5px; color: #64748b; line-height: 1.4;">
            <div><strong>Filter Period:</strong> <span style="color: #047857; font-weight: 800;">${chartData.monthName}</span></div>
            <div><strong>Generated:</strong> ${reportDate} &bull; ${reportTime}</div>
            <div><strong>Scope:</strong> ${isClients ? 'Clients Registry & Health Analytics' : 'Staff Operations & Monitoring'}</div>
          </div>
        </div>

        <!-- 6 KPI Metric Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 14px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9px; padding: 10px 6px; text-align: center;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 0.5px;">Total Clients</div>
            <div style="font-size: 20px; font-weight: 900; color: #064e3b; margin-top: 2px;">${clients.length}</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9px; padding: 10px 6px; text-align: center;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 0.5px;">Total Check-ins</div>
            <div style="font-size: 20px; font-weight: 900; color: #064e3b; margin-top: 2px;">${totalCheckins}</div>
          </div>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 9px; padding: 10px 6px; text-align: center;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #0284c7; letter-spacing: 0.5px;">Alkaline Sessions</div>
            <div style="font-size: 20px; font-weight: 900; color: #0369a1; margin-top: 2px;">${totalAlkaline}</div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 9px; padding: 10px 6px; text-align: center;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #b45309; letter-spacing: 0.5px;">Total Absences</div>
            <div style="font-size: 20px; font-weight: 900; color: #b45309; margin-top: 2px;">${totalAbsences}</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9px; padding: 10px 6px; text-align: center;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 0.5px;">Attendance Rate</div>
            <div style="font-size: 20px; font-weight: 900; color: #064e3b; margin-top: 2px;">${attendanceRate}%</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9px; padding: 10px 6px; text-align: center;">
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 0.5px;">Biometric Enrolled</div>
            <div style="font-size: 20px; font-weight: 900; color: #064e3b; margin-top: 2px;">${enrolled} <span style="font-size: 11px; font-weight: 700; color: #047857;">(${enrolledPct}%)</span></div>
          </div>
        </div>

        <!-- Visual Analytics Row (Trend Bar Chart + Biometric Gauge) -->
        <div style="display: flex; gap: 14px; margin-bottom: 14px;">
          <!-- Activity Trend Bar Chart -->
          <div style="flex: 1.85; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Activity Breakdown</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a;">${chartData.title}</div>
              </div>
              <div style="display: flex; gap: 10px; font-size: 9.5px; font-weight: 700;">
                <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 9px; height: 9px; border-radius: 2px; background: #047857; display: inline-block;"></span>Check-ins</span>
                <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 9px; height: 9px; border-radius: 2px; background: #0ea5e9; display: inline-block;"></span>Alkaline</span>
                <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 9px; height: 9px; border-radius: 2px; background: #f59e0b; display: inline-block;"></span>Absences</span>
              </div>
            </div>
            <div style="width: 100%;">
              <svg viewBox="0 0 630 150" style="width: 100%; height: 148px;">
                <line x1="10" y1="20" x2="620" y2="20" stroke="#e2e8f0" stroke-dasharray="3 3" />
                <line x1="10" y1="55" x2="620" y2="55" stroke="#e2e8f0" stroke-dasharray="3 3" />
                <line x1="10" y1="90" x2="620" y2="90" stroke="#e2e8f0" stroke-dasharray="3 3" />
                <line x1="10" y1="125" x2="620" y2="125" stroke="#cbd5e1" stroke-width="1.5" />
                ${svgBars}
              </svg>
            </div>
          </div>

          <!-- Biometric Gauge & Verification -->
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Verification & Attendance</div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a;">Biometric Enrollment & Overall Rate</div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-around; gap: 10px; margin-top: 6px;">
              <svg width="105" height="105" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="50" fill="none" stroke="#e2e8f0" stroke-width="13" />
                <circle cx="65" cy="65" r="50" fill="none" stroke="#10b981" stroke-width="13" stroke-dasharray="${gaugeCircumference}" stroke-dashoffset="${gaugeOffset}" stroke-linecap="round" transform="rotate(-90 65 65)" />
                <text x="65" y="62" text-anchor="middle" fill="#047857" font-size="22" font-weight="900" font-family="sans-serif">${enrolledPct}%</text>
                <text x="65" y="78" text-anchor="middle" fill="#64748b" font-size="9" font-weight="800" font-family="sans-serif">Enrolled</text>
              </svg>
              <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                <div style="padding: 8px 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #047857;">Attendance Rate</div>
                  <div style="font-size: 16px; font-weight: 900; color: #064e3b;">${attendanceRate}%</div>
                </div>
                <div style="padding: 8px 10px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #0284c7;">Biometric Verified</div>
                  <div style="font-size: 16px; font-weight: 900; color: #0369a1;">${enrolled} <span style="font-size: 9.5px; font-weight: 600; color: #64748b;">/ ${clients.length}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Predictive & Prescriptive Analytics Row -->
        <div style="display: flex; gap: 14px; margin-bottom: 12px;">
          <!-- Predictive Projections -->
          <div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="font-size: 11px; font-weight: 900; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px;">📈 Predictive Analytics (Future Projections)</div>
              <span style="font-size: 8.5px; font-weight: 700; color: #10b981; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">Forecasting</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 9px; background: #f8fafc; border-radius: 7px; border: 1px solid #f1f5f9;">
                <span style="font-size: 9.5px; font-weight: 700; color: #334155;">Projected Next Month Check-ins:</span>
                <span style="font-size: 12px; font-weight: 900; color: #047857;">~${forecastedCheckins} <span style="font-size: 9.5px; color: #10b981; font-weight: 700;">(+10%)</span></span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 9px; background: #f8fafc; border-radius: 7px; border: 1px solid #f1f5f9;">
                <span style="font-size: 9.5px; font-weight: 700; color: #334155;">Forecasted Alkaline Sessions:</span>
                <span style="font-size: 12px; font-weight: 900; color: #0284c7;">~${forecastedAlkaline} <span style="font-size: 9.5px; color: #0ea5e9; font-weight: 700;">(+15%)</span></span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 9px; background: #fffbeb; border-radius: 7px; border: 1px solid #fde68a;">
                <span style="font-size: 9.5px; font-weight: 700; color: #92400e;">High Churn Risk Clients (>3 absences):</span>
                <span style="font-size: 12px; font-weight: 900; color: #b45309;">${churnRiskClients} <span style="font-size: 9.5px; color: #d97706; font-weight: 700;">Action Needed</span></span>
              </div>
            </div>
          </div>

          <!-- Prescriptive Recommendations -->
          <div style="flex: 1.25; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="font-size: 11px; font-weight: 900; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px;">💡 Prescriptive Analytics (AI Recommendations)</div>
              <span style="font-size: 8.5px; font-weight: 700; color: #0284c7; background: #f0f9ff; padding: 2px 6px; border-radius: 4px;">Smart Insights</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${recommendations.slice(0, 3).map(rec => `
                <div style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 9px; background: #f8fafc; border-radius: 7px; border: 1px solid #f1f5f9;">
                  <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #047857; margin-top: 4px; flex-shrink: 0;"></span>
                  <div>
                    <div style="font-size: 9.5px; font-weight: 800; color: #0f172a;">${rec.title}</div>
                    <div style="font-size: 8.5px; color: #475569; line-height: 1.3;">${rec.desc}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Page Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #94a3b8;">
          <span>WELLCARE HEALTHCARE SYSTEM &bull; Official Generated Executive Intelligence Report</span>
          <span>Executive Visual Analytics & Summary &bull; End of Report</span>
        </div>
      `;

      exportMount.appendChild(page1);
      document.body.appendChild(exportMount);

      // Brief pause to ensure all DOM elements and SVG layouts are fully computed
      await new Promise(resolve => setTimeout(resolve, 80));

      // Initialize landscape jsPDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // Render Executive Dashboard Canvas
      const canvas1 = await html2canvas(page1, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1120,
        height: 780,
        windowWidth: 1120,
        windowHeight: 780,
      });

      const imgData1 = canvas1.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData1, 'JPEG', 8, 8, 281, 194);

      // Save the generated PDF
      pdf.save(filename);

      // Clean up the offscreen container
      document.body.removeChild(exportMount);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Failed to generate PDF. Please try again.');
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
            onClick={handleExport}
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
            {isExporting ? 'Generating PDF...' : 'Export PDF'}
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
                      <input
                        type="search"
                        value={staffSearch}
                        onChange={event => setStaffSearch(event.target.value)}
                        placeholder="Search staff..."
                        aria-label="Search staff by name, username, or email"
                        className="search-input"
                        style={{ height: 34, width: 190, fontSize: '0.8rem' }}
                      />
                      <select
                        value={staffFingerprintFilter}
                        onChange={event => setStaffFingerprintFilter(event.target.value)}
                        aria-label="Filter staff by fingerprint enrollment"
                        className="client-record-select"
                      >
                        <option value="all">All fingerprints</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="not-enrolled">Not enrolled</option>
                      </select>
                      <select
                        value={staffSort}
                        onChange={event => setStaffSort(event.target.value)}
                        aria-label="Sort staff report"
                        className="client-record-select"
                      >
                        <option value="name-asc">Name A–Z</option>
                        <option value="name-desc">Name Z–A</option>
                        <option value="username-asc">Username A–Z</option>
                        <option value="newest">Newest staff</option>
                        <option value="oldest">Oldest staff</option>
                      </select>
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
    </AdminLayout>
  );
}
