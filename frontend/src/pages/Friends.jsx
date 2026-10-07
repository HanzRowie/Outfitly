import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getFriendUsers,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  createOrGetConversation,
  getImageUrl,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Friends = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();

  const currentTab = searchParams.get('tab') || 'add';
  const [activeTab, setActiveTab] = useState(
    ['add', 'requests', 'friends'].includes(currentTab) ? currentTab : 'add'
  );

  // Data states
  const [users, setUsers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [messagingFriendId, setMessagingFriendId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch initial data (users + friend requests)
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [usersData, requestsData] = await Promise.all([
        getFriendUsers(),
        getFriendRequests(),
      ]);

      setUsers(usersData || []);
      setIncomingRequests(requestsData?.incoming || []);
      setOutgoingRequests(requestsData?.outgoing || []);
    } catch (err) {
      console.error('Failed to load friends data:', err);
      if (err.status === 401) {
        logout();
        navigate('/login', {
          state: { message: 'Your session has expired. Please sign in again.' },
        });
      } else {
        setErrorMessage(err.message || 'Unable to load friends information.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync tab with URL search parameter
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'add' ? {} : { tab });
    setSuccessMessage('');
    setErrorMessage('');
  };

  // Helper: Get user details by ID from users list
  const getUserById = (userId) => {
    return users.find((u) => u.id === userId);
  };

  // Helper: Compute clean monogram initials for default avatar placeholder
  const getInitials = (first, last, username) => {
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    }
    if (first) {
      return first.slice(0, 2).toUpperCase();
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return 'OF';
  };

  // 1. Send Friend Request (POST /api/friends/requests/send/)
  const handleSendRequest = async (user) => {
    setSuccessMessage('');
    setErrorMessage('');
    setActionLoadingId(user.id);

    try {
      const response = await sendFriendRequest(user.id);
      setOutgoingRequests((prev) => [response, ...prev]);
      setSuccessMessage(`Friend request sent to @${user.username}!`);
    } catch (err) {
      console.error('Failed to send friend request:', err);
      if (err.status === 401) {
        logout();
        navigate('/login', {
          state: { message: 'Your session has expired. Please sign in again.' },
        });
      } else {
        setErrorMessage(err.message || `Could not send request to @${user.username}.`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Respond to Friend Request (PATCH /api/friends/requests/<id>/)
  const handleRespondRequest = async (requestId, action, senderName) => {
    setSuccessMessage('');
    setErrorMessage('');
    setActionLoadingId(requestId);

    try {
      await respondFriendRequest(requestId, action);

      // Refresh requests data
      const updatedRequests = await getFriendRequests();
      setIncomingRequests(updatedRequests?.incoming || []);
      setOutgoingRequests(updatedRequests?.outgoing || []);

      if (action === 'accept') {
        setSuccessMessage(`You and @${senderName} are now friends!`);
      } else {
        setSuccessMessage(`Friend request from @${senderName} rejected.`);
      }
    } catch (err) {
      console.error(`Failed to ${action} friend request:`, err);
      if (err.status === 401) {
        logout();
        navigate('/login', {
          state: { message: 'Your session has expired. Please sign in again.' },
        });
      } else {
        setErrorMessage(err.message || `Failed to ${action} friend request.`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Initiate or Open Chat Conversation (POST /api/chat/conversations/)
  const handleStartChat = async (friend) => {
    setErrorMessage('');
    setActionLoadingId(`chat-${friend.id}`);

    try {
      const conversation = await createOrGetConversation(friend.id);
      if (conversation?.id) {
        navigate(`/chat/${conversation.id}`, { state: { friend } });
      } else {
        setErrorMessage('Failed to start chat session. Please try again.');
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
      if (err.status === 401) {
        logout();
        navigate('/login', {
          state: { message: 'Your session has expired. Please sign in again.' },
        });
      } else {
        setErrorMessage(err.message || `Unable to open chat with @${friend.username}.`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // --------------------------------------------------------------------------
  // RELATIONSHIP HELPERS FOR "ADD FRIENDS" TAB
  // --------------------------------------------------------------------------
  const getRelationshipStatus = (userId) => {
    // 1. Check if accepted friend (incoming or outgoing)
    const isAcceptedIncoming = incomingRequests.some(
      (r) => r.sender === userId && r.status === 'accepted'
    );
    const isAcceptedOutgoing = outgoingRequests.some(
      (r) => r.receiver === userId && r.status === 'accepted'
    );
    if (isAcceptedIncoming || isAcceptedOutgoing) {
      return { status: 'accepted', label: 'Friends ✓' };
    }

    // 2. Check if outgoing request is pending
    const outgoing = outgoingRequests.find(
      (r) => r.receiver === userId && r.status === 'pending'
    );
    if (outgoing) {
      return { status: 'pending_sent', label: 'Request Sent' };
    }

    // 3. Check if incoming request is pending from this user
    const incoming = incomingRequests.find(
      (r) => r.sender === userId && r.status === 'pending'
    );
    if (incoming) {
      return { status: 'pending_received', label: 'Respond', request: incoming };
    }

    return { status: 'none', label: 'Add Friend' };
  };

  // --------------------------------------------------------------------------
  // COMPUTED LISTS
  // --------------------------------------------------------------------------

  // Pending Incoming Requests
  const pendingIncoming = incomingRequests.filter((r) => r.status === 'pending');

  // Accepted Friends List (Sender from incoming accepted + Receiver from outgoing accepted)
  const acceptedFriends = [];
  const friendUserIds = new Set();

  incomingRequests
    .filter((r) => r.status === 'accepted')
    .forEach((r) => {
      if (!friendUserIds.has(r.sender)) {
        friendUserIds.add(r.sender);
        const enriched = getUserById(r.sender);
        acceptedFriends.push({
          id: r.sender,
          username: enriched?.username || r.sender_username,
          first_name: enriched?.first_name || '',
          last_name: enriched?.last_name || '',
          profile_picture: enriched?.profile_picture || null,
          bio: enriched?.bio || '',
          friendshipDate: r.created_at,
          requestId: r.id,
        });
      }
    });

  outgoingRequests
    .filter((r) => r.status === 'accepted')
    .forEach((r) => {
      if (!friendUserIds.has(r.receiver)) {
        friendUserIds.add(r.receiver);
        const enriched = getUserById(r.receiver);
        acceptedFriends.push({
          id: r.receiver,
          username: enriched?.username || r.receiver_username,
          first_name: enriched?.first_name || '',
          last_name: enriched?.last_name || '',
          profile_picture: enriched?.profile_picture || null,
          bio: enriched?.bio || '',
          friendshipDate: r.created_at,
          requestId: r.id,
        });
      }
    });

  // Filtered Users for "Add Friends" Tab
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      fullName.includes(q) ||
      (u.bio && u.bio.toLowerCase().includes(q))
    );
  });

  return (
    <div className="outfitly-app-shell">
      <Navbar />

      <main className="outfitly-friends-container">
        {/* Header Breadcrumb & Title */}
        <div className="outfitly-builder-header">
          <div>
            <span className="outfitly-section-kicker">COMMUNITY & NETWORK</span>
            <h1 className="outfitly-builder-title">Friends</h1>
            <p className="outfitly-builder-subtitle">
              Connect with fellow fashion stylists, collaborate on looks, and grow your style circle.
            </p>
          </div>
        </div>

        {/* Global Notifications */}
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

        {errorMessage && (
          <div className="outfitly-alert outfitly-alert--error" role="alert">
            <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{errorMessage}</span>
              <button
                type="button"
                className="outfitly-btn-link"
                onClick={() => setErrorMessage('')}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Section Tabs Navigation */}
        <div className="outfitly-friends-tabs-wrap">
          <div className="outfitly-category-tabs" role="tablist" aria-label="Friends sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'add'}
              className={`outfitly-tab-btn ${
                activeTab === 'add' ? 'outfitly-tab-btn--active' : ''
              }`}
              onClick={() => handleTabChange('add')}
              id="tab-add-friends"
            >
              ADD FRIENDS
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'requests'}
              className={`outfitly-tab-btn ${
                activeTab === 'requests' ? 'outfitly-tab-btn--active' : ''
              }`}
              onClick={() => handleTabChange('requests')}
              id="tab-friend-requests"
            >
              FRIEND REQUESTS
              {pendingIncoming.length > 0 && (
                <span className="outfitly-tab-badge">{pendingIncoming.length}</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'friends'}
              className={`outfitly-tab-btn ${
                activeTab === 'friends' ? 'outfitly-tab-btn--active' : ''
              }`}
              onClick={() => handleTabChange('friends')}
              id="tab-my-friends"
            >
              MY FRIENDS
              {acceptedFriends.length > 0 && (
                <span className="outfitly-tab-badge outfitly-tab-badge--neutral">
                  {acceptedFriends.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Filter Input */}
          {activeTab === 'add' && (
            <div className="outfitly-friends-search">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="outfitly-friends-search__icon"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search stylists by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="outfitly-input outfitly-input--compact"
                aria-label="Search stylists"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="outfitly-friends-search__clear"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="outfitly-splash-loader" style={{ minHeight: '360px' }}>
            <LoadingSpinner size="large" />
          </div>
        )}

        {/* =================================================================
            TAB 1: ADD FRIENDS
            ================================================================= */}
        {!isLoading && activeTab === 'add' && (
          <div>
            {filteredUsers.length === 0 ? (
              <div className="outfitly-builder-empty-state" style={{ padding: '4rem 2rem' }}>
                <div className="outfitly-builder-empty-state__icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="outfitly-builder-empty-title">
                  {searchQuery ? 'No stylists match your search.' : 'No other stylists found.'}
                </h3>
                <p className="outfitly-builder-empty-subtitle">
                  {searchQuery
                    ? 'Try searching with a different username or full name.'
                    : 'Check back soon as new fashion curators join the Outfitly community.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="outfitly-btn outfitly-btn--outline"
                    style={{ marginTop: '1rem' }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="outfitly-friends-grid">
                {filteredUsers.map((user) => {
                  const relationship = getRelationshipStatus(user.id);
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
                  const isActing = actionLoadingId === user.id;

                  return (
                    <div key={user.id} className="outfitly-friend-card">
                      <div className="outfitly-friend-card__top">
                        <div className="outfitly-friend-card__avatar-wrap">
                          {user.profile_picture ? (
                            <img
                              src={getImageUrl(user.profile_picture)}
                              alt={user.username}
                              className="outfitly-friend-card__avatar-img"
                            />
                          ) : (
                            <div className="outfitly-friend-card__avatar-placeholder">
                              {getInitials(user.first_name, user.last_name, user.username)}
                            </div>
                          )}
                        </div>

                        <div className="outfitly-friend-card__meta">
                          <h3 className="outfitly-friend-card__name">
                            {fullName || `@${user.username}`}
                          </h3>
                          {fullName && (
                            <span className="outfitly-friend-card__handle">@{user.username}</span>
                          )}
                        </div>
                      </div>

                      {user.bio ? (
                        <p className="outfitly-friend-card__bio">{user.bio}</p>
                      ) : (
                        <p className="outfitly-friend-card__bio outfitly-friend-card__bio--empty">
                          Fashion stylist & wardrobe curator on Outfitly.
                        </p>
                      )}

                      <div className="outfitly-friend-card__actions">
                        {relationship.status === 'accepted' ? (
                          <button
                            type="button"
                            disabled
                            className="outfitly-btn outfitly-btn--outline outfitly-btn--full outfitly-btn--small outfitly-btn--disabled-clean"
                          >
                            ✓ Friends
                          </button>
                        ) : relationship.status === 'pending_sent' ? (
                          <button
                            type="button"
                            disabled
                            className="outfitly-btn outfitly-btn--outline outfitly-btn--full outfitly-btn--small outfitly-btn--disabled-clean"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.4rem' }}>
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Request Sent
                          </button>
                        ) : relationship.status === 'pending_received' ? (
                          <button
                            type="button"
                            onClick={() => handleTabChange('requests')}
                            className="outfitly-btn outfitly-btn--outline outfitly-btn--full outfitly-btn--small"
                          >
                            Respond to Request →
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleSendRequest(user)}
                            className="outfitly-btn outfitly-btn--primary outfitly-btn--full outfitly-btn--small"
                          >
                            {isActing ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.4rem' }}>
                                  <line x1="12" y1="5" x2="12" y2="19" />
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Friend
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 2: FRIEND REQUESTS
            ================================================================= */}
        {!isLoading && activeTab === 'requests' && (
          <div>
            {pendingIncoming.length === 0 ? (
              <div className="outfitly-builder-empty-state" style={{ padding: '4rem 2rem' }}>
                <div className="outfitly-builder-empty-state__icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                    <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <h3 className="outfitly-builder-empty-title">No incoming friend requests.</h3>
                <p className="outfitly-builder-empty-subtitle">
                  When other stylists send you a friend invitation, they will appear here for you to accept or decline.
                </p>
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleTabChange('add')}
                    className="outfitly-btn outfitly-btn--primary"
                  >
                    Find Stylists to Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="outfitly-requests-container">
                <div className="outfitly-requests-header">
                  <h3 className="outfitly-requests-title">
                    Pending Incoming Requests ({pendingIncoming.length})
                  </h3>
                </div>

                <div className="outfitly-requests-list">
                  {pendingIncoming.map((req) => {
                    const sender = getUserById(req.sender);
                    const isActing = actionLoadingId === req.id;
                    const fullName = sender ? [sender.first_name, sender.last_name].filter(Boolean).join(' ') : '';
                    const requestDate = req.created_at
                      ? new Date(req.created_at).toLocaleDateString()
                      : '';

                    return (
                      <div key={req.id} className="outfitly-request-card">
                        <div className="outfitly-request-card__info">
                          <div className="outfitly-friend-card__avatar-wrap" style={{ width: '54px', height: '54px' }}>
                            {sender?.profile_picture ? (
                              <img
                                src={getImageUrl(sender.profile_picture)}
                                alt={req.sender_username}
                                className="outfitly-friend-card__avatar-img"
                              />
                            ) : (
                              <div className="outfitly-friend-card__avatar-placeholder" style={{ fontSize: '1.2rem' }}>
                                {getInitials(sender?.first_name, sender?.last_name, req.sender_username)}
                              </div>
                            )}
                          </div>

                          <div className="outfitly-request-card__meta">
                            <h4 className="outfitly-request-card__name">
                              {fullName || `@${req.sender_username}`}
                            </h4>
                            {fullName && (
                              <span className="outfitly-request-card__handle">@{req.sender_username}</span>
                            )}
                            {sender?.bio && (
                              <p className="outfitly-request-card__bio">{sender.bio}</p>
                            )}
                            {requestDate && (
                              <span className="outfitly-request-card__date">
                                Requested on {requestDate}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="outfitly-request-card__actions">
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleRespondRequest(req.id, 'accept', req.sender_username)}
                            className="outfitly-btn outfitly-btn--primary outfitly-btn--small"
                          >
                            {isActing ? <LoadingSpinner size="small" /> : 'Accept'}
                          </button>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleRespondRequest(req.id, 'reject', req.sender_username)}
                            className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 3: MY FRIENDS
            ================================================================= */}
        {!isLoading && activeTab === 'friends' && (
          <div>
            {acceptedFriends.length === 0 ? (
              <div className="outfitly-builder-empty-state" style={{ padding: '4rem 2rem' }}>
                <div className="outfitly-builder-empty-state__icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </div>
                <h3 className="outfitly-builder-empty-title">No friends in your circle yet.</h3>
                <p className="outfitly-builder-empty-subtitle">
                  Connect with fellow wardrobe curators and fashion stylists to share advice, recommendations, and looks.
                </p>
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleTabChange('add')}
                    className="outfitly-btn outfitly-btn--primary"
                  >
                    Browse & Add Friends
                  </button>
                </div>
              </div>
            ) : (
              <div className="outfitly-friends-grid">
                {acceptedFriends.map((friend) => {
                  const fullName = [friend.first_name, friend.last_name].filter(Boolean).join(' ');
                  const friendshipDate = friend.friendshipDate
                    ? new Date(friend.friendshipDate).toLocaleDateString()
                    : '';

                  return (
                    <div key={friend.id} className="outfitly-friend-card">
                      <div className="outfitly-friend-card__top">
                        <div className="outfitly-friend-card__avatar-wrap">
                          {friend.profile_picture ? (
                            <img
                              src={getImageUrl(friend.profile_picture)}
                              alt={friend.username}
                              className="outfitly-friend-card__avatar-img"
                            />
                          ) : (
                            <div className="outfitly-friend-card__avatar-placeholder">
                              {getInitials(friend.first_name, friend.last_name, friend.username)}
                            </div>
                          )}
                        </div>

                        <div className="outfitly-friend-card__meta">
                          <h3 className="outfitly-friend-card__name">
                            {fullName || `@${friend.username}`}
                          </h3>
                          {fullName && (
                            <span className="outfitly-friend-card__handle">@{friend.username}</span>
                          )}
                          <span className="outfitly-pill outfitly-pill--compact" style={{ marginTop: '0.35rem', alignSelf: 'flex-start' }}>
                            ✓ Connected Stylist
                          </span>
                        </div>
                      </div>

                      {friend.bio ? (
                        <p className="outfitly-friend-card__bio">{friend.bio}</p>
                      ) : (
                        <p className="outfitly-friend-card__bio outfitly-friend-card__bio--empty">
                          Fashion stylist & wardrobe curator on Outfitly.
                        </p>
                      )}

                      <div className="outfitly-friend-card__footer outfitly-friend-card__footer--actions">
                        {friendshipDate ? (
                          <span className="outfitly-friend-card__date">
                            Connected since {friendshipDate}
                          </span>
                        ) : <span />}
                        <button
                          type="button"
                          disabled={actionLoadingId === `chat-${friend.id}`}
                          onClick={() => handleStartChat(friend)}
                          className="outfitly-btn outfitly-btn--primary outfitly-btn--small outfitly-friend-card__msg-btn"
                          aria-label={`Send message to ${friend.username}`}
                        >
                          {actionLoadingId === `chat-${friend.id}` ? (
                            <LoadingSpinner size="small" />
                          ) : (
                            <>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                style={{ marginRight: '0.45rem', flexShrink: 0 }}
                              >
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                              </svg>
                              <span>Message</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Friends;
