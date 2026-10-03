/**
 * API service for communicating with the Django REST Framework backend.
 * Uses native fetch for lightweight, modern HTTP requests.
 */

import { getAccessToken, clearAuthData } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Normalizes an image path from Django into a fully qualified URL.
 * Handles both relative '/clothing/...' and absolute 'http://...' URLs.
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Normalizes backend error responses into user-friendly messages.
 * Handles string errors, array errors, and nested dictionary errors from DRF.
 */
const parseErrorMessage = (data, status) => {
  if (!data) {
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 500) return 'Server error. Please try again later.';
    return 'An unexpected error occurred. Please try again.';
  }

  // If backend returns a direct { "error": "..." }
  if (data.error && typeof data.error === 'string') {
    return data.error;
  }

  // If backend returns { "detail": "..." }
  if (data.detail && typeof data.detail === 'string') {
    return data.detail;
  }

  // If backend returns { "message": "..." }
  if (data.message && typeof data.message === 'string') {
    return data.message;
  }

  // If DRF returns field errors or non_field_errors dictionary
  if (typeof data === 'object') {
    const errorMessages = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        const text = value.join(' ');
        errorMessages.push(key === 'non_field_errors' ? text : `${key}: ${text}`);
      } else if (typeof value === 'string') {
        errorMessages.push(key === 'non_field_errors' ? value : `${key}: ${value}`);
      }
    }
    if (errorMessages.length > 0) {
      return errorMessages.join(' ');
    }
  }

  return 'Operation failed. Please verify your information and try again.';
};

/**
 * Generic request helper wrapping fetch with standard headers and error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const shouldAttachAuth = options.requiresAuth !== false;
  const token = shouldAttachAuth ? (options.token || getAccessToken()) : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      if (response.status === 401 && shouldAttachAuth) {
        clearAuthData();
      }
      const errorMessage = parseErrorMessage(data, response.status);
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    const networkError = new Error(
      'Unable to connect to the server. Please ensure the backend is running at ' + API_BASE_URL
    );
    networkError.isNetworkError = true;
    throw networkError;
  }
}

/**
 * Register a new user account.
 * Endpoint: POST /api/accounts/register/
 */
export async function registerUser({ email, username, password, confirm_password }) {
  return request('/api/accounts/register/', {
    method: 'POST',
    body: JSON.stringify({
      email,
      username,
      password,
      confirm_password,
    }),
  });
}

/**
 * Verify email using the 6-digit OTP sent to user's inbox.
 * Endpoint: POST /api/accounts/verify-otp/
 */
export async function verifyOTP({ email, otp }) {
  return request('/api/accounts/verify-otp/', {
    method: 'POST',
    body: JSON.stringify({
      email,
      otp,
    }),
  });
}

/**
 * Resend OTP to user's email address.
 * Endpoint: POST /api/accounts/resend-otp/
 */
export async function resendOTP({ email }) {
  return request('/api/accounts/resend-otp/', {
    method: 'POST',
    body: JSON.stringify({
      email,
    }),
  });
}

/**
 * Log in an existing user with email and password.
 * Endpoint: POST /api/accounts/login/
 */
export async function loginUser({ email, password }) {
  return request('/api/accounts/login/', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

/**
 * Fetch clothing items with optional category or filter queries.
 * Endpoint: GET /api/clothing/?category=...
 */
export async function getClothingItems(category = null, filters = {}) {
  const params = new URLSearchParams();
  if (category) {
    params.append('category', category);
  }
  if (filters.occasion) {
    params.append('occasion', filters.occasion);
  }
  if (filters.color) {
    params.append('color', filters.color);
  }
  if (filters.style) {
    params.append('style', filters.style);
  }

  const queryString = params.toString();
  const endpoint = `/api/clothing/${queryString ? `?${queryString}` : ''}`;
  return request(endpoint, { method: 'GET', requiresAuth: false });
}

/**
 * Save an assembled outfit.
 * Endpoint: POST /api/outfits/
 * Body: { top: topId, bottom: bottomId, shoes: shoesId }
 */
export async function saveOutfit({ top, bottom, shoes }) {
  return request('/api/outfits/', {
    method: 'POST',
    body: JSON.stringify({
      top,
      bottom,
      shoes,
    }),
  });
}

/**
 * Fetch user's saved outfits.
 * Endpoint: GET /api/outfits/
 */
export async function getSavedOutfits() {
  return request('/api/outfits/', { method: 'GET' });
}

/**
 * Calculate the exact rule-based score for an assembled outfit (top + bottom + shoes).
 * Endpoint: POST /api/recommendations/score/
 * Body: { top: topId, bottom: bottomId, shoes: shoesId }
 */
export async function getOutfitScore({ top, bottom, shoes }) {
  return request('/api/recommendations/score/', {
    method: 'POST',
    requiresAuth: false,
    body: JSON.stringify({
      top,
      bottom,
      shoes,
    }),
  });
}

/**
 * Fetch complete outfit recommendations and compatible items based on a selected clothing item.
 * Endpoint: POST /api/recommendations/
 * Body: { item_id: itemId, target_category?: string }
 */
export async function getRecommendations(itemId, targetCategory = null) {
  const payload = { item_id: itemId };
  if (targetCategory) {
    payload.target_category = targetCategory;
  }
  return request('/api/recommendations/', {
    method: 'POST',
    requiresAuth: false,
    body: JSON.stringify(payload),
  });
}

export { API_BASE_URL };

