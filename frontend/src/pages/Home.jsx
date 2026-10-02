import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { getClothingItems, getImageUrl } from '../services/api';
import authHeroImg from '../assets/images/auth-hero.jpg';

export const Home = () => {
  const navigate = useNavigate();
  const [clothingPreview, setClothingPreview] = useState({
    top: null,
    bottom: null,
    shoes: null,
  });
  const [allClothing, setAllClothing] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real clothing items for dynamic preview cards and category showcase
  useEffect(() => {
    let isMounted = true;

    async function loadPreviewItems() {
      try {
        const items = await getClothingItems();
        if (!isMounted) return;

        setAllClothing(items || []);

        // Pick items for hero composition
        const sampleTop = items.find((i) => i.category === 'top');
        const sampleBottom = items.find((i) => i.category === 'bottom');
        const sampleShoes = items.find((i) => i.category === 'shoes');

        setClothingPreview({
          top: sampleTop || null,
          bottom: sampleBottom || null,
          shoes: sampleShoes || null,
        });
      } catch (err) {
        console.error('Failed to load clothing items for home showcase:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPreviewItems();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleScrollToCategories = () => {
    const el = document.getElementById('clothing-categories');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/outfit-builder');
    }
  };

  return (
    <div className="outfitly-app-shell">
      <Navbar />

      <main className="outfitly-home-main">
        {/* =================================================================
            HERO SECTION: Pure Clothing Composition (Zero Models / Zero Mannequins)
            ================================================================= */}
        <section className="outfitly-home-hero-v2">
          <div className="outfitly-home-hero__content">
            <span className="outfitly-badge">WARDROBE SYNTHESIS</span>
            <h1 className="outfitly-home-hero__heading">
              Build your perfect outfit.
            </h1>
            <p className="outfitly-home-hero__subheading">
              Mix. Match. Discover your style.
            </p>
            <p className="outfitly-home-hero__description">
              Create outfits using your clothing collection and let Outfitly help you
              find combinations that work together — focusing purely on real garments.
            </p>

            <div className="outfitly-home-hero__actions">
              <Link
                to="/outfit-builder"
                className="outfitly-btn outfitly-btn--primary outfitly-btn--large"
              >
                Build an Outfit
              </Link>
              <button
                type="button"
                onClick={handleScrollToCategories}
                className="outfitly-btn outfitly-btn--outline outfitly-btn--large"
              >
                Explore Clothing
              </button>
            </div>

            <div className="outfitly-home-hero__micro-features">
              <div className="outfitly-feature-chip">
                <span className="outfitly-feature-dot" />
                Pure Garment Focus
              </div>
              <div className="outfitly-feature-chip">
                <span className="outfitly-feature-dot" />
                Category Matching
              </div>
              <div className="outfitly-feature-chip">
                <span className="outfitly-feature-dot" />
                Zero Mannequins
              </div>
            </div>
          </div>

          {/* Floating Clothing Trio Composition */}
          <div className="outfitly-home-hero__visual" aria-label="Clothing outfit showcase">
            <div className="outfitly-floating-outfit">
              {/* Background ambient texture card */}
              <div className="outfitly-floating-outfit__backdrop" />

              {/* Slot 1: Top Garment Card */}
              <div className="outfitly-floating-card outfitly-floating-card--top">
                <span className="outfitly-floating-card__category-badge">TOP</span>
                <div className="outfitly-floating-card__img-wrap">
                  {clothingPreview.top ? (
                    <img
                      src={getImageUrl(clothingPreview.top.image)}
                      alt={clothingPreview.top.name}
                      className="outfitly-floating-card__image"
                    />
                  ) : (
                    <div className="outfitly-floating-card__skeleton" />
                  )}
                </div>
                <div className="outfitly-floating-card__meta">
                  <h3 className="outfitly-floating-card__title">
                    {clothingPreview.top?.name || 'Mesh Henley T-Shirt'}
                  </h3>
                  <span className="outfitly-floating-card__tag">
                    {clothingPreview.top?.color || 'Gray'} • {clothingPreview.top?.style || 'Minimal'}
                  </span>
                </div>
              </div>

              {/* Slot 2: Bottom Garment Card */}
              <div className="outfitly-floating-card outfitly-floating-card--bottom">
                <span className="outfitly-floating-card__category-badge">BOTTOM</span>
                <div className="outfitly-floating-card__img-wrap">
                  {clothingPreview.bottom ? (
                    <img
                      src={getImageUrl(clothingPreview.bottom.image)}
                      alt={clothingPreview.bottom.name}
                      className="outfitly-floating-card__image"
                    />
                  ) : (
                    <div className="outfitly-floating-card__skeleton" />
                  )}
                </div>
                <div className="outfitly-floating-card__meta">
                  <h3 className="outfitly-floating-card__title">
                    {clothingPreview.bottom?.name || 'Trekking Pants'}
                  </h3>
                  <span className="outfitly-floating-card__tag">
                    {clothingPreview.bottom?.color || 'Blue'} • {clothingPreview.bottom?.style || 'Minimal'}
                  </span>
                </div>
              </div>

              {/* Slot 3: Shoes Card */}
              <div className="outfitly-floating-card outfitly-floating-card--shoes">
                <span className="outfitly-floating-card__category-badge">SHOES</span>
                <div className="outfitly-floating-card__img-wrap">
                  {clothingPreview.shoes ? (
                    <img
                      src={getImageUrl(clothingPreview.shoes.image)}
                      alt={clothingPreview.shoes.name}
                      className="outfitly-floating-card__image"
                    />
                  ) : (
                    <div className="outfitly-floating-card__skeleton" />
                  )}
                </div>
                <div className="outfitly-floating-card__meta">
                  <h3 className="outfitly-floating-card__title">
                    {clothingPreview.shoes?.name || 'Trekking Shoes'}
                  </h3>
                  <span className="outfitly-floating-card__tag">
                    {clothingPreview.shoes?.color || 'Yellow'} • {clothingPreview.shoes?.style || 'Casual'}
                  </span>
                </div>
              </div>

              {/* Floating Match Status Pill */}
              <div className="outfitly-floating-status-pill">
                <span className="outfitly-status-indicator" />
                <span>3 of 3 Items Combined</span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            QUICK ACTIONS SECTION
            ================================================================= */}
        <section className="outfitly-home-section">
          <div className="outfitly-section-header">
            <span className="outfitly-section-kicker">WORKFLOW</span>
            <h2 className="outfitly-section-title">Quick Actions</h2>
            <p className="outfitly-section-subtitle">
              Jump straight into wardrobe pairing, combinations, or review your curated styles.
            </p>
          </div>

          <div className="outfitly-actions-grid">
            {/* Card 1: Build an Outfit */}
            <div className="outfitly-action-card">
              <div className="outfitly-action-card__icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="outfitly-action-card__title">Build an Outfit</h3>
              <p className="outfitly-action-card__description">
                Create a complete look by selecting a top, bottom and shoes.
              </p>
              <Link
                to="/outfit-builder"
                className="outfitly-btn outfitly-btn--primary outfitly-btn--full"
              >
                Start Building
              </Link>
            </div>

            {/* Card 2: Random Outfit */}
            <div className="outfitly-action-card">
              <div className="outfitly-action-card__icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </div>
              <h3 className="outfitly-action-card__title">Random Outfit</h3>
              <p className="outfitly-action-card__description">
                Let Outfitly create a random combination from your wardrobe.
              </p>
              <button
                type="button"
                onClick={() => navigate('/outfit-builder?action=random')}
                className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
              >
                Generate Outfit
              </button>
            </div>

            {/* Card 3: Saved Outfits */}
            <div className="outfitly-action-card">
              <div className="outfitly-action-card__icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="outfitly-action-card__title">Saved Outfits</h3>
              <p className="outfitly-action-card__description">
                View the outfits you have saved and revisit favorite combinations.
              </p>
              <Link
                to="/saved-outfits"
                className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
              >
                View Saved
              </Link>
            </div>

            {/* Card 4: Recommendations */}
            <div className="outfitly-action-card">
              <div className="outfitly-action-card__icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h3 className="outfitly-action-card__title">Recommendations</h3>
              <p className="outfitly-action-card__description">
                Find clothing combinations that match your selected item.
              </p>
              <Link
                to="/outfit-builder?tab=recommendations"
                className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
              >
                Explore Matches
              </Link>
            </div>
          </div>
        </section>

        {/* =================================================================
            CLOTHING CATEGORIES SECTION ("Explore Your Clothing")
            ================================================================= */}
        <section id="clothing-categories" className="outfitly-home-section">
          <div className="outfitly-section-header">
            <span className="outfitly-section-kicker">COLLECTION</span>
            <h2 className="outfitly-section-title">Explore Your Clothing</h2>
            <p className="outfitly-section-subtitle">
              Browse your digital wardrobe by category to find key pieces for your look.
            </p>
          </div>

          <div className="outfitly-category-grid">
            {/* Category: TOPS */}
            <div className="outfitly-category-card">
              <div className="outfitly-category-card__image-container">
                {clothingPreview.top ? (
                  <img
                    src={getImageUrl(clothingPreview.top.image)}
                    alt="Tops collection"
                    className="outfitly-category-card__image"
                  />
                ) : (
                  <div className="outfitly-category-card__placeholder">
                    <span>TOPS</span>
                  </div>
                )}
                <span className="outfitly-category-card__badge">Category</span>
              </div>
              <div className="outfitly-category-card__body">
                <h3 className="outfitly-category-card__title">TOPS</h3>
                <p className="outfitly-category-card__description">
                  Find the perfect shirt, tee, or knitwear for any occasion.
                </p>
                <Link
                  to="/outfit-builder?category=top"
                  className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
                >
                  Explore Tops
                </Link>
              </div>
            </div>

            {/* Category: BOTTOMS */}
            <div className="outfitly-category-card">
              <div className="outfitly-category-card__image-container">
                {clothingPreview.bottom ? (
                  <img
                    src={getImageUrl(clothingPreview.bottom.image)}
                    alt="Bottoms collection"
                    className="outfitly-category-card__image"
                  />
                ) : (
                  <div className="outfitly-category-card__placeholder">
                    <span>BOTTOMS</span>
                  </div>
                )}
                <span className="outfitly-category-card__badge">Category</span>
              </div>
              <div className="outfitly-category-card__body">
                <h3 className="outfitly-category-card__title">BOTTOMS</h3>
                <p className="outfitly-category-card__description">
                  Explore tailored trousers, jeans, chinos, and pants.
                </p>
                <Link
                  to="/outfit-builder?category=bottom"
                  className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
                >
                  Explore Bottoms
                </Link>
              </div>
            </div>

            {/* Category: SHOES */}
            <div className="outfitly-category-card">
              <div className="outfitly-category-card__image-container">
                {clothingPreview.shoes ? (
                  <img
                    src={getImageUrl(clothingPreview.shoes.image)}
                    alt="Shoes collection"
                    className="outfitly-category-card__image"
                  />
                ) : (
                  <div className="outfitly-category-card__placeholder">
                    <span>SHOES</span>
                  </div>
                )}
                <span className="outfitly-category-card__badge">Category</span>
              </div>
              <div className="outfitly-category-card__body">
                <h3 className="outfitly-category-card__title">SHOES</h3>
                <p className="outfitly-category-card__description">
                  Complete your outfit with loafers, boots, or minimal sneakers.
                </p>
                <Link
                  to="/outfit-builder?category=shoes"
                  className="outfitly-btn outfitly-btn--outline outfitly-btn--full"
                >
                  Explore Shoes
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Editorial Callout */}
        <section className="outfitly-home-curation-banner">
          <div className="outfitly-curation-banner__inner">
            <span className="outfitly-hero-badge">THE OUTFITLY PHILOSOPHY</span>
            <blockquote className="outfitly-curation-banner__quote">
              “Clothing has its own architecture, rhythm, and color weight.
              We match garments based on pure textile harmony.”
            </blockquote>
            <p className="outfitly-curation-banner__caption">
              No human avatars. No generic models. Only pure clothing curation.
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <Link
                to="/outfit-builder"
                className="outfitly-btn outfitly-btn--primary outfitly-btn--large"
              >
                Launch Outfit Builder
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Brand Footer */}
      <footer className="outfitly-footer">
        <div className="outfitly-footer__container">
          <div className="outfitly-footer__brand">
            <div className="outfitly-nav__brand">
              <span className="outfitly-logo-mark">O</span>
              <span className="outfitly-brand-name">OUTFITLY</span>
            </div>
            <p className="outfitly-footer__tagline">
              Curated Wardrobe Intelligence. Build your style, one outfit at a time.
            </p>
          </div>

          <div className="outfitly-footer__meta">
            <span className="outfitly-footer__copy">
              &copy; {new Date().getFullYear()} Outfitly. All rights reserved.
            </span>
            <span className="outfitly-footer__notice">
              Strictly pure garment previews • Zero mannequins • Zero models
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
