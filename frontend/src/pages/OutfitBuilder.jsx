import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getClothingItems,
  saveOutfit,
  getRecommendations,
  getOutfitScore,
  getImageUrl,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export const OutfitBuilder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const initialCategory = searchParams.get('category') || 'all';

  // Selected Outfit Slots (top, bottom, shoes)
  const [selectedTop, setSelectedTop] = useState(null);
  const [selectedBottom, setSelectedBottom] = useState(null);
  const [selectedShoes, setSelectedShoes] = useState(null);

  // Clothing catalogue state
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [clothingItems, setClothingItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Save outfit state
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Real recommendation score from Django POST /api/recommendations/score/
  const [outfitScore, setOutfitScore] = useState(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringError, setScoringError] = useState('');

  // "Complete Your Look" recommendation data from Django
  const [compatibleItems, setCompatibleItems] = useState([]);
  const [alternativeLooks, setAlternativeLooks] = useState([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recAnchorItem, setRecAnchorItem] = useState(null);

  // Random generator notice
  const [randomNotice, setRandomNotice] = useState(false);

  // Fetch clothing items when category changes
  const fetchItems = async (cat) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const categoryParam = cat === 'all' ? null : cat;
      const items = await getClothingItems(categoryParam);
      setClothingItems(items || []);
    } catch (err) {
      console.error('Error fetching clothing items:', err);
      setErrorMessage('Unable to load clothing items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    setActiveCategory(cat);
    fetchItems(cat);
  }, [searchParams]);

  // Handle switching category tab
  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSearchParams(cat === 'all' ? {} : { category: cat });
  };

  // Toggle item selection
  const handleToggleSelect = (item) => {
    setSaveSuccess('');
    setSaveError('');
    setIsSaved(false);

    if (item.category === 'top') {
      setSelectedTop((prev) => (prev?.id === item.id ? null : item));
    } else if (item.category === 'bottom') {
      setSelectedBottom((prev) => (prev?.id === item.id ? null : item));
    } else if (item.category === 'shoes') {
      setSelectedShoes((prev) => (prev?.id === item.id ? null : item));
    }
  };

  // Check if an item is currently selected in its respective slot
  const isItemSelected = (item) => {
    if (item.category === 'top') return selectedTop?.id === item.id;
    if (item.category === 'bottom') return selectedBottom?.id === item.id;
    if (item.category === 'shoes') return selectedShoes?.id === item.id;
    return false;
  };

  // Calculate completeness
  const selectedCount = [selectedTop, selectedBottom, selectedShoes].filter(Boolean).length;
  const isComplete = selectedCount === 3;

  // Handle removing a slot
  const handleRemoveSlot = (category) => {
    setSaveSuccess('');
    setSaveError('');
    setIsSaved(false);
    if (category === 'top') setSelectedTop(null);
    if (category === 'bottom') setSelectedBottom(null);
    if (category === 'shoes') setSelectedShoes(null);
  };

  // Assign recommended item to slot
  const handleUseRecommendation = (item) => {
    setSaveSuccess('');
    setSaveError('');
    setIsSaved(false);

    if (item.category === 'top') {
      setSelectedTop(item);
    } else if (item.category === 'bottom') {
      setSelectedBottom(item);
    } else if (item.category === 'shoes') {
      setSelectedShoes(item);
    }
  };

  // Clear all selected slots
  const handleClearOutfit = () => {
    setSelectedTop(null);
    setSelectedBottom(null);
    setSelectedShoes(null);
    setSaveSuccess('');
    setSaveError('');
    setIsSaved(false);
    setOutfitScore(null);
    setScoringError('');
    setCompatibleItems([]);
    setAlternativeLooks([]);
  };

  // 1. EXACT OUTFIT MATCH SCORING (POST /api/recommendations/score/)
  // Only executed when all 3 items are selected. Receives real score from Django.
  useEffect(() => {
    let isCurrent = true;

    async function calculateScore() {
      if (!isComplete) {
        setOutfitScore(null);
        setScoringError('');
        return;
      }

      setIsScoring(true);
      setScoringError('');

      try {
        const scoreData = await getOutfitScore({
          top: selectedTop.id,
          bottom: selectedBottom.id,
          shoes: selectedShoes.id,
        });

        if (isCurrent && scoreData) {
          setOutfitScore({
            color: scoreData.color_match,
            style: scoreData.style_match,
            occasion: scoreData.occasion_match,
            overall: scoreData.overall_match,
          });
        }
      } catch (err) {
        console.error('Scoring error from Django:', err);
        if (isCurrent) {
          setScoringError('Unable to calculate match score for this combination.');
          setOutfitScore(null);
        }
      } finally {
        if (isCurrent) {
          setIsScoring(false);
        }
      }
    }

    calculateScore();

    return () => {
      isCurrent = false;
    };
  }, [selectedTop?.id, selectedBottom?.id, selectedShoes?.id, isComplete]);

  // 2. COMPLETE YOUR LOOK RECOMMENDATIONS (POST /api/recommendations/)
  // Fetches rule-based compatible pieces based on the primary selected item.
  useEffect(() => {
    let isCurrent = true;

    // Determine the anchor item: top > bottom > shoes
    const anchor = selectedTop || selectedBottom || selectedShoes;
    setRecAnchorItem(anchor);

    if (!anchor) {
      setCompatibleItems([]);
      setAlternativeLooks([]);
      return;
    }

    async function loadRecommendations() {
      setIsLoadingRecs(true);
      try {
        const data = await getRecommendations(anchor.id);
        if (!isCurrent) return;

        const compat = data?.compatible_items || [];
        // Filter out items already present in the active slots
        const activeIds = new Set(
          [selectedTop?.id, selectedBottom?.id, selectedShoes?.id].filter(Boolean)
        );
        const filteredCompat = compat.filter((item) => !activeIds.has(item.id));
        setCompatibleItems(filteredCompat);

        setAlternativeLooks(data?.recommendations || []);
      } catch (err) {
        console.debug('Failed to load compatible recommendations:', err.message);
        if (isCurrent) {
          setCompatibleItems([]);
          setAlternativeLooks([]);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingRecs(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      isCurrent = false;
    };
  }, [selectedTop?.id, selectedBottom?.id, selectedShoes?.id]);

  // Handle Save Outfit (POST /api/outfits/)
  const handleSaveOutfit = async () => {
    setSaveSuccess('');
    setSaveError('');

    if (!isComplete) {
      setSaveError('Please select a top, bottom, and shoes before saving.');
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    try {
      await saveOutfit({
        top: selectedTop.id,
        bottom: selectedBottom.id,
        shoes: selectedShoes.id,
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
        setSaveError('Your session has expired. Redirecting to login...');
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Your session has expired. Please log in again.' },
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

      <main className="outfitly-builder-container">
        {/* Header Breadcrumb & Title */}
        <div className="outfitly-builder-header">
          <div>
            <span className="outfitly-section-kicker">STUDIO WORKSPACE</span>
            <h1 className="outfitly-builder-title">Outfit Builder</h1>
            <p className="outfitly-builder-subtitle">
              Assemble your look by curating a top, bottom, and footwear from your collection.
            </p>
          </div>

          <div className="outfitly-builder-header-actions">
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleClearOutfit}
                className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
              >
                Reset Outfit
              </button>
            )}
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

        {randomNotice && (
          <div className="outfitly-alert outfitly-alert--info" role="status">
            <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Random Outfit Generator — Coming Soon in the next platform release.</span>
              <button
                type="button"
                className="outfitly-btn-link"
                onClick={() => setRandomNotice(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* =================================================================
            MAIN TWO-COLUMN WORKSPACE
            ================================================================= */}
        <div className="outfitly-builder-grid">
          {/* ===============================================================
              LEFT PANEL: "YOUR OUTFIT" (Sticky Preview Panel)
              =============================================================== */}
          <aside className="outfitly-outfit-panel" aria-label="Current outfit combination">
            <div className="outfitly-outfit-panel__header">
              <h2 className="outfitly-outfit-panel__title">Your Outfit</h2>
              <span
                className={`outfitly-completion-badge ${
                  isComplete ? 'outfitly-completion-badge--complete' : ''
                }`}
              >
                {isComplete ? '✓ Ready to Save' : `${selectedCount} of 3 Selected`}
              </span>
            </div>

            {/* Progress Bar */}
            <div
              className="outfitly-progress-bar"
              role="progressbar"
              aria-valuenow={selectedCount}
              aria-valuemin="0"
              aria-valuemax="3"
            >
              <div
                className="outfitly-progress-bar__fill"
                style={{ width: `${(selectedCount / 3) * 100}%` }}
              />
            </div>

            {/* The 3 Slots: TOP, BOTTOM, SHOES */}
            <div className="outfitly-slots-stack">
              {/* Slot 1: TOP */}
              <div className="outfitly-slot-wrapper">
                <div className="outfitly-slot-label-row">
                  <span className="outfitly-slot-label">TOP</span>
                  {selectedTop && (
                    <div className="outfitly-slot-actions">
                      <button
                        type="button"
                        onClick={() => handleCategoryChange('top')}
                        className="outfitly-slot-change-btn"
                        aria-label="Change selected top"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot('top')}
                        className="outfitly-slot-remove-btn"
                        aria-label="Remove selected top"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {selectedTop ? (
                  <div className="outfitly-slot-filled">
                    <div className="outfitly-slot-filled__image-wrap">
                      <img
                        src={getImageUrl(selectedTop.image)}
                        alt={selectedTop.name}
                        className="outfitly-slot-filled__image"
                      />
                    </div>
                    <div className="outfitly-slot-filled__info">
                      <h4 className="outfitly-slot-filled__name">{selectedTop.name}</h4>
                      <p className="outfitly-slot-filled__meta">
                        {selectedTop.color} • {selectedTop.style}
                      </p>
                      <div className="outfitly-slot-filled__badges">
                        <span className="outfitly-pill outfitly-pill--compact">
                          {selectedTop.occasion}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('top')}
                    className="outfitly-slot-empty"
                    aria-label="Empty top slot. Click to select a top"
                  >
                    <div className="outfitly-slot-empty__icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                      </svg>
                    </div>
                    <div className="outfitly-slot-empty__content">
                      <span className="outfitly-slot-empty__text">Select a Top</span>
                      <span className="outfitly-slot-empty__hint">T-Shirts, henleys & shirts</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Slot 2: BOTTOM */}
              <div className="outfitly-slot-wrapper">
                <div className="outfitly-slot-label-row">
                  <span className="outfitly-slot-label">BOTTOM</span>
                  {selectedBottom && (
                    <div className="outfitly-slot-actions">
                      <button
                        type="button"
                        onClick={() => handleCategoryChange('bottom')}
                        className="outfitly-slot-change-btn"
                        aria-label="Change selected bottom"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot('bottom')}
                        className="outfitly-slot-remove-btn"
                        aria-label="Remove selected bottom"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {selectedBottom ? (
                  <div className="outfitly-slot-filled">
                    <div className="outfitly-slot-filled__image-wrap">
                      <img
                        src={getImageUrl(selectedBottom.image)}
                        alt={selectedBottom.name}
                        className="outfitly-slot-filled__image"
                      />
                    </div>
                    <div className="outfitly-slot-filled__info">
                      <h4 className="outfitly-slot-filled__name">{selectedBottom.name}</h4>
                      <p className="outfitly-slot-filled__meta">
                        {selectedBottom.color} • {selectedBottom.style}
                      </p>
                      <div className="outfitly-slot-filled__badges">
                        <span className="outfitly-pill outfitly-pill--compact">
                          {selectedBottom.occasion}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('bottom')}
                    className="outfitly-slot-empty"
                    aria-label="Empty bottom slot. Click to select a bottom"
                  >
                    <div className="outfitly-slot-empty__icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 2h16v3l-2 15a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2l-1-10-1 10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 5V2z" />
                      </svg>
                    </div>
                    <div className="outfitly-slot-empty__content">
                      <span className="outfitly-slot-empty__text">Select a Bottom</span>
                      <span className="outfitly-slot-empty__hint">Trousers, pants & jeans</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Slot 3: SHOES */}
              <div className="outfitly-slot-wrapper">
                <div className="outfitly-slot-label-row">
                  <span className="outfitly-slot-label">SHOES</span>
                  {selectedShoes && (
                    <div className="outfitly-slot-actions">
                      <button
                        type="button"
                        onClick={() => handleCategoryChange('shoes')}
                        className="outfitly-slot-change-btn"
                        aria-label="Change selected shoes"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot('shoes')}
                        className="outfitly-slot-remove-btn"
                        aria-label="Remove selected shoes"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {selectedShoes ? (
                  <div className="outfitly-slot-filled">
                    <div className="outfitly-slot-filled__image-wrap">
                      <img
                        src={getImageUrl(selectedShoes.image)}
                        alt={selectedShoes.name}
                        className="outfitly-slot-filled__image"
                      />
                    </div>
                    <div className="outfitly-slot-filled__info">
                      <h4 className="outfitly-slot-filled__name">{selectedShoes.name}</h4>
                      <p className="outfitly-slot-filled__meta">
                        {selectedShoes.color} • {selectedShoes.style}
                      </p>
                      <div className="outfitly-slot-filled__badges">
                        <span className="outfitly-pill outfitly-pill--compact">
                          {selectedShoes.occasion}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('shoes')}
                    className="outfitly-slot-empty"
                    aria-label="Empty shoes slot. Click to select shoes"
                  >
                    <div className="outfitly-slot-empty__icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 17l2.5-4 4-1 6.5 1 5 4H2z" />
                        <path d="M20 17v3H2v-3" />
                      </svg>
                    </div>
                    <div className="outfitly-slot-empty__content">
                      <span className="outfitly-slot-empty__text">Select Shoes</span>
                      <span className="outfitly-slot-empty__hint">Sneakers, loafers & boots</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Match Score Section */}
            <div
              className={`outfitly-match-score-card ${
                outfitScore ? 'outfitly-match-score-card--active' : ''
              }`}
            >
              <div className="outfitly-match-score-card__header">
                <span className="outfitly-match-score-card__title">RECOMMENDATION MATCH</span>
                {isScoring && <LoadingSpinner size="small" />}
              </div>

              {isScoring && !outfitScore && (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <p className="outfitly-match-score-placeholder">Calculating algorithmic score...</p>
                </div>
              )}

              {!isScoring && outfitScore && (
                <div className="outfitly-match-score-card__body">
                  <div className="outfitly-match-score-hero">
                    <div className="outfitly-match-score-hero__meta">
                      <span className="outfitly-match-score-hero__label">Overall Match</span>
                      <span className="outfitly-match-score-hero__sub">
                        Rule-based algorithmic compatibility
                      </span>
                    </div>
                    <span className="outfitly-match-score-hero__metric">
                      {outfitScore.overall}%
                    </span>
                  </div>

                  <div className="outfitly-match-breakdown">
                    {/* Color Match Bar (40% Weight) */}
                    <div className="outfitly-breakdown-row">
                      <div className="outfitly-breakdown-row__header">
                        <span>Color Harmony (40%)</span>
                        <strong>{outfitScore.color}%</strong>
                      </div>
                      <div className="outfitly-score-track">
                        <div
                          className="outfitly-score-track__fill"
                          style={{ width: `${outfitScore.color}%` }}
                        />
                      </div>
                    </div>

                    {/* Style Match Bar (30% Weight) */}
                    <div className="outfitly-breakdown-row">
                      <div className="outfitly-breakdown-row__header">
                        <span>Style Coherence (30%)</span>
                        <strong>{outfitScore.style}%</strong>
                      </div>
                      <div className="outfitly-score-track">
                        <div
                          className="outfitly-score-track__fill"
                          style={{ width: `${outfitScore.style}%` }}
                        />
                      </div>
                    </div>

                    {/* Occasion Match Bar (30% Weight) */}
                    <div className="outfitly-breakdown-row">
                      <div className="outfitly-breakdown-row__header">
                        <span>Occasion Alignment (30%)</span>
                        <strong>{outfitScore.occasion}%</strong>
                      </div>
                      <div className="outfitly-score-track">
                        <div
                          className="outfitly-score-track__fill"
                          style={{ width: `${outfitScore.occasion}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="outfitly-match-score-source">
                    Verified Algorithmic Match • Rule-based (40/30/30)
                  </p>
                </div>
              )}

              {!isScoring && !outfitScore && (
                <div className="outfitly-match-score-incomplete">
                  <p className="outfitly-match-score-placeholder">
                    {scoringError || 'Complete your outfit to analyze the match.'}
                  </p>
                  <div className="outfitly-match-score-checklist">
                    <span
                      className={`outfitly-check-step ${
                        selectedTop ? 'outfitly-check-step--checked' : ''
                      }`}
                    >
                      {selectedTop ? '✓ Top' : '○ Top'}
                    </span>
                    <span
                      className={`outfitly-check-step ${
                        selectedBottom ? 'outfitly-check-step--checked' : ''
                      }`}
                    >
                      {selectedBottom ? '✓ Bottom' : '○ Bottom'}
                    </span>
                    <span
                      className={`outfitly-check-step ${
                        selectedShoes ? 'outfitly-check-step--checked' : ''
                      }`}
                    >
                      {selectedShoes ? '✓ Shoes' : '○ Shoes'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="outfitly-outfit-panel__actions">
              <Button
                type="button"
                variant="primary"
                size="large"
                fullWidth
                disabled={!isComplete || isSaving}
                isLoading={isSaving}
                onClick={handleSaveOutfit}
                className={isSaved ? 'outfitly-btn--saved' : ''}
              >
                {isSaved ? 'Saved ✓' : isSaving ? 'Saving...' : 'Save Outfit'}
              </Button>

              <button
                type="button"
                onClick={() => setRandomNotice(true)}
                className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
              >
                Generate Random Outfit
              </button>
            </div>
          </aside>

          {/* ===============================================================
              RIGHT PANEL: CLOTHING SELECTION AREA + COMPLETE YOUR LOOK
              =============================================================== */}
          <section className="outfitly-selection-area" aria-label="Clothing catalogue">
            {/* Category Tabs */}
            <div className="outfitly-category-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'all'}
                className={`outfitly-tab-btn ${
                  activeCategory === 'all' ? 'outfitly-tab-btn--active' : ''
                }`}
                onClick={() => handleCategoryChange('all')}
              >
                ALL ITEMS
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'top'}
                className={`outfitly-tab-btn ${
                  activeCategory === 'top' ? 'outfitly-tab-btn--active' : ''
                }`}
                onClick={() => handleCategoryChange('top')}
              >
                TOPS {selectedTop ? '✓' : ''}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'bottom'}
                className={`outfitly-tab-btn ${
                  activeCategory === 'bottom' ? 'outfitly-tab-btn--active' : ''
                }`}
                onClick={() => handleCategoryChange('bottom')}
              >
                BOTTOMS {selectedBottom ? '✓' : ''}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'shoes'}
                className={`outfitly-tab-btn ${
                  activeCategory === 'shoes' ? 'outfitly-tab-btn--active' : ''
                }`}
                onClick={() => handleCategoryChange('shoes')}
              >
                SHOES {selectedShoes ? '✓' : ''}
              </button>
            </div>

            {/* Active Category Meta */}
            <div className="outfitly-selection-meta">
              <span className="outfitly-selection-count">
                Showing {clothingItems.length} {clothingItems.length === 1 ? 'garment' : 'garments'}
              </span>
              <span className="outfitly-selection-hint">
                Click any garment to assign or replace in your outfit
              </span>
            </div>

            {/* Loading State: Skeletons */}
            {isLoading && (
              <div className="outfitly-clothing-grid">
                {[1, 2, 3, 4, 5, 6].map((key) => (
                  <div key={key} className="outfitly-clothing-skeleton">
                    <div className="outfitly-clothing-skeleton__image" />
                    <div className="outfitly-clothing-skeleton__line" style={{ width: '70%' }} />
                    <div className="outfitly-clothing-skeleton__line" style={{ width: '45%' }} />
                    <div className="outfitly-clothing-skeleton__line" style={{ width: '30%' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoading && errorMessage && (
              <div className="outfitly-builder-error-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h3 className="outfitly-builder-error-title">Unable to load clothing items.</h3>
                <p className="outfitly-builder-error-subtitle">
                  We could not reach the wardrobe catalogue. Please check your connection.
                </p>
                <button
                  type="button"
                  onClick={() => fetchItems(activeCategory)}
                  className="outfitly-btn outfitly-btn--primary"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !errorMessage && clothingItems.length === 0 && (
              <div className="outfitly-builder-empty-state">
                <div className="outfitly-builder-empty-state__icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="outfitly-builder-empty-title">No clothing items available.</h3>
                <p className="outfitly-builder-empty-subtitle">
                  {activeCategory === 'all'
                    ? 'No clothing items have been catalogued in the system yet.'
                    : `No active items found in the ${activeCategory} category.`}
                </p>
                {activeCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('all')}
                    className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
                  >
                    View All Categories
                  </button>
                )}
              </div>
            )}

            {/* Clothing Cards Grid */}
            {!isLoading && !errorMessage && clothingItems.length > 0 && (
              <div className="outfitly-clothing-grid">
                {clothingItems.map((item) => {
                  const selected = isItemSelected(item);

                  return (
                    <article
                      key={item.id}
                      onClick={() => handleToggleSelect(item)}
                      className={`outfitly-clothing-card ${
                        selected ? 'outfitly-clothing-card--selected' : ''
                      }`}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selected}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleSelect(item);
                        }
                      }}
                    >
                      {/* Product Image Area */}
                      <div className="outfitly-clothing-card__image-container">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="outfitly-clothing-card__image"
                          loading="lazy"
                        />

                        {/* Category Tag Top Left */}
                        <span className="outfitly-clothing-card__cat-badge">
                          {item.category.toUpperCase()}
                        </span>

                        {/* Selected Indicator Top Right */}
                        {selected && (
                          <span className="outfitly-clothing-card__selected-badge">
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Selected
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="outfitly-clothing-card__body">
                        <h3 className="outfitly-clothing-card__name">{item.name}</h3>

                        <div className="outfitly-clothing-card__details">
                          <span className="outfitly-clothing-card__color-style">
                            {item.color} • {item.style}
                          </span>
                          <span className="outfitly-pill outfitly-pill--compact">
                            {item.occasion}
                          </span>
                        </div>

                        <div className="outfitly-clothing-card__cta">
                          <span
                            className={`outfitly-select-label ${
                              selected ? 'outfitly-select-label--selected' : ''
                            }`}
                          >
                            {selected ? 'Remove from Outfit' : `Select as ${item.category}`}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* ===============================================================
                "COMPLETE YOUR LOOK" / RECOMMENDATIONS SECTION
                =============================================================== */}
            {recAnchorItem && (
              <section
                className="outfitly-complete-look-section"
                aria-label="Compatible clothing recommendations"
              >
                <div className="outfitly-complete-look__header">
                  <div>
                    <span className="outfitly-complete-look__kicker">RECOMMENDED FOR YOU</span>
                    <h3 className="outfitly-complete-look__title">Complete Your Look</h3>
                    <p className="outfitly-complete-look__subtitle">
                      Algorithmic pairings based on your selected{' '}
                      <strong>{recAnchorItem.name}</strong> ({recAnchorItem.color} • {recAnchorItem.style}).
                    </p>
                  </div>
                  {isLoadingRecs && <LoadingSpinner size="small" />}
                </div>

                {isLoadingRecs && compatibleItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                      Finding compatible garments from your wardrobe...
                    </p>
                  </div>
                ) : compatibleItems.length > 0 ? (
                  <div className="outfitly-complete-look__grid">
                    {compatibleItems.map((compItem) => {
                      const overallScore = compItem.score?.overall_match;
                      return (
                        <div key={compItem.id} className="outfitly-recommendation-card">
                          <div className="outfitly-recommendation-card__image-container">
                            <img
                              src={getImageUrl(compItem.image)}
                              alt={compItem.name}
                              className="outfitly-recommendation-card__image"
                              loading="lazy"
                            />
                            <span className="outfitly-recommendation-card__category-badge">
                              {compItem.category}
                            </span>
                            {overallScore && (
                              <span className="outfitly-recommendation-card__score-badge">
                                ★ {overallScore}%
                              </span>
                            )}
                          </div>

                          <div className="outfitly-recommendation-card__info">
                            <h4 className="outfitly-recommendation-card__name">
                              {compItem.name}
                            </h4>
                            <p className="outfitly-recommendation-card__meta">
                              {compItem.color} • {compItem.style}
                            </p>
                            <span
                              className="outfitly-pill outfitly-pill--compact"
                              style={{ alignSelf: 'flex-start' }}
                            >
                              {compItem.occasion}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUseRecommendation(compItem)}
                            className="outfitly-recommendation-card__btn"
                            aria-label={`Use ${compItem.name} as ${compItem.category}`}
                          >
                            + Use This
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '1rem 0', color: 'var(--color-text-secondary)' }}>
                    <p style={{ fontSize: '0.9rem' }}>
                      All recommended pairings for this piece are currently active in your outfit.
                    </p>
                  </div>
                )}
              </section>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default OutfitBuilder;
