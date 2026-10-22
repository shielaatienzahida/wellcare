import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '5rem', fontWeight: 800, color: 'rgba(4,106,56,0.08)', lineHeight: 1, marginBottom: '8px' }}>404</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--emerald)', marginBottom: '8px' }}>Page Not Found</h2>
        <p style={{ fontSize: '0.88rem', color: 'rgba(4,106,56,0.5)', lineHeight: 1.6, marginBottom: '28px' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
            Go Back
          </button>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
