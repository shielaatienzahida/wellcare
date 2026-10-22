import React from 'react';

export default function MembershipCard({ client }) {
  return (
    <div className="membership-card-container">
      <div style={{
        background: 'linear-gradient(135deg, #0D3B36 0%, #0A2E2A 100%)',
        border: '1px solid rgba(45, 212, 191, 0.2)',
        borderRadius: '1rem',
        padding: '1.5rem',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(13, 59, 47, 0.12)',
        transition: 'all 0.3s ease'
      }}>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#FFFFFF',
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Membership
          </span>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(45, 212, 191, 0.15)',
            border: '1px solid rgba(45, 212, 191, 0.3)'
          }}>
            <span style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              backgroundColor: '#2DD4BF'
            }} />
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#2DD4BF',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Active
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '0.25rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.2,
            margin: 0
          }}>
            {client?.full_name || 'Client Name'}
          </h3>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <p style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#5EEAD4',
            opacity: 0.8,
            margin: 0
          }}>
            @{client?.username || 'username'}
          </p>
        </div>

        {client?.client_id_number && (
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(45, 212, 191, 0.1)',
            border: '1px solid rgba(45, 212, 191, 0.25)'
          }}>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#2DD4BF',
              letterSpacing: '0.05em',
              margin: 0
            }}>
              ID: {client.client_id_number}
            </p>
          </div>
        )}

        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(45, 212, 191, 0.15)'
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: '#94A3B8',
            fontWeight: 500,
            margin: 0
          }}>
            Slot #{client?.slot_id || 1}
          </p>
        </div>
      </div>
    </div>
  );
}
