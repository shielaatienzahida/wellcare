import React from 'react';
import {
  X,
  User,
  Fingerprint,
  Calendar,
  Phone,
  Mail,
  MapPin,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Activity,
  Droplets
} from 'lucide-react';

export default function ClientDetailModal({ client, onClose, onViewHistory }) {
  if (!client) return null;

  const formatDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return null;
    const diff = Date.now() - birth.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = calculateAge(client.birthdate || client.dob);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
            color: '#ffffff',
            padding: '22px 24px',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(4px)',
                display: 'grid',
                placeItems: 'center',
                border: '2px solid rgba(255, 255, 255, 0.35)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 20,
                flexShrink: 0
              }}
            >
              {(client.full_name || client.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3
                  id="client-modal-title"
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {client.full_name || client.name || 'Client Information'}
                </h3>
                {client.client_id_number && (
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.22)',
                      padding: '2px 9px',
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.04em'
                    }}
                  >
                    ID: #{client.client_id_number}
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  color: 'rgba(255, 255, 255, 0.88)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>Username: @{client.username || '—'}</span>
                <span>•</span>
                <span>Joined {formatDate(client.created_at)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'grid',
              placeItems: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Stat Highlights */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12
            }}
          >
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '12px 14px'
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Activity size={13} /> Check-ins
              </span>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#14532d', marginTop: 4 }}>
                {client.total_checkins ?? 0}
              </div>
            </div>

            <div
              style={{
                background: '#ecfeff',
                border: '1px solid #a5f3fc',
                borderRadius: 12,
                padding: '12px 14px'
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0e7490', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Droplets size={13} /> Alkaline
              </span>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#155e75', marginTop: 4 }}>
                {client.total_bottles ?? 0}
              </div>
            </div>

            <div
              style={{
                background: client.fingerprint_enrolled ? '#f0fdf4' : '#fffbeb',
                border: client.fingerprint_enrolled ? '1px solid #bbf7d0' : '1px solid #fde68a',
                borderRadius: 12,
                padding: '12px 14px'
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: client.fingerprint_enrolled ? '#166534' : '#b45309',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Fingerprint size={13} /> Biometrics
              </span>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: client.fingerprint_enrolled ? '#15803d' : '#d97706',
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                {client.fingerprint_enrolled ? (
                  <>
                    <CheckCircle2 size={16} /> Enrolled
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} /> Pending
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Personal & Demographic Info */}
          <div>
            <h4
              style={{
                margin: '0 0 10px',
                fontSize: 13,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              Personal Details
            </h4>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Gender</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  {client.gender || '—'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Birthdate & Age</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  {formatDate(client.birthdate || client.dob)}
                  {age !== null && <span style={{ color: '#64748b', fontWeight: 400 }}> ({age} yrs old)</span>}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Contact Number</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} color="#059669" />
                  {client.contact_number || client.phone || '—'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Account Email</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} color="#059669" />
                  {client.email || 'None registered'}
                </p>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Complete Address</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <MapPin size={15} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{client.address || '—'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h4
              style={{
                margin: '0 0 10px',
                fontSize: 13,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              Emergency Contact
            </h4>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Contact Person</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HeartHandshake size={14} color="#dc2626" />
                  {client.emergency_contact || '—'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Emergency Phone</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} color="#dc2626" />
                  {client.emergency_number || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12
          }}
        >
          {onViewHistory && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewHistory(client);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              View in Monitoring
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#047857',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#065f46')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#047857')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

