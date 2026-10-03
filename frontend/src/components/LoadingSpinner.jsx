import React from 'react';

export const LoadingSpinner = ({ size = 'medium', color = 'current' }) => {
  const sizeMap = {
    small: '16px',
    medium: '20px',
    large: '28px',
  };

  const dimension = sizeMap[size] || sizeMap.medium;

  return (
    <span
      className="inline-spinner"
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: dimension,
        height: dimension,
        border: '2px solid rgba(0, 0, 0, 0.15)',
        borderTopColor: color === 'current' ? 'currentColor' : color,
        borderRadius: '50%',
        animation: 'spin 0.65s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        verticalAlign: 'middle',
      }}
    />
  );
};

export default LoadingSpinner;
