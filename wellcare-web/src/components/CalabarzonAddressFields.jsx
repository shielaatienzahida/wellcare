import React from 'react';
import calabarzonPlaces from '../calabarzonPlaces.json';
import calabarzonBarangays from '../calabarzonBarangays.json';

export default function CalabarzonAddressFields({ region, province, city_municipality, barangay, onChange, error, barangayError, disabled }) {
  const availableBarangays = (city_municipality && calabarzonBarangays[city_municipality]) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="reg-field">
        <label className="reg-label">Region <span className="req">*</span></label>
        <select className="reg-input" value={region || 'CALABARZON'} disabled><option value="CALABARZON">Region IV-A (CALABARZON)</option></select>
      </div>
      <div className="reg-grid-2">
        <div className="reg-field">
          <label className="reg-label">Province <span className="req">*</span></label>
          <select
            name="province"
            className={`reg-input ${error ? 'reg-input-error' : ''}`}
            value={province || ''}
            disabled={disabled}
            onChange={event => onChange({ region: 'CALABARZON', province: event.target.value, city_municipality: '', barangay: '' })}
          >
            <option value="">Select province</option>
            {Object.keys(calabarzonPlaces).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="reg-field">
          <label className="reg-label">City / Municipality <span className="req">*</span></label>
          <select
            name="city_municipality"
            className={`reg-input ${error ? 'reg-input-error' : ''}`}
            value={city_municipality || ''}
            disabled={disabled || !province}
            onChange={event => onChange({ region: 'CALABARZON', city_municipality: event.target.value, barangay: '' })}
          >
            <option value="">Select city / municipality</option>
            {(calabarzonPlaces[province] || []).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>
      <div className="reg-field">
        <label className="reg-label">Barangay <span className="req">*</span></label>
        {availableBarangays.length > 0 ? (
          <select
            name="barangay"
            className={`reg-input ${barangayError ? 'reg-input-error' : ''}`}
            value={barangay || ''}
            disabled={disabled || !city_municipality}
            onChange={event => onChange({ barangay: event.target.value })}
          >
            <option value="">{city_municipality ? 'Select barangay' : 'Select city first'}</option>
            {availableBarangays.map(bgy => (
              <option key={bgy} value={bgy}>{bgy}</option>
            ))}
          </select>
        ) : (
          <input
            name="barangay"
            type="text"
            className={`reg-input ${barangayError ? 'reg-input-error' : ''}`}
            placeholder={city_municipality ? "Enter barangay" : "Select city first"}
            value={barangay || ''}
            disabled={disabled || !city_municipality}
            onChange={event => onChange({ barangay: event.target.value })}
          />
        )}
        {barangayError && <span className="reg-error-msg">{barangayError}</span>}
      </div>
      {error && <span className="reg-error-msg">{error}</span>}
    </div>
  );
}
