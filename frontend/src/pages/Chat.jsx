import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getConversations,
  getConversationMessages,
  getFriendUsers,
  getImageUrl,
  API_BASE_URL,
} from '../services/api';
import { getAccessToken } from '../utils/auth';
import { useAuth } from '../context/AuthContext';

export const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // State
  const [conversations, setConversations] = useState([]);
  const [friendsDirectory, setFriendsDirectory] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Mobile view toggle (conversation list vs chat panel)
  const [showMobileChat, setShowMobileChat] = useState(Boolean(conversationId));

  // Refs
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);

  // Helper: Extract other participant from a conversation
  const getOtherParticipant = (conv) => {
    if (!conv) return location.state?.friend || null;

    const currentUsername = user?.username?.toLowerCase();
    const currentId = user?.id;

    let otherId = null;
    let otherUsername = null;

    if (conv.user1_username || conv.user2_username) {
      const isUser1Me =
        (conv.user1_username && conv.user1_username.toLowerCase() === currentUsername) ||
        conv.user1 === currentId;
      otherId = isUser1Me ? conv.user2 : conv.user1;
      otherUsername = isUser1Me ? conv.user2_username : conv.user1_username;
    } else if (conv.participants && Array.isArray(conv.participants)) {
      const other = conv.participants.find(
        (p) => p.username?.toLowerCase() !== currentUsername && p.id !== currentId
      );
      if (other) return other;
    }

    // Check location.state?.friend
    const stateFriend = location.state?.friend;
    if (stateFriend && (stateFriend.id === otherId || stateFriend.username === otherUsername)) {
      return stateFriend;
    }

    // Check friends directory
    if (friendsDirectory.length > 0) {
      const matched = friendsDirectory.find(
        (f) =>
          f.id === otherId ||
          (otherUsername && f.username?.toLowerCase() === otherUsername.toLowerCase())
      );
      if (matched) return matched;
    }

    if (otherUsername) {
      return {
        id: otherId,
        username: otherUsername,
        first_name: '',
        last_name: '',
        profile_picture: null,
      };
    }

    return stateFriend || null;
  };

  // Helper: Monogram avatar initials
  const getInitials = (first, last, username) => {
    if (first && last) return (first[0] + last[0]).toUpperCase();
    if (first) return first.slice(0, 2).toUpperCase();
    if (username) return username.slice(0, 2).toUpperCase();
    return 'OF';
  };

  // Helper: Format message timestamp
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper: Format date for date dividers
  const formatDateDivider = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) return 'Today';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Helper: Auto-scroll to bottom of messages
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  };

  // 1. Load All User Conversations and Stylist Directory
  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const [convs, friends] = await Promise.all([
        getConversations().catch(() => []),
        getFriendUsers().catch(() => []),
      ]);
      setConversations(convs || []);
      setFriendsDirectory(friends || []);
      return convs;
    } catch (err) {
      console.error('Failed to load conversations:', err);
      if (err.status === 401) {
        logout();
        navigate('/login', { state: { message: 'Session expired. Please sign in again.' } });
      }
      return [];
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Manage Active Conversation and WebSocket Connection
  useEffect(() => {
    if (!conversationId) {
      setActiveConversation(null);
      setMessages([]);
      setShowMobileChat(false);
      return;
    }

    setShowMobileChat(true);

    // Find active conversation in existing list or state
    const matched = conversations.find((c) => String(c.id) === String(conversationId));
    if (matched) {
      setActiveConversation(matched);
    } else if (location.state?.friend) {
      setActiveConversation({
        id: conversationId,
        participants: [location.state.friend],
      });
    }

    // Load initial messages via REST GET
    setIsLoadingMessages(true);
    setConnectionError('');
    let isCancelled = false;

    getConversationMessages(conversationId)
      .then((history) => {
        if (!isCancelled) {
          setMessages(Array.isArray(history) ? history : []);
          setTimeout(() => scrollToBottom(false), 50);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load messages:', err);
          setConnectionError(err.message || 'Unable to load message history.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      });

    // Connect WebSocket
    const token = getAccessToken();
    if (!token) {
      setConnectionError('Authentication token missing. Please sign in again.');
      return;
    }

    // Determine ws:// or wss:// protocol
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`;

    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isCancelled) {
          setIsWsConnected(true);
          setConnectionError('');
        }
      };

      ws.onmessage = (event) => {
        if (isCancelled) return;
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, data]);
          setTimeout(() => scrollToBottom(true), 60);
        } catch (parseErr) {
          console.error('Failed to parse WebSocket message:', parseErr);
        }
      };

      ws.onerror = (err) => {
        if (!isCancelled) {
          console.error('WebSocket connection error:', err);
          setConnectionError('Real-time connection error. Retrying...');
          setIsWsConnected(false);
        }
      };

      ws.onclose = (event) => {
        if (!isCancelled) {
          setIsWsConnected(false);
          if (event.code !== 1000) {
            setConnectionError('Chat disconnected. Please refresh or reopen the conversation.');
          }
        }
      };
    } catch (wsErr) {
      console.error('Failed to initialize WebSocket:', wsErr);
      setConnectionError('Could not establish real-time chat connection.');
    }

    // Clean up WebSocket when leaving the chat or switching conversations
    return () => {
      isCancelled = true;
      if (ws) {
        ws.close(1000, 'Component unmounted or conversation changed');
        wsRef.current = null;
      }
      setIsWsConnected(false);
    };
  }, [conversationId]);

  // Update activeConversation once conversations list finishes loading if needed
  useEffect(() => {
    if (conversationId && conversations.length > 0 && !activeConversation?.participants?.length) {
      const found = conversations.find((c) => String(c.id) === String(conversationId));
      if (found) {
        setActiveConversation(found);
      }
    }
  }, [conversations, conversationId]);

  // 3. Send Message ONLY via WebSocket
  const handleSendMessage = (e) => {
    e?.preventDefault();
    const text = messageInput.trim();
    if (!text) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setConnectionError('Chat is not connected. Please wait for reconnection.');
      return;
    }

    try {
      // Send message ONLY through WebSocket payload: {"message": "..."}
      wsRef.current.send(JSON.stringify({ message: text }));
      setMessageInput('');
      setConnectionError('');
    } catch (err) {
      console.error('Failed to send message via WebSocket:', err);
      setConnectionError('Failed to send message. Please check your connection.');
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Check if message belongs to current user
  const isMyMessage = (msg) => {
    const senderUsername =
      msg.sender_username || (typeof msg.sender === 'string' ? msg.sender : msg.sender?.username);
    if (senderUsername && user?.username) {
      return senderUsername.toLowerCase() === user.username.toLowerCase();
    }
    if (typeof msg.sender === 'number' && user?.id) {
      return msg.sender === user.id;
    }
    return false;
  };

  // Filter conversations in sidebar
  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm.trim()) return true;
    const other = getOtherParticipant(conv);
    const q = searchTerm.toLowerCase();
    return (
      other?.username?.toLowerCase().includes(q) ||
      other?.first_name?.toLowerCase().includes(q) ||
      other?.last_name?.toLowerCase().includes(q)
    );
  });

  const activeFriend = activeConversation ? getOtherParticipant(activeConversation) : null;
  const activeFriendFullName = activeFriend
    ? [activeFriend.first_name, activeFriend.last_name].filter(Boolean).join(' ')
    : '';

  return (
    <div className="outfitly-app-shell">
      <Navbar />

      <main className="outfitly-chat-page">
        <div className="outfitly-chat-layout">
          {/* =================================================================
              SIDEBAR: CONVERSATION LIST
              ================================================================= */}
          <aside
            className={`outfitly-chat-sidebar ${
              showMobileChat ? 'outfitly-chat-sidebar--mobile-hidden' : ''
            }`}
          >
            <div className="outfitly-chat-sidebar__header">
              <div className="outfitly-chat-sidebar__title-row">
                <h2 className="outfitly-chat-sidebar__title">Messages</h2>
                <Link
                  to="/friends?tab=friends"
                  className="outfitly-btn-link"
                  title="View all friends to start a new chat"
                >
                  + New Chat
                </Link>
              </div>

              {/* Search input */}
              <div className="outfitly-chat-search">
                <svg
                  className="outfitly-chat-search__icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search stylists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="outfitly-chat-search__input"
                />
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="outfitly-chat-sidebar__list">
              {isLoadingConversations ? (
                <div className="outfitly-chat-sidebar__loading">
                  <LoadingSpinner size="medium" />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Loading conversations...
                  </span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="outfitly-chat-sidebar__empty">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <p className="outfitly-chat-sidebar__empty-title">
                    {searchTerm ? 'No matching chats' : 'No conversations yet'}
                  </p>
                  <p className="outfitly-chat-sidebar__empty-sub">
                    {searchTerm
                      ? 'Try another search term'
                      : 'Connect with stylists on your Friends page to start styling together.'}
                  </p>
                  {!searchTerm && (
                    <Link
                      to="/friends?tab=friends"
                      className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
                      style={{ marginTop: '0.75rem' }}
                    >
                      Browse Friends
                    </Link>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const other = getOtherParticipant(conv);
                  const isActive = String(conv.id) === String(conversationId);
                  const displayName = other
                    ? [other.first_name, other.last_name].filter(Boolean).join(' ') ||
                      `@${other.username}`
                    : 'Stylist';
                  const lastMsg = conv.last_message;
                  const lastSnippet = lastMsg?.content || 'Direct message';
                  const lastTime = lastMsg?.created_at
                    ? formatTime(lastMsg.created_at)
                    : conv.created_at
                    ? formatTime(conv.created_at)
                    : '';

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        navigate(`/chat/${conv.id}`, { state: { friend: other } });
                        setShowMobileChat(true);
                      }}
                      className={`outfitly-chat-item ${
                        isActive ? 'outfitly-chat-item--active' : ''
                      }`}
                    >
                      <div className="outfitly-chat-item__avatar-wrap">
                        {other?.profile_picture ? (
                          <img
                            src={getImageUrl(other.profile_picture)}
                            alt={other.username}
                            className="outfitly-chat-item__avatar-img"
                          />
                        ) : (
                          <div className="outfitly-chat-item__avatar-placeholder">
                            {getInitials(other?.first_name, other?.last_name, other?.username)}
                          </div>
                        )}
                      </div>

                      <div className="outfitly-chat-item__content">
                        <div className="outfitly-chat-item__top">
                          <span className="outfitly-chat-item__name">{displayName}</span>
                          {lastTime && (
                            <span className="outfitly-chat-item__time">{lastTime}</span>
                          )}
                        </div>
                        <p className="outfitly-chat-item__snippet">{lastSnippet}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* =================================================================
              MAIN CHAT PANEL
              ================================================================= */}
          <section
            className={`outfitly-chat-main ${
              !showMobileChat ? 'outfitly-chat-main--mobile-hidden' : ''
            }`}
          >
            {conversationId ? (
              <div className="outfitly-chat-thread">
                {/* Thread Header */}
                <div className="outfitly-chat-header">
                  <div className="outfitly-chat-header__left">
                    <button
                      type="button"
                      onClick={() => setShowMobileChat(false)}
                      className="outfitly-chat-header__back-btn"
                      aria-label="Back to conversations"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                      </svg>
                    </button>

                    <div className="outfitly-chat-header__avatar-wrap">
                      {activeFriend?.profile_picture ? (
                        <img
                          src={getImageUrl(activeFriend.profile_picture)}
                          alt={activeFriend.username}
                          className="outfitly-chat-header__avatar-img"
                        />
                      ) : (
                        <div className="outfitly-chat-header__avatar-placeholder">
                          {getInitials(
                            activeFriend?.first_name,
                            activeFriend?.last_name,
                            activeFriend?.username
                          )}
                        </div>
                      )}
                    </div>

                    <div className="outfitly-chat-header__meta">
                      <h3 className="outfitly-chat-header__name">
                        {activeFriendFullName || (activeFriend ? `@${activeFriend.username}` : 'Stylist')}
                      </h3>
                      <div className="outfitly-chat-header__status-row">
                        <span
                          className={`outfitly-chat-status-dot ${
                            isWsConnected ? 'outfitly-chat-status-dot--connected' : ''
                          }`}
                        />
                        <span className="outfitly-chat-header__status-label">
                          {isWsConnected
                            ? 'Real-time active'
                            : connectionError
                            ? 'Reconnecting...'
                            : 'Connecting...'}
                        </span>
                        {activeFriend?.username && (
                          <span className="outfitly-chat-header__handle">
                            • @{activeFriend.username}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="outfitly-chat-header__actions">
                    <Link
                      to="/friends"
                      className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
                      title="Return to Friends directory"
                    >
                      Friends
                    </Link>
                  </div>
                </div>

                {/* Connection Error Banner */}
                {connectionError && (
                  <div className="outfitly-chat-alert outfitly-chat-alert--warning" role="alert">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{connectionError}</span>
                  </div>
                )}

                {/* Messages Body */}
                <div className="outfitly-chat-messages" ref={chatScrollContainerRef}>
                  {isLoadingMessages ? (
                    <div className="outfitly-chat-messages__loading">
                      <LoadingSpinner size="medium" />
                      <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                        Loading message history...
                      </p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="outfitly-chat-messages__empty">
                      <div className="outfitly-chat-messages__empty-icon">
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </div>
                      <h4>No messages yet</h4>
                      <p>
                        Say hello to{' '}
                        <strong>
                          {activeFriend ? `@${activeFriend.username}` : 'your stylist friend'}
                        </strong>
                        . Share outfit ideas, discuss styles, and build capsule wardrobes together!
                      </p>
                    </div>
                  ) : (
                    <div className="outfitly-chat-messages__list">
                      {messages.map((msg, index) => {
                        const isMe = isMyMessage(msg);
                        const text = msg.content ?? msg.message ?? '';
                        const time = formatTime(msg.created_at);
                        const senderName =
                          msg.sender_username ||
                          (typeof msg.sender === 'string' ? msg.sender : msg.sender?.username) ||
                          'Stylist';

                        // Show date separator if day changed from previous message
                        const currentDateStr = formatDateDivider(msg.created_at);
                        const prevDateStr =
                          index > 0 ? formatDateDivider(messages[index - 1].created_at) : null;
                        const showDateDivider = currentDateStr && currentDateStr !== prevDateStr;

                        return (
                          <React.Fragment key={msg.id || `msg-${index}-${msg.created_at}`}>
                            {showDateDivider && (
                              <div className="outfitly-chat-date-divider">
                                <span>{currentDateStr}</span>
                              </div>
                            )}

                            <div
                              className={`outfitly-chat-bubble-row ${
                                isMe
                                  ? 'outfitly-chat-bubble-row--me'
                                  : 'outfitly-chat-bubble-row--them'
                              }`}
                            >
                              {!isMe && (
                                <div className="outfitly-chat-bubble__avatar">
                                  {activeFriend?.profile_picture ? (
                                    <img
                                      src={getImageUrl(activeFriend.profile_picture)}
                                      alt={senderName}
                                    />
                                  ) : (
                                    <div className="outfitly-chat-bubble__avatar-placeholder">
                                      {senderName.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="outfitly-chat-bubble-wrapper">
                                <div
                                  className={`outfitly-chat-bubble ${
                                    isMe
                                      ? 'outfitly-chat-bubble--me'
                                      : 'outfitly-chat-bubble--them'
                                  }`}
                                >
                                  <p className="outfitly-chat-bubble__text">{text}</p>
                                </div>
                                {time && (
                                  <span className="outfitly-chat-bubble__meta">{time}</span>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      <div ref={messagesEndRef} style={{ height: '1px' }} />
                    </div>
                  )}
                </div>

                {/* Message Input Form */}
                <form className="outfitly-chat-input-bar" onSubmit={handleSendMessage}>
                  <textarea
                    rows="1"
                    placeholder={`Message ${
                      activeFriend ? `@${activeFriend.username}` : 'stylist'
                    }...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="outfitly-chat-input-field"
                    disabled={!isWsConnected}
                    maxLength={2000}
                  />

                  <button
                    type="submit"
                    disabled={!messageInput.trim() || !isWsConnected}
                    className="outfitly-chat-send-btn"
                    aria-label="Send message"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </form>
              </div>
            ) : (
              /* No Conversation Selected Placeholder (Desktop view) */
              <div className="outfitly-chat-placeholder">
                <div className="outfitly-chat-placeholder__card">
                  <div className="outfitly-chat-placeholder__icon">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <h3>Outfitly Stylist Messages</h3>
                  <p>
                    Select an existing conversation from the left, or visit your Friends page to
                    start a chat with an accepted stylist.
                  </p>
                  <Link to="/friends?tab=friends" className="outfitly-btn outfitly-btn--primary">
                    View Connected Friends
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Chat;
