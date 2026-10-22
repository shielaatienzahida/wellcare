import React from 'react';

export function DashboardContainer({ children }) {
  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {children}
      </div>
    </div>
  );
}

export function MembershipCardRefactored({ client }) {
  return (
    <div className="membership-card-refactored">
      {/* Header with Label and Badge */}
      <div className="membership-card-header">
        <span className="membership-label">Membership</span>
        <div className="membership-badge">
          <span className="membership-badge-dot" />
          Active
        </div>
      </div>

      {/* Client Name - White Text */}
      <h3 className="membership-name">
        {client?.full_name || 'Client Name'}
      </h3>

      {/* Username - Soft Teal */}
      <p className="membership-username">
        @{client?.username || 'username'}
      </p>

      {/* Client ID Badge */}
      {client?.client_id_number && (
        <div className="membership-id-badge">
          ID: {client.client_id_number}
        </div>
      )}

      {/* Slot Info */}
      <div className="membership-slot">
        Slot #{client?.slot_id || 1}
      </div>
    </div>
  );
}

export function StatsGridRefactored({ stats }) {
  return (
    <div className="stats-grid">
      {stats.map((stat, idx) => (
        <div key={idx} className="stat-card-refactored">
          <div className="stat-value-large">{stat.value}</div>
          <div className="stat-label-text">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export function CardRefactored({ children, className = '' }) {
  return (
    <div className={`card-refactored ${className}`}>
      {children}
    </div>
  );
}
