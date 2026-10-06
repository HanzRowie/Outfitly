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

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
 * Fetch a single saved outfit by ID.
 * Endpoint: GET /api/outfits/<outfit_id>/
 */
export async function getOutfit(outfitId) {
  return request(`/api/outfits/${outfitId}/`, { method: 'GET' });
}

/**
 * Update an existing saved outfit.
 * Endpoint: PATCH /api/outfits/<outfit_id>/
 * Body: { top: topId, bottom: bottomId, shoes: shoesId }
 */
export async function updateOutfit(outfitId, { top, bottom, shoes }) {
  return request(`/api/outfits/${outfitId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      top,
      bottom,
      shoes,
    }),
  });
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

/**
 * Generate a randomized curated outfit with rule-based match scores.
 * Endpoint: GET /api/generator/random/
 */
export async function getRandomOutfit() {
  return request('/api/generator/random/', {
    method: 'GET',
    requiresAuth: false,
  });
}

/**
 * Fetch authenticated user's profile.
 * Endpoint: GET /api/accounts/profile/
 */
export async function getUserProfile() {
  return request('/api/accounts/profile/', {
    method: 'GET',
  });
}

/**
 * Update authenticated user's profile.
 * Endpoint: PATCH /api/accounts/profile/
 * Accepts either a plain object (JSON) for text updates or FormData for multipart/form-data with profile picture.
 */
export async function updateUserProfile(data) {
  const isFormData = data instanceof FormData;
  return request('/api/accounts/profile/', {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  });
}

/**
 * Fetch list of other users available to add as friends.
 * Endpoint: GET /api/friends/users/
 */
export async function getFriendUsers() {
  return request('/api/friends/users/', { method: 'GET' });
}

/**
 * Send a friend request to a user.
 * Endpoint: POST /api/friends/requests/send/
 * Body: { receiver: userId }
 */
export async function sendFriendRequest(receiverId) {
  return request('/api/friends/requests/send/', {
    method: 'POST',
    body: JSON.stringify({ receiver: receiverId }),
  });
}

/**
 * Fetch incoming and outgoing friend requests.
 * Endpoint: GET /api/friends/requests/
 */
export async function getFriendRequests() {
  return request('/api/friends/requests/', { method: 'GET' });
}

/**
 * Respond to an incoming friend request (accept or reject).
 * Endpoint: PATCH /api/friends/requests/<id>/
 * Body: { action: 'accept' | 'reject' }
 */
export async function respondFriendRequest(requestId, action) {
  return request(`/api/friends/requests/${requestId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

/**
 * Fetch all conversations for the authenticated user.
 * Endpoint: GET /api/chat/conversations/
 */
export async function getConversations() {
  return request('/api/chat/conversations/', { method: 'GET' });
}

/**
 * Get or create a conversation with a friend.
 * Endpoint: POST /api/chat/conversations/
 * Body: { friend_id: number }
 */
export async function createOrGetConversation(friendId) {
  return request('/api/chat/conversations/', {
    method: 'POST',
    body: JSON.stringify({ friend_id: friendId }),
  });
}

/**
 * Fetch messages for a specific conversation.
 * Endpoint: GET /api/chat/conversations/<id>/messages/
 */
export async function getConversationMessages(conversationId) {
  return request(`/api/chat/conversations/${conversationId}/messages/`, {
    method: 'GET',
  });
}

export { API_BASE_URL };



