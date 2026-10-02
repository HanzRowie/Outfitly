import React from 'react';
import { Link } from 'react-router-dom';
import authHeroImg from '../../assets/images/auth-hero.jpg';

export const AuthLayout = ({ children, title, subtitle, badgeText = 'CURATED WARDROBE SYSTEM' }) => {
  return (
    <div className="outfitly-auth-page">
      <div className="outfitly-auth-container">
        {/* Left Side: Brand Visual Experience */}
        <aside className="outfitly-auth-hero" aria-label="Brand showcase">
          <div className="outfitly-auth-hero__bg">
            <img
              src={authHeroImg}
              alt="Flat lay of folded designer clothing items, knitwear, trousers, and leather sneakers"
              className="outfitly-auth-hero__image"
              loading="eager"
            />
            <div className="outfitly-auth-hero__overlay" />
          </div>

          <div className="outfitly-auth-hero__content">
            <div className="outfitly-auth-hero__top">
              <Link to="/login" className="outfitly-hero-brand">
                <span className="outfitly-hero-brand__mark">O</span>
                <span className="outfitly-hero-brand__name">OUTFITLY</span>
              </Link>
              <span className="outfitly-hero-badge">{badgeText}</span>
            </div>

            <div className="outfitly-auth-hero__quote">
              <blockquote className="outfitly-tagline">
                “Build your style.
                <br />
                One outfit at a time.”
              </blockquote>
              <p className="outfitly-subtagline">
                Intelligent color harmonies, texture pairings, and wardrobe curation — focused purely on clothing.
              </p>
            </div>

            <div className="outfitly-auth-hero__footer">
              <div className="outfitly-pill-list">
                <span className="outfitly-pill">Capsule Wardrobe</span>
                <span className="outfitly-pill">Color Harmony</span>
                <span className="outfitly-pill">Garment Matching</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Form Card Area */}
        <main className="outfitly-auth-form-side">
          <div className="outfitly-auth-card">
            {/* Mobile Header */}
            <div className="outfitly-mobile-brand">
              <Link to="/login" className="outfitly-mobile-brand__link">
                <span className="outfitly-mobile-brand__mark">O</span>
                <span className="outfitly-mobile-brand__text">OUTFITLY</span>
              </Link>
            </div>

            <header className="outfitly-auth-header">
              <h1 className="outfitly-auth-title">{title}</h1>
              {subtitle && <p className="outfitly-auth-subtitle">{subtitle}</p>}
            </header>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
