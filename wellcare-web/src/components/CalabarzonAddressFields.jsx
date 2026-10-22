import React from 'react';
import calabarzonPlaces from '../calabarzonPlaces.json';

export default function CalabarzonAddressFields({ region, province, city_municipality, onChange, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="reg-field">
        <label className="reg-label">Region <span className="req">*</span></label>
        <select className="reg-input" value={region || 'CALABARZON'} disabled><option value="CALABARZON">Region IV-A (CALABARZON)</option></select>
      </div>
      <div className="reg-grid-2">
        <div className="reg-field">
          <label className="reg-label">Province <span className="req">*</span></label>
          <select name="province" className={`reg-input ${error ? 'reg-input-error' : ''}`} value={province || ''} onChange={event => onChange({ region: 'CALABARZON', province: event.target.value, city_municipality: '' })}>
            <option value="">Select province</option>
            {Object.keys(calabarzonPlaces).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="reg-field">
          <label className="reg-label">City / Municipality <span className="req">*</span></label>
          <select name="city_municipality" className={`reg-input ${error ? 'reg-input-error' : ''}`} value={city_municipality || ''} disabled={!province} onChange={event => onChange({ region: 'CALABARZON', city_municipality: event.target.value })}>
            <option value="">Select city / municipality</option>
            {(calabarzonPlaces[province] || []).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>
      {error && <span className="reg-error-msg">{error}</span>}
    </div>
  );
}
