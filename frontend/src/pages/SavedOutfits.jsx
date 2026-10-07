import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { getSavedOutfits, getClothingItems, getImageUrl, deleteOutfit } from '../services/api';

export const SavedOutfits = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [savedOutfits, setSavedOutfits] = useState([]);
  const [clothingMap, setClothingMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [deletingId, setDeletingId] = useState(null);

  // Dismiss flash message after a delay if set
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [outfitsData, clothingData] = await Promise.all([
        getSavedOutfits(),
        getClothingItems(),
      ]);

      // Build lookup map for clothing items by ID
      const map = {};
      (clothingData || []).forEach((item) => {
        map[item.id] = item;
      });

      setClothingMap(map);
      setSavedOutfits(outfitsData || []);
    } catch (err) {
      console.error('Failed to load saved outfits:', err);
      setErrorMessage('Unable to load saved outfits.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [location.key]);

  // Navigate to Outfit Builder in edit mode with current outfit and resolved items
  const handleEditOutfit = (outfit, topItem, bottomItem, shoesItem) => {
    navigate(`/outfit-builder?edit=${outfit.id}`, {
      state: {
        editOutfit: outfit,
        initialTop: topItem,
        initialBottom: bottomItem,
        initialShoes: shoesItem,
      },
    });
  };

  // Delete saved outfit
  const handleDeleteOutfit = async (outfitId) => {
    if (
      !window.confirm(
        `Are you sure you want to delete Look N° ${String(outfitId).padStart(2, '0')} from your archive?`
      )
    ) {
      return;
    }

    setDeletingId(outfitId);
    setErrorMessage('');
    try {
      await deleteOutfit(outfitId);
      setSavedOutfits((prev) => prev.filter((o) => o.id !== outfitId));
      setSuccessMessage(`Look N° ${String(outfitId).padStart(2, '0')} deleted successfully.`);
    } catch (err) {
      console.error('Failed to delete outfit:', err);
      setErrorMessage(err.message || 'Unable to delete outfit. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="outfitly-app-shell">
      <Navbar />

      <main className="outfitly-saved-container">
        <div className="outfitly-builder-header">
          <div>
            <span className="outfitly-section-kicker">WARDROBE ARCHIVE</span>
            <h1 className="outfitly-builder-title">Saved Outfits</h1>
            <p className="outfitly-builder-subtitle">
              Your personalized collection of curated tops, bottoms, and footwear pairings.
            </p>
          </div>

          <Link to="/outfit-builder" className="outfitly-btn outfitly-btn--primary">
            + Build New Outfit
          </Link>
        </div>

        {/* Success Feedback Alert */}
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

        {/* Loading State */}
        {isLoading && (
          <div className="outfitly-splash-loader" style={{ minHeight: '300px' }}>
            <LoadingSpinner size="large" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="outfitly-alert outfitly-alert--error" role="alert">
            <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && savedOutfits.length === 0 && (
          <div className="outfitly-builder-empty-state" style={{ padding: '4rem 2rem' }}>
            <div className="outfitly-builder-empty-state__icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="outfitly-builder-empty-title">No saved outfits yet.</h3>
            <p className="outfitly-builder-empty-subtitle">
              Use the Outfit Builder to select a top, bottom, and shoes, then save your favorite looks here.
            </p>
            <div style={{ marginTop: '1.25rem' }}>
              <Link to="/outfit-builder" className="outfitly-btn outfitly-btn--primary">
                Start Building Now
              </Link>
            </div>
          </div>
        )}

        {/* Saved Outfits Grid */}
        {!isLoading && !errorMessage && savedOutfits.length > 0 && (
          <div className="outfitly-saved-grid">
            {savedOutfits.map((outfit) => {
              const topItem = typeof outfit.top === 'object' ? outfit.top : clothingMap[outfit.top];
              const bottomItem = typeof outfit.bottom === 'object' ? outfit.bottom : clothingMap[outfit.bottom];
              const shoesItem = typeof outfit.shoes === 'object' ? outfit.shoes : clothingMap[outfit.shoes];
              const createdDate = outfit.created_at
                ? new Date(outfit.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '';

              return (
                <article key={outfit.id} className="outfitly-saved-card">
                  {/* Editorial Card Header */}
                  <div className="outfitly-saved-card__header">
                    <div className="outfitly-saved-card__id-group">
                      <span className="outfitly-saved-card__edition">LOOKBOOK ENTRY</span>
                      <h3 className="outfitly-saved-card__id">LOOK N° {String(outfit.id).padStart(2, '0')}</h3>
                    </div>
                    {createdDate && (
                      <span className="outfitly-saved-card__date">{createdDate}</span>
                    )}
                  </div>

                  {/* 3-Piece Curated Triptych (TOP + BOTTOM + SHOES) */}
                  <div className="outfitly-saved-card__triptych">
                    {/* Item 1: TOP */}
                    <div className="outfitly-saved-slot">
                      <div className="outfitly-saved-slot__frame">
                        <span className="outfitly-saved-slot__tag">01 / TOP</span>
                        <div className="outfitly-saved-slot__img-wrap">
                          {topItem?.image ? (
                            <img
                              src={getImageUrl(topItem.image)}
                              alt={topItem.name}
                              className="outfitly-saved-slot__img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="outfitly-saved-slot__fallback">Top Item</div>
                          )}
                        </div>
                      </div>
                      <div className="outfitly-saved-slot__meta">
                        <h4 className="outfitly-saved-slot__name">{topItem?.name || `Top #${outfit.top}`}</h4>
                        <p className="outfitly-saved-slot__details">
                          {topItem ? `${topItem.color} • ${topItem.style}` : 'Curated Garment'}
                        </p>
                      </div>
                    </div>

                    {/* Item 2: BOTTOM */}
                    <div className="outfitly-saved-slot">
                      <div className="outfitly-saved-slot__frame">
                        <span className="outfitly-saved-slot__tag">02 / BOTTOM</span>
                        <div className="outfitly-saved-slot__img-wrap">
                          {bottomItem?.image ? (
                            <img
                              src={getImageUrl(bottomItem.image)}
                              alt={bottomItem.name}
                              className="outfitly-saved-slot__img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="outfitly-saved-slot__fallback">Bottom Item</div>
                          )}
                        </div>
                      </div>
                      <div className="outfitly-saved-slot__meta">
                        <h4 className="outfitly-saved-slot__name">{bottomItem?.name || `Bottom #${outfit.bottom}`}</h4>
                        <p className="outfitly-saved-slot__details">
                          {bottomItem ? `${bottomItem.color} • ${bottomItem.style}` : 'Curated Garment'}
                        </p>
                      </div>
                    </div>

                    {/* Item 3: SHOES */}
                    <div className="outfitly-saved-slot">
                      <div className="outfitly-saved-slot__frame">
                        <span className="outfitly-saved-slot__tag">03 / FOOTWEAR</span>
                        <div className="outfitly-saved-slot__img-wrap">
                          {shoesItem?.image ? (
                            <img
                              src={getImageUrl(shoesItem.image)}
                              alt={shoesItem.name}
                              className="outfitly-saved-slot__img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="outfitly-saved-slot__fallback">Footwear</div>
                          )}
                        </div>
                      </div>
                      <div className="outfitly-saved-slot__meta">
                        <h4 className="outfitly-saved-slot__name">{shoesItem?.name || `Shoes #${outfit.shoes}`}</h4>
                        <p className="outfitly-saved-slot__details">
                          {shoesItem ? `${shoesItem.color} • ${shoesItem.style}` : 'Curated Garment'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Editorial Card Footer */}
                  <div className="outfitly-saved-card__footer">
                    <span className="outfitly-saved-card__pill">3-Piece Ensemble</span>
                    <div className="outfitly-saved-card__actions">
                      <button
                        type="button"
                        onClick={() => handleEditOutfit(outfit, topItem, bottomItem, shoesItem)}
                        className="outfitly-btn outfitly-btn--outline outfitly-btn--small outfitly-saved-card__edit-btn"
                        aria-label={`Edit Outfit #${outfit.id}`}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginRight: '0.4rem' }}
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit in Studio
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteOutfit(outfit.id)}
                        disabled={deletingId === outfit.id}
                        className="outfitly-btn outfitly-btn--outline outfitly-btn--small outfitly-saved-card__delete-btn"
                        aria-label={`Delete Outfit #${outfit.id}`}
                        title="Delete this look from archive"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginRight: deletingId === outfit.id ? 0 : '0.4rem' }}
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        {deletingId === outfit.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SavedOutfits;
