import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Compute clean user initials for avatar (e.g. 'TC' for test_couture)
  const getInitials = (username) => {
    if (!username) return 'U';
    const parts = username.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <header className="outfitly-nav">
      <div className="outfitly-nav__container">
        {/* Brand Logo */}
        <Link to="/" className="outfitly-nav__brand" onClick={() => setMobileMenuOpen(false)}>
          <span className="outfitly-logo-mark">O</span>
          <span className="outfitly-brand-name">OUTFITLY</span>
        </Link>

        {/* Desktop Center Navigation */}
        <nav className="outfitly-nav__center" aria-label="Main Navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `outfitly-nav__link ${isActive ? 'outfitly-nav__link--active' : ''}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/outfit-builder"
            className={({ isActive }) =>
              `outfitly-nav__link ${isActive ? 'outfitly-nav__link--active' : ''}`
            }
          >
            Build Outfit
          </NavLink>
          <NavLink
            to="/saved-outfits"
            className={({ isActive }) =>
              `outfitly-nav__link ${isActive ? 'outfitly-nav__link--active' : ''}`
            }
          >
            Saved Outfits
          </NavLink>
        </nav>

        {/* Right Section / User Menu */}
        <div className="outfitly-nav__right">
          {isAuthenticated ? (
            <div className="outfitly-nav__user-menu">
              <div className="outfitly-user-badge" title={`Signed in as ${user?.username || 'User'}`}>
                <span className="outfitly-user-avatar">
                  {getInitials(user?.username)}
                </span>
                <span className="outfitly-user-name">@{user?.username || 'user'}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="outfitly-nav__auth-links">
              <Link to="/login" className="outfitly-nav__link">
                Sign In
              </Link>
              <Link to="/register" className="outfitly-btn outfitly-btn--primary outfitly-btn--small">
                Create Account
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="outfitly-nav__mobile-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="outfitly-nav__mobile-drawer">
          <nav className="outfitly-nav__mobile-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `outfitly-nav__mobile-link ${isActive ? 'outfitly-nav__mobile-link--active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </NavLink>
            <NavLink
              to="/outfit-builder"
              className={({ isActive }) =>
                `outfitly-nav__mobile-link ${isActive ? 'outfitly-nav__mobile-link--active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Build Outfit
            </NavLink>
            <NavLink
              to="/saved-outfits"
              className={({ isActive }) =>
                `outfitly-nav__mobile-link ${isActive ? 'outfitly-nav__mobile-link--active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Saved Outfits
            </NavLink>
          </nav>

          <div className="outfitly-nav__mobile-footer">
            {isAuthenticated ? (
              <div className="outfitly-nav__mobile-user-row">
                <div className="outfitly-user-badge">
                  <span className="outfitly-user-avatar">{getInitials(user?.username)}</span>
                  <span className="outfitly-user-name">@{user?.username}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="outfitly-nav__mobile-auth-row">
                <Link
                  to="/login"
                  className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="outfitly-btn outfitly-btn--primary outfitly-btn--full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
