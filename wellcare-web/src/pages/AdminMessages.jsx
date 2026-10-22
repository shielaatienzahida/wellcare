import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';

export default function AdminMessages() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('heiwa_session_admin')) { navigate('/login'); return; }
  }, []);

  const [allMessages, setAllMessages] = useState([]);
  const [activeClientId, setActiveClientId] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);

  // Load and poll messages
  const loadMessages = useCallback(async () => {
    try {
      const res = await api.getMessages();
      setAllMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Auto scroll on new messages
  useEffect(() => {
    if (activeClientId) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [activeClientId, allMessages]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (!activeClientId) return;
    const markRead = async () => {
      try {
        await api.markMessagesRead(activeClientId);
        loadMessages();
      } catch (err) { console.error(err); }
    };
    markRead();
  }, [activeClientId, loadMessages]);

  // Group messages by client_id for the inbox
  const threads = {};
  allMessages
    .filter(m => m.recipient === 'admin' || m.sender === 'admin' || (!m.recipient))
    .forEach(m => {
    if (!threads[m.client_id]) {
      threads[m.client_id] = { client_id: m.client_id, client_name: m.client_name, messages: [] };
    }
    threads[m.client_id].messages.push(m);
    if (m.client_name) threads[m.client_id].client_name = m.client_name;
  });

  const threadList = Object.values(threads).sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1];
    const bLast = b.messages[b.messages.length - 1];
    return new Date(bLast.timestamp) - new Date(aLast.timestamp);
  });

  const filteredThreads = threadList.filter(t =>
    (t.client_name || String(t.client_id) || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = allMessages.filter(m => m.sender === 'client' && !m.read_by_admin && (m.recipient === 'admin' || !m.recipient)).length;

  const activeThread = activeClientId ? threads[activeClientId] : null;
  const activeMessages = activeThread ? activeThread.messages : [];

  const handleSendMsg = async () => {
    if (!msgInput.trim() || !activeClientId) return;
    try {
      await api.sendMessage({
        client_id: activeClientId,
        recipient: 'client',
        text: msgInput.trim()
      });
      setMsgInput('');
      loadMessages();
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <AdminLayout unreadMsgCount={totalUnread}>
      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Page Header */}
        <div>
          <p className="page-eyebrow">Communication</p>
          <h2 className="page-title">Messages</h2>
          <p className="page-sub">Chat with your clients in real-time</p>
        </div>

        {/* Messenger Panel */}
        <div className="admin-msg-panel">
          {/* Sidebar */}
          <div className="admin-msg-sidebar">
            <div className="admin-msg-sidebar-header">
              <span className="admin-msg-sidebar-title">Inbox</span>
              {totalUnread > 0 && (
                <span className="admin-msg-unread-badge">{totalUnread} unread</span>
              )}
            </div>
            <div style={{ padding: '0 12px 12px' }}>
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="admin-msg-search"
              />
            </div>
            <div className="admin-msg-thread-list">
              {filteredThreads.length === 0 && (
                <div className="admin-msg-empty">
                  <MessageCircle size={32} color="rgba(4,106,56,0.2)" />
                  <p>No messages yet</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(4,106,56,0.35)' }}>Client messages will appear here</p>
                </div>
              )}
              {filteredThreads.map(t => {
                const last = t.messages[t.messages.length - 1];
                const unread = t.messages.filter(m => m.sender === 'client' && !m.read_by_admin).length;
                const isActive = activeClientId === t.client_id;
                return (
                  <div
                    key={t.client_id}
                    className={`admin-msg-thread-item ${isActive ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                    onClick={() => setActiveClientId(t.client_id)}
                  >
                    <div className="admin-msg-thread-avatar">
                      {getInitials(t.client_name)}
                    </div>
                    <div className="admin-msg-thread-info">
                      <div className="admin-msg-thread-top">
                        <span className="admin-msg-thread-name">{t.client_name || t.client_id}</span>
                        <span className="admin-msg-thread-time">{formatDate(last?.timestamp)}</span>
                      </div>
                      <div className="admin-msg-thread-preview">
                        {last?.sender === 'admin' ? 'You: ' : ''}{last?.text}
                      </div>
                    </div>
                    {unread > 0 && (
                      <div className="admin-msg-thread-badge">{unread}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className="admin-msg-chat">
            {activeClientId && activeThread ? (
              <>
                {/* Chat header */}
                <div className="admin-msg-chat-header">
                  <button className="admin-msg-back-btn" onClick={() => setActiveClientId(null)}>
                    <ArrowLeft size={18} />
                  </button>
                  <div className="admin-msg-chat-avatar">
                    {getInitials(activeThread.client_name)}
                  </div>
                  <div>
                    <div className="admin-msg-chat-name">{activeThread.client_name || activeClientId}</div>
                    <div className="admin-msg-chat-status">{'\u25cf'} Client</div>
                  </div>
                </div>

                {/* Messages */}
                <div className="admin-msg-chat-body">
                  {activeMessages.map(m => (
                    <div key={m.id} className={`admin-msg-bubble-row ${m.sender === 'admin' ? 'sent' : 'received'}`}>
                      <div className={`admin-msg-bubble ${m.sender === 'admin' ? 'sent' : 'received'}`}>
                        <div>{m.text}</div>
                        <div className="admin-msg-bubble-time">{formatDate(m.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="admin-msg-chat-input">
                  <input
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMsg()}
                    placeholder="Type a message..."
                    className="admin-msg-input"
                  />
                  <button onClick={handleSendMsg} className="admin-msg-send-btn">
                    <Send size={16} color="white" />
                  </button>
                </div>
              </>
            ) : (
              <div className="admin-msg-empty-chat">
                <div className="admin-msg-empty-icon">
                  <MessageCircle size={48} color="rgba(4,106,56,0.2)" strokeWidth={1.5} />
                </div>
                <h3>Select a conversation</h3>
                <p>Choose a client from the inbox to view and reply to their messages</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}
