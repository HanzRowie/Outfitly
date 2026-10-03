import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { getUserProfile, updateUserProfile, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Profile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const fileInputRef = useRef(null);

  // Profile data from GET /api/accounts/profile/
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [formValues, setFormValues] = useState({
    first_name: '',
    last_name: '',
    bio: '',
  });

  // Image upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState('');

  // Notifications
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch real profile data on page load
  const loadProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await getUserProfile();
      setProfile(data);
      setFormValues({
        first_name: data?.first_name || '',
        last_name: data?.last_name || '',
        bio: data?.bio || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      if (err.status === 401) {
        logout();
        navigate('/login', {
          state: { message: 'Your session has expired. Please sign in again.' },
        });
      } else {
        setErrorMessage(err.message || 'Unable to load profile details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Cleanup object URL preview to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Compute clean initials monogram for default profile placeholder (garment/brand styled, no human avatars)
  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return (profile.first_name[0] + profile.last_name[0]).toUpperCase();
    }
    if (profile?.first_name) {
      return profile.first_name.slice(0, 2).toUpperCase();
    }
    if (profile?.username) {
      return profile.username.slice(0, 2).toUpperCase();
    }
    return 'OF';
  };

  // Switch to edit mode
  const handleStartEditing = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setImageError('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormValues({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      bio: profile?.bio || '',
    });
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEditing = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setImageError('');
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFormValues({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      bio: profile?.bio || '',
    });
  };

  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file selection and client-side validation
  const handleFileChange = (e) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setImageError('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError('Image file size must be less than 5MB.');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearSelectedFile = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit profile updates
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      let updatedProfile;

      if (selectedFile) {
        // Multipart/form-data for profile picture + text fields
        // Note: Content-Type is NOT manually set so browser attaches multipart boundary
        const formData = new FormData();
        formData.append('profile_picture', selectedFile);
        formData.append('first_name', formValues.first_name);
        formData.append('last_name', formValues.last_name);
        formData.append('bio', formValues.bio);

        updatedProfile = await updateUserProfile(formData);
      } else {
        // Text-only PATCH with application/json
        updatedProfile = await updateUserProfile({
          first_name: formValues.first_name,
          last_name: formValues.last_name,
          bio: formValues.bio,
        });
      }

      setProfile(updatedProfile);
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedProfile }));
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      setSelectedFile(null);
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    } catch (err) {
      console.error('Profile update failed:', err);
      if (err.status === 401) {
        logout();
        navigate('/login', {
          state: { message: 'Your session has expired. Please sign in again.' },
        });
      } else {
        setErrorMessage(err.message || 'Failed to update profile. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const activeProfilePicture = previewUrl || (profile?.profile_picture ? getImageUrl(profile.profile_picture) : null);
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  return (
    <div className="outfitly-app-shell">
      <Navbar />

      <main className="outfitly-profile-container">
        {/* Header Breadcrumb & Actions */}
        <div className="outfitly-builder-header">
          <div>
            <span className="outfitly-section-kicker">ACCOUNT & IDENTITY</span>
            <h1 className="outfitly-builder-title">User Profile</h1>
            <p className="outfitly-builder-subtitle">
              Manage your personal credentials, public style bio, and profile picture.
            </p>
          </div>

          <div className="outfitly-builder-header-actions">
            {!isLoading && profile && !isEditing && (
              <button
                type="button"
                onClick={handleStartEditing}
                className="outfitly-btn outfitly-btn--primary"
                id="edit-profile-btn"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: '0.45rem' }}
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Profile
              </button>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={isSaving}
                className="outfitly-btn outfitly-btn--outline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {successMessage && (
          <div className="outfitly-alert outfitly-alert--success" role="status">
            <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{successMessage}</span>
              <button
                type="button"
                className="outfitly-btn-link"
                onClick={() => setSuccessMessage('')}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="outfitly-alert outfitly-alert--error" role="alert">
            <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{errorMessage}</span>
              <button
                type="button"
                className="outfitly-btn-link"
                onClick={() => setErrorMessage('')}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="outfitly-splash-loader" style={{ minHeight: '360px' }}>
            <LoadingSpinner size="large" />
          </div>
        )}

        {/* =================================================================
            VIEW PROFILE MODE
            ================================================================= */}
        {!isLoading && profile && !isEditing && (
          <div className="outfitly-profile-layout">
            {/* Left Hero Profile Identity Card */}
            <div className="outfitly-profile-card outfitly-profile-hero">
              <div className="outfitly-profile-avatar-wrap">
                {profile.profile_picture ? (
                  <img
                    src={getImageUrl(profile.profile_picture)}
                    alt={`${profile.username}'s profile`}
                    className="outfitly-profile-avatar-img"
                  />
                ) : (
                  <div
                    className="outfitly-profile-avatar-placeholder"
                    aria-label="Default profile initials"
                  >
                    {getInitials()}
                  </div>
                )}
                <span className="outfitly-profile-status-indicator" title="Active Account" />
              </div>

              <div className="outfitly-profile-hero-meta">
                <h2 className="outfitly-profile-hero-name">
                  {fullName || `@${profile.username}`}
                </h2>
                <p className="outfitly-profile-hero-handle">@{profile.username}</p>
                <div className="outfitly-profile-badges">
                  <span className="outfitly-pill outfitly-pill--compact">Verified Stylist</span>
                </div>
              </div>

              {/* Quick Wardrobe Actions */}
              <div className="outfitly-profile-quick-actions">
                <Link
                  to="/saved-outfits"
                  className="outfitly-btn outfitly-btn--outline outfitly-btn--full outfitly-btn--small"
                >
                  View Saved Outfits →
                </Link>
                <Link
                  to="/outfit-builder"
                  className="outfitly-btn outfitly-btn--ghost outfitly-btn--full outfitly-btn--small"
                >
                  Create New Outfit
                </Link>
              </div>
            </div>

            {/* Right Information Details */}
            <div className="outfitly-profile-details">
              {/* Style Bio Box */}
              <div className="outfitly-profile-card">
                <div className="outfitly-profile-card-header">
                  <span className="outfitly-profile-card-kicker">WARDROBE PERSPECTIVE</span>
                  <h3 className="outfitly-profile-card-title">Style Bio</h3>
                </div>
                <div className="outfitly-profile-bio-content">
                  {profile.bio ? (
                    <p className="outfitly-profile-bio-text">{profile.bio}</p>
                  ) : (
                    <div className="outfitly-profile-empty-bio">
                      <p>No style bio added yet.</p>
                      <button
                        type="button"
                        onClick={handleStartEditing}
                        className="outfitly-text-link"
                      >
                        Add a bio describing your aesthetic →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Credentials Grid */}
              <div className="outfitly-profile-card">
                <div className="outfitly-profile-card-header">
                  <span className="outfitly-profile-card-kicker">CREDENTIALS & DETAILS</span>
                  <h3 className="outfitly-profile-card-title">Personal Information</h3>
                </div>

                <div className="outfitly-profile-grid">
                  <div className="outfitly-profile-field">
                    <span className="outfitly-profile-field__label">
                      Username
                      <span className="outfitly-profile-field__lock-badge" title="Username is read-only">
                        🔒 Read-only
                      </span>
                    </span>
                    <span className="outfitly-profile-field__value">@{profile.username}</span>
                  </div>

                  <div className="outfitly-profile-field">
                    <span className="outfitly-profile-field__label">
                      Email Address
                      <span className="outfitly-profile-field__lock-badge" title="Email is read-only">
                        🔒 Read-only
                      </span>
                    </span>
                    <span className="outfitly-profile-field__value">{profile.email}</span>
                  </div>

                  <div className="outfitly-profile-field">
                    <span className="outfitly-profile-field__label">First Name</span>
                    <span className="outfitly-profile-field__value">
                      {profile.first_name || '—'}
                    </span>
                  </div>

                  <div className="outfitly-profile-field">
                    <span className="outfitly-profile-field__label">Last Name</span>
                    <span className="outfitly-profile-field__value">
                      {profile.last_name || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            EDIT PROFILE MODE
            ================================================================= */}
        {!isLoading && profile && isEditing && (
          <form onSubmit={handleSubmit} className="outfitly-profile-edit-form">
            <div className="outfitly-profile-card">
              <div className="outfitly-profile-card-header">
                <span className="outfitly-section-kicker">PROFILE EDITOR</span>
                <h3 className="outfitly-profile-card-title">Modify Profile Details</h3>
                <p className="outfitly-profile-card-sub">
                  Update your personal name, wardrobe bio, and photo. Username and email address remain permanently fixed.
                </p>
              </div>

              {/* Profile Picture Upload Section */}
              <div className="outfitly-profile-uploader-section">
                <div className="outfitly-profile-uploader-avatar">
                  {activeProfilePicture ? (
                    <img
                      src={activeProfilePicture}
                      alt="Profile preview"
                      className="outfitly-profile-avatar-img"
                    />
                  ) : (
                    <div className="outfitly-profile-avatar-placeholder">
                      {getInitials()}
                    </div>
                  )}
                </div>

                <div className="outfitly-profile-uploader-controls">
                  <span className="outfitly-label">Profile Picture</span>
                  <p className="outfitly-profile-uploader-hint">
                    Upload a clean, high-resolution square photo (JPG, PNG, or WEBP, max 5MB).
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    style={{ display: 'none' }}
                    id="profile-picture-input"
                  />

                  <div className="outfitly-profile-uploader-buttons">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ marginRight: '0.4rem' }}
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      {selectedFile ? 'Change Selected File' : 'Choose New Photo'}
                    </button>

                    {selectedFile && (
                      <button
                        type="button"
                        onClick={handleClearSelectedFile}
                        className="outfitly-btn outfitly-btn--ghost outfitly-btn--small"
                      >
                        Remove Selection
                      </button>
                    )}
                  </div>

                  {selectedFile && (
                    <span className="outfitly-profile-file-name">
                      Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}

                  {imageError && (
                    <span className="outfitly-field-feedback outfitly-field-feedback--error">
                      {imageError}
                    </span>
                  )}
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="outfitly-profile-edit-grid">
                {/* Username (Read Only) */}
                <div className="outfitly-field-group">
                  <label className="outfitly-label">
                    Username
                    <span className="outfitly-profile-lock-tag">Locked</span>
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    disabled
                    readOnly
                    className="outfitly-input outfitly-input--disabled"
                    aria-readonly="true"
                  />
                  <span className="outfitly-field-helper">Username cannot be changed.</span>
                </div>

                {/* Email (Read Only) */}
                <div className="outfitly-field-group">
                  <label className="outfitly-label">
                    Email Address
                    <span className="outfitly-profile-lock-tag">Locked</span>
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    readOnly
                    className="outfitly-input outfitly-input--disabled"
                    aria-readonly="true"
                  />
                  <span className="outfitly-field-helper">Email is permanently tied to your credentials.</span>
                </div>

                {/* First Name */}
                <div className="outfitly-field-group">
                  <label htmlFor="first_name" className="outfitly-label">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formValues.first_name}
                    onChange={handleInputChange}
                    placeholder="Enter your first name"
                    className="outfitly-input"
                    maxLength={150}
                  />
                </div>

                {/* Last Name */}
                <div className="outfitly-field-group">
                  <label htmlFor="last_name" className="outfitly-label">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formValues.last_name}
                    onChange={handleInputChange}
                    placeholder="Enter your last name"
                    className="outfitly-input"
                    maxLength={150}
                  />
                </div>

                {/* Bio */}
                <div className="outfitly-field-group outfitly-field-group--full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="bio" className="outfitly-label">
                      Style Bio & Wardrobe Vision
                    </label>
                    <span className="outfitly-field-helper" style={{ margin: 0 }}>
                      {500 - formValues.bio.length} characters left
                    </span>
                  </div>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formValues.bio}
                    onChange={handleInputChange}
                    rows={4}
                    maxLength={500}
                    placeholder="Describe your wardrobe palette, aesthetic preferences, favorite garments, or fashion motto..."
                    className="outfitly-textarea"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="outfitly-profile-form-actions">
                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  disabled={isSaving}
                  isLoading={isSaving}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                </Button>

                <button
                  type="button"
                  onClick={handleCancelEditing}
                  disabled={isSaving}
                  className="outfitly-btn outfitly-btn--outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default Profile;
