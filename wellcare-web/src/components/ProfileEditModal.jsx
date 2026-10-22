import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function ProfileEditModal({ client, editForm, onClose, onSave, editSaved }) {
  const [errors, setErrors] = useState({});

  const handleChange = (key, value) => {
    onSave({ ...editForm, [key]: value });
    if (errors[key]) {
      setErrors({ ...errors, [key]: null });
    }
  };

  return (
    <div className="profile-edit-modal" onClick={onClose}>
      <div className="profile-edit-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-edit-modal-header">
          <h2 className="profile-edit-modal-title">Edit Profile</h2>
          <button
            type="button"
            className="profile-edit-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="profile-edit-modal-body">
          {/* Email Field */}
          <div className="form-field">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              value={editForm.email || ''}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && <span className="form-error-message">{errors.email}</span>}
          </div>

          {/* Contact Number Field */}
          <div className="form-field">
            <label className="form-label">Contact Number</label>
            <input
              type="tel"
              className={`form-input ${errors.contact_number ? 'form-input-error' : ''}`}
              value={editForm.contact_number || ''}
              onChange={e => handleChange('contact_number', e.target.value)}
              placeholder="09XX XXX XXXX"
            />
            {errors.contact_number && <span className="form-error-message">{errors.contact_number}</span>}
          </div>

          {/* Emergency Contact Field */}
          <div className="form-field">
            <label className="form-label">Emergency Contact Name</label>
            <input
              type="text"
              className="form-input"
              value={editForm.emergency_contact || ''}
              onChange={e => handleChange('emergency_contact', e.target.value)}
              placeholder="Contact person name"
            />
          </div>

          {/* Emergency Number Field */}
          <div className="form-field">
            <label className="form-label">Emergency Number</label>
            <input
              type="tel"
              className="form-input"
              value={editForm.emergency_number || ''}
              onChange={e => handleChange('emergency_number', e.target.value)}
              placeholder="09XX XXX XXXX"
            />
          </div>

          {/* Address Fields */}
          <div className="form-field">
            <label className="form-label">Region</label>
            <select
              className="form-select"
              value={editForm.region || ''}
              onChange={e => handleChange('region', e.target.value)}
            >
              <option value="">Select Region</option>
              <option value="CALABARZON">CALABARZON</option>
            </select>
          </div>

          {editForm.region && (
            <>
              <div className="form-field">
                <label className="form-label">Province</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.province || ''}
                  onChange={e => handleChange('province', e.target.value)}
                  placeholder="Province"
                />
              </div>

              <div className="form-field">
                <label className="form-label">City/Municipality</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.city_municipality || ''}
                  onChange={e => handleChange('city_municipality', e.target.value)}
                  placeholder="City/Municipality"
                />
              </div>
            </>
          )}

          {/* Success Message */}
          {editSaved && (
            <div className="form-success-message">
              ✓ Profile updated successfully
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="profile-edit-modal-footer">
          <button
            type="button"
            className="form-button form-button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="form-button form-button-primary"
            onClick={() => onSave(editForm)}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
