import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { getSavedOutfits, getClothingItems, getImageUrl } from '../services/api';

export const SavedOutfits = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [savedOutfits, setSavedOutfits] = useState([]);
  const [clothingMap, setClothingMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

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
              const createdDate = outfit.created_at ? new Date(outfit.created_at).toLocaleDateString() : '';

              return (
                <div key={outfit.id} className="outfitly-saved-card">
                  <div className="outfitly-saved-card__header">
                    <span className="outfitly-saved-card__id">Outfit #{outfit.id}</span>
                    {createdDate && <span className="outfitly-saved-card__date">{createdDate}</span>}
                  </div>

                  {/* 3 Garment Items Row */}
                  <div className="outfitly-saved-card__garments">
                    {/* Top */}
                    <div className="outfitly-saved-item">
                      <span className="outfitly-saved-item__badge">TOP</span>
                      <div className="outfitly-saved-item__img-wrap">
                        {topItem?.image ? (
                          <img
                            src={getImageUrl(topItem.image)}
                            alt={topItem.name}
                            className="outfitly-saved-item__image"
                          />
                        ) : (
                          <div className="outfitly-saved-item__fallback">Top</div>
                        )}
                      </div>
                      <span className="outfitly-saved-item__name">{topItem?.name || `Item #${outfit.top}`}</span>
                    </div>

                    {/* Bottom */}
                    <div className="outfitly-saved-item">
                      <span className="outfitly-saved-item__badge">BOTTOM</span>
                      <div className="outfitly-saved-item__img-wrap">
                        {bottomItem?.image ? (
                          <img
                            src={getImageUrl(bottomItem.image)}
                            alt={bottomItem.name}
                            className="outfitly-saved-item__image"
                          />
                        ) : (
                          <div className="outfitly-saved-item__fallback">Bottom</div>
                        )}
                      </div>
                      <span className="outfitly-saved-item__name">{bottomItem?.name || `Item #${outfit.bottom}`}</span>
                    </div>

                    {/* Shoes */}
                    <div className="outfitly-saved-item">
                      <span className="outfitly-saved-item__badge">SHOES</span>
                      <div className="outfitly-saved-item__img-wrap">
                        {shoesItem?.image ? (
                          <img
                            src={getImageUrl(shoesItem.image)}
                            alt={shoesItem.name}
                            className="outfitly-saved-item__image"
                          />
                        ) : (
                          <div className="outfitly-saved-item__fallback">Shoes</div>
                        )}
                      </div>
                      <span className="outfitly-saved-item__name">{shoesItem?.name || `Item #${outfit.shoes}`}</span>
                    </div>
                  </div>

                  {/* Card Actions: Edit Outfit */}
                  <div className="outfitly-saved-card__actions">
                    <button
                      type="button"
                      onClick={() => handleEditOutfit(outfit, topItem, bottomItem, shoesItem)}
                      className="outfitly-btn outfitly-btn--outline outfitly-btn--small outfitly-btn--full"
                      aria-label={`Edit Outfit #${outfit.id}`}
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
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Outfit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SavedOutfits;
