import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClass = 'outfitly-btn';
  const variantClass = `outfitly-btn--${variant}`;
  const sizeClass = `outfitly-btn--${size}`;
  const fullWidthClass = fullWidth ? 'outfitly-btn--full' : '';
  const loadingClass = isLoading ? 'outfitly-btn--loading' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseClass} ${variantClass} ${sizeClass} ${fullWidthClass} ${loadingClass} ${className}`.trim()}
      {...props}
    >
      {isLoading ? (
        <span className="outfitly-btn__loader">
          <LoadingSpinner size={size === 'small' ? 'small' : 'medium'} />
          <span className="outfitly-btn__text outfitly-btn__text--loading">{children}</span>
        </span>
      ) : (
        <span className="outfitly-btn__text">{children}</span>
      )}
    </button>
  );
};

export default Button;
