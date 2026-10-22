import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, Users, Mail, Phone, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';

export default function ClientArchive() {
  const navigate = useNavigate();
  const [archivedStaff, setArchivedStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffSearch, setStaffSearch] = useState('');
  const [restoringId, setRestoringId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadArchivedStaff = async () => {
    if (!localStorage.getItem('heiwa_session_admin')) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await api.getArchivedStaff();
      setArchivedStaff(res.staff || []);
    } catch (err) {
      console.error('Failed to load archived staff', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchivedStaff();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRestoreStaff = async (staff) => {
    setRestoringId(staff.id);
    try {
      await api.restoreStaff(staff.id);
      showToast(`${staff.name || 'Staff member'} has been successfully restored!`, 'success');
      await loadArchivedStaff();
    } catch (err) {
      showToast('Failed to restore staff: ' + (err.message || 'Server error'), 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const filteredStaff = archivedStaff.filter((staff) => {
    const q = staffSearch.trim().toLowerCase();
    return (
      (staff.name || '').toLowerCase().includes(q) ||
      (staff.username || '').toLowerCase().includes(q) ||
      (staff.email || '').toLowerCase().includes(q) ||
      (staff.contact_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
        
        {/* ── Toast Notification ── */}
        {toast && (
          <div className="fixed top-20 right-6 z-50 animate-slide-up">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900'
                  : 'bg-red-50/95 border-red-300 text-red-900'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="text-red-600" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black tracking-widest uppercase text-emerald-800">
              Staff Management
            </span>
            <h1 className="text-3xl font-extrabold text-wellcare-deep tracking-tight mt-1">
              Staff Archive
            </h1>
            <p className="text-wellcare-dark/70 text-sm mt-1">
              Archived staff members are kept here and can be restored back to active service anytime.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/70 backdrop-blur-md border border-white/60 shadow-glass px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-wellcare-dark/60">Archived Staff</div>
                <div className="text-lg font-extrabold text-wellcare-deep leading-tight">
                  {archivedStaff.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl p-5 sm:p-6 space-y-4">
          
          {/* Search bar & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-800/60 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by name, username, or contact..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
              />
            </div>

            <div className="text-xs font-semibold text-wellcare-dark/60">
              Showing <span className="text-emerald-800 font-bold">{filteredStaff.length}</span> of {archivedStaff.length} archived member{archivedStaff.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-emerald-900/10 bg-white/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-900/[0.04] text-wellcare-deep border-b border-emerald-900/10 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Contact & Email</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Archived Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/5 font-medium text-wellcare-deep">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-wellcare-dark/60 font-semibold">
                      Loading archived staff...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100/60 text-emerald-800 flex items-center justify-center">
                          <Users size={24} />
                        </div>
                        <p className="text-sm font-bold text-wellcare-deep">No archived staff found</p>
                        <p className="text-xs text-wellcare-dark/60 max-w-sm">
                          {staffSearch
                            ? 'No staff members match your search criteria.'
                            : 'All staff members are currently active in the system.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-emerald-50/50 transition-colors">
                      {/* Name & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-bold flex items-center justify-center shadow-sm text-xs">
                            {(staff.name || 'S')
                              .split(' ')
                              .map((p) => p[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-wellcare-deep text-sm">{staff.name}</div>
                            <div className="text-[11px] text-emerald-800 font-semibold">
                              @{staff.username || 'staff'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Email */}
                      <td className="py-3.5 px-4 text-xs text-wellcare-dark/80">
                        <div className="flex flex-col gap-0.5">
                          {staff.email ? (
                            <span className="flex items-center gap-1.5 text-wellcare-deep">
                              <Mail size={12} className="text-emerald-700 shrink-0" />
                              <span>{staff.email}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">No email registered</span>
                          )}
                          {staff.contact_number && (
                            <span className="flex items-center gap-1.5 text-wellcare-dark/70">
                              <Phone size={12} className="text-emerald-700 shrink-0" />
                              <span>{staff.contact_number}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3.5 px-4 text-xs capitalize text-wellcare-dark/80">
                        {staff.gender || '—'}
                      </td>

                      {/* Archived Date */}
                      <td className="py-3.5 px-4 text-xs text-wellcare-dark/70 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-emerald-700 shrink-0" />
                          <span>
                            {staff.archived_at
                              ? new Date(staff.archived_at).toLocaleDateString('en-PH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Restore Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRestoreStaff(staff)}
                          disabled={restoringId === staff.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50"
                          title="Restore staff member to active list"
                        >
                          <RotateCcw size={13} className={restoringId === staff.id ? 'animate-spin' : ''} />
                          <span>{restoringId === staff.id ? 'Restoring...' : 'Restore'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
