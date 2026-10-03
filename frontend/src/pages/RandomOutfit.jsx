import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { getRandomOutfit, saveOutfit, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const RandomOutfit = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Generator state
  const [outfit, setOutfit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Save outfit state
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Fetch a new randomized outfit from backend
  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSaveSuccess('');
    setSaveError('');
    setIsSaved(false);

    try {
      const data = await getRandomOutfit();
      if (data && data.top && data.bottom && data.shoes) {
        setOutfit(data);
      } else {
        setErrorMessage('Unable to assemble a complete outfit. Please verify your collection.');
      }
    } catch (err) {
      console.error('Random generator error:', err);
      setErrorMessage(
        err.message || 'Unable to generate outfit at this moment. Please ensure the server is active.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initial generation on page mount
  useEffect(() => {
    handleGenerate();
  }, []);

  // Save generated outfit to user's wardrobe archive
  const handleSave = async () => {
    if (!outfit?.top?.id || !outfit?.bottom?.id || !outfit?.shoes?.id) {
      setSaveError('No complete outfit available to save.');
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      await saveOutfit({
        top: outfit.top.id,
        bottom: outfit.bottom.id,
        shoes: outfit.shoes.id,
      });

      setIsSaved(true);
      setSaveSuccess('Outfit saved successfully to your wardrobe!');

      setTimeout(() => {
        setIsSaved(false);
      }, 2500);
    } catch (err) {
      console.error('Save outfit error:', err);

      if (err.status === 401) {
        logout();
        setSaveError('Your session has expired. Redirecting to sign in...');
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Your session has expired. Please sign in again.' },
          });
        }, 1500);
      } else {
        setSaveError(err.message || 'Could not save outfit. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="outfitly-app-shell">
      <Navbar />

      <main className="outfitly-random-container">
        {/* Header Breadcrumb & Title */}
        <div className="outfitly-builder-header">
          <div>
            <span className="outfitly-section-kicker">WARDROBE SYNTHESIS</span>
            <h1 className="outfitly-builder-title">Random Outfit Generator</h1>
            <p className="outfitly-builder-subtitle">
              Instant rule-based wardrobe synthesis. Discover curated combinations evaluated by pure garment harmony.
            </p>
          </div>

          <div className="outfitly-builder-header-actions">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="outfitly-btn outfitly-btn--outline"
              aria-label="Generate a new randomized outfit"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginRight: '0.4rem' }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {isLoading ? 'Synthesizing...' : 'Generate Again'}
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {saveSuccess && (
          <div className="outfitly-alert outfitly-alert--success" role="status">
            <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div style={{ flex: 1 }}>
              <strong>{saveSuccess}</strong>
              <div style={{ marginTop: '0.4rem' }}>
                <Link to="/saved-outfits" className="outfitly-text-link outfitly-text-link--small">
                  View in your saved archive →
                </Link>
              </div>
            </div>
          </div>
        )}

        {saveError && (
          <div className="outfitly-alert outfitly-alert--error" role="alert">
            <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{saveError}</span>
          </div>
        )}

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="outfitly-random-layout">
            <div className="outfitly-random-trio-grid">
              {[1, 2, 3].map((slot) => (
                <div key={slot} className="outfitly-clothing-skeleton">
                  <div className="outfitly-clothing-skeleton__image" style={{ height: '240px' }} />
                  <div className="outfitly-clothing-skeleton__line" style={{ width: '60%' }} />
                  <div className="outfitly-clothing-skeleton__line" style={{ width: '40%' }} />
                  <div className="outfitly-clothing-skeleton__line" style={{ width: '25%' }} />
                </div>
              ))}
            </div>

            <div className="outfitly-random-score-panel">
              <div className="outfitly-clothing-skeleton">
                <div className="outfitly-clothing-skeleton__line" style={{ width: '50%', height: '24px' }} />
                <div className="outfitly-clothing-skeleton__line" style={{ width: '80%' }} />
                <div className="outfitly-clothing-skeleton__line" style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="outfitly-builder-error-state">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 className="outfitly-builder-error-title">Unable to Generate Outfit</h3>
            <p className="outfitly-builder-error-subtitle">{errorMessage}</p>
            <button
              type="button"
              onClick={handleGenerate}
              className="outfitly-btn outfitly-btn--primary"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Generated Outfit Presentation */}
        {!isLoading && !errorMessage && outfit && (
          <div className="outfitly-random-layout">
            {/* 3-Column Clothing Showcase */}
            <section className="outfitly-random-trio-grid" aria-label="Generated outfit pieces">
              {/* Piece 1: TOP */}
              <article className="outfitly-random-card">
                <div className="outfitly-random-card__image-container">
                  <img
                    src={getImageUrl(outfit.top.image)}
                    alt={outfit.top.name}
                    className="outfitly-random-card__image"
                  />
                  <span className="outfitly-clothing-card__cat-badge">TOP</span>
                </div>
                <div className="outfitly-random-card__body">
                  <h3 className="outfitly-random-card__name">{outfit.top.name}</h3>
                  <p className="outfitly-random-card__meta">
                    {outfit.top.color} • {outfit.top.style}
                  </p>
                  <span className="outfitly-pill outfitly-pill--compact" style={{ alignSelf: 'flex-start' }}>
                    {outfit.top.occasion}
                  </span>
                </div>
              </article>

              {/* Piece 2: BOTTOM */}
              <article className="outfitly-random-card">
                <div className="outfitly-random-card__image-container">
                  <img
                    src={getImageUrl(outfit.bottom.image)}
                    alt={outfit.bottom.name}
                    className="outfitly-random-card__image"
                  />
                  <span className="outfitly-clothing-card__cat-badge">BOTTOM</span>
                </div>
                <div className="outfitly-random-card__body">
                  <h3 className="outfitly-random-card__name">{outfit.bottom.name}</h3>
                  <p className="outfitly-random-card__meta">
                    {outfit.bottom.color} • {outfit.bottom.style}
                  </p>
                  <span className="outfitly-pill outfitly-pill--compact" style={{ alignSelf: 'flex-start' }}>
                    {outfit.bottom.occasion}
                  </span>
                </div>
              </article>

              {/* Piece 3: SHOES */}
              <article className="outfitly-random-card">
                <div className="outfitly-random-card__image-container">
                  <img
                    src={getImageUrl(outfit.shoes.image)}
                    alt={outfit.shoes.name}
                    className="outfitly-random-card__image"
                  />
                  <span className="outfitly-clothing-card__cat-badge">SHOES</span>
                </div>
                <div className="outfitly-random-card__body">
                  <h3 className="outfitly-random-card__name">{outfit.shoes.name}</h3>
                  <p className="outfitly-random-card__meta">
                    {outfit.shoes.color} • {outfit.shoes.style}
                  </p>
                  <span className="outfitly-pill outfitly-pill--compact" style={{ alignSelf: 'flex-start' }}>
                    {outfit.shoes.occasion}
                  </span>
                </div>
              </article>
            </section>

            {/* Score & Compatibility Analysis Card */}
            <aside className="outfitly-random-score-panel" aria-label="Algorithmic match breakdown">
              <div className="outfitly-match-score-card outfitly-match-score-card--active">
                <div className="outfitly-match-score-card__header">
                  <span className="outfitly-match-score-card__title">RULE-BASED COMPATIBILITY</span>
                  <span className="outfitly-pill outfitly-pill--compact" style={{ fontWeight: 600 }}>
                    Synthesized Match
                  </span>
                </div>

                <div className="outfitly-match-score-card__body">
                  <div className="outfitly-match-score-hero">
                    <div className="outfitly-match-score-hero__meta">
                      <span className="outfitly-match-score-hero__label">Overall Score</span>
                      <span className="outfitly-match-score-hero__sub">
                        Evaluated across 20 randomized pairings
                      </span>
                    </div>
                    <span className="outfitly-match-score-hero__metric">
                      {outfit.score?.overall_match}%
                    </span>
                  </div>

                  <div className="outfitly-match-breakdown">
                    {/* Color Harmony (40% Weight) */}
                    <div className="outfitly-breakdown-row">
                      <div className="outfitly-breakdown-row__header">
                        <span>Color Harmony (40%)</span>
                        <strong>{outfit.score?.color_match}%</strong>
                      </div>
                      <div className="outfitly-score-track">
                        <div
                          className="outfitly-score-track__fill"
                          style={{ width: `${outfit.score?.color_match}%` }}
                        />
                      </div>
                    </div>

                    {/* Style Coherence (30% Weight) */}
                    <div className="outfitly-breakdown-row">
                      <div className="outfitly-breakdown-row__header">
                        <span>Style Coherence (30%)</span>
                        <strong>{outfit.score?.style_match}%</strong>
                      </div>
                      <div className="outfitly-score-track">
                        <div
                          className="outfitly-score-track__fill"
                          style={{ width: `${outfit.score?.style_match}%` }}
                        />
                      </div>
                    </div>

                    {/* Occasion Alignment (30% Weight) */}
                    <div className="outfitly-breakdown-row">
                      <div className="outfitly-breakdown-row__header">
                        <span>Occasion Alignment (30%)</span>
                        <strong>{outfit.score?.occasion_match}%</strong>
                      </div>
                      <div className="outfitly-score-track">
                        <div
                          className="outfitly-score-track__fill"
                          style={{ width: `${outfit.score?.occasion_match}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="outfitly-match-score-source">
                    Verified Algorithmic Match • Rule-based (40/30/30)
                  </p>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="outfitly-random-actions-bar">
                <Button
                  type="button"
                  variant="primary"
                  size="large"
                  fullWidth
                  disabled={isSaving}
                  isLoading={isSaving}
                  onClick={handleSave}
                  className={isSaved ? 'outfitly-btn--saved' : ''}
                >
                  {isSaved ? 'Saved to Wardrobe ✓' : isSaving ? 'Saving Outfit...' : 'Save Outfit'}
                </Button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isSaving || isLoading}
                  className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
                >
                  Generate Again
                </button>

                <Link
                  to="/outfit-builder"
                  className="outfitly-btn outfitly-btn--subtle outfitly-btn--full"
                  style={{ textAlign: 'center', fontSize: '0.85rem' }}
                >
                  Fine-tune in Outfit Builder →
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default RandomOutfit;
