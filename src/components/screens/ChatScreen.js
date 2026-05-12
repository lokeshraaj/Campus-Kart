'use client';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle, Send, Loader2 } from 'lucide-react';
import { sendMessage, subscribeToMessages, subscribeToPresence } from '@/lib/chatService';
import { markAsSold } from '@/lib/productService';
import { useAuth } from '@/context/AuthContext';
import { useSuccessPopup } from '@/components/SuccessPopup';
import toast from 'react-hot-toast';

export default function ChatScreen({ chat, onBack }) {
  const { user } = useAuth();
  const { showSuccess } = useSuccessPopup();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [presence, setPresence] = useState({ isOnline: false, lastSeen: null });
  const messagesEndRef = useRef(null);

  // Determine the other participant's ID for presence tracking
  const otherUserId = chat.participants
    ? chat.participants.find(id => id !== user?.uid)
    : null;

  // Subscribe to real-time messages
  useEffect(() => {
    if (!chat.id) return;

    setLoading(true);
    const unsubscribe = subscribeToMessages(chat.id, (msgs, error) => {
      setMessages(msgs);
      setLoading(false);
      if (error) {
        console.error('Failed to load messages:', error);
      }
    });

    return () => unsubscribe();
  }, [chat.id]);

  // Subscribe to other user's presence
  useEffect(() => {
    if (!otherUserId) return;

    const unsubscribe = subscribeToPresence(otherUserId, setPresence);
    return () => unsubscribe();
  }, [otherUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !chat.id || !user?.uid) return;

    setSending(true);
    try {
      await sendMessage(chat.id, user.uid, input);
      setInput('');
    } catch (err) {
      console.error('Send failed:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMarkSold = async () => {
    if (!chat.productId) return;
    try {
      await markAsSold(chat.productId);
      showSuccess('Item Sold!', 'The listing has been removed from the marketplace.');
    } catch (err) {
      console.error('Mark sold failed:', err);
      toast.error('Failed to mark as sold');
    }
  };

  // Format presence status
  const presenceText = presence.isOnline
    ? 'Online'
    : presence.lastSeen
      ? `Last seen ${presence.lastSeen.toLocaleString()}`
      : 'Offline';

  // Chat name — from chat doc or fallback
  const chatName = chat.name || chat.productTitle || 'Chat';
  const chatAvatar = chat.avatar || chatName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="chat-page animate-fade-in" id="chat-page">
      {/* Header */}
      <div className="chat-header" id="chat-header">
        <button className="chat-header-back" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className="chat-header-avatar">{chatAvatar}</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{chatName}</div>
          <div className="chat-header-status" style={{ 
            display: 'flex', alignItems: 'center', gap: '4px',
            color: presence.isOnline ? '#16a34a' : 'var(--text-tertiary)'
          }}>
            {presence.isOnline && (
              <span style={{ 
                width: '6px', height: '6px', borderRadius: '50%', 
                background: '#16a34a', display: 'inline-block' 
              }} />
            )}
            {presenceText}
          </div>
        </div>
        {chat.productId && (
          <button 
            className="chat-mark-sold" 
            id="mark-sold-button" 
            onClick={handleMarkSold}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <CheckCircle size={16} strokeWidth={2} /> Mark as Sold
          </button>
        )}
      </div>

      {/* Product context bar */}
      {chat.productTitle && (
        <div style={{
          padding: '8px 16px',
          background: '#F1F5F9',
          borderBottom: '1px solid #E2E8F0',
          fontSize: '13px',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontWeight: 500 }}>About:</span> {chat.productTitle}
          {chat.productPrice > 0 && (
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              ₹{chat.productPrice?.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages" id="chat-messages">
        {loading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="chat-message received" style={{ maxWidth: '60%' }}>
              <div className="animate-pulse bg-gray-200 rounded-md" style={{ height: '24px', width: '100%', marginBottom: '4px' }}></div>
              <div className="animate-pulse bg-gray-200 rounded-md" style={{ height: '24px', width: '60%' }}></div>
            </div>
            <div className="chat-message sent" style={{ maxWidth: '60%' }}>
              <div className="animate-pulse bg-gray-200 rounded-md" style={{ height: '24px', width: '80%', marginBottom: '4px' }}></div>
            </div>
            <div className="chat-message received" style={{ maxWidth: '60%' }}>
              <div className="animate-pulse bg-gray-200 rounded-md" style={{ height: '24px', width: '90%' }}></div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8', fontSize: '14px' }}>
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`chat-message ${msg.senderId === user?.uid ? 'sent' : 'received'}`}
            >
              <div>{msg.text}</div>
              <div className="chat-message-time">{msg.time}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar" id="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          id="chat-input"
          disabled={sending}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          id="-button"
          aria-label="Send message"
          disabled={sending || !input.trim()}
          style={{ opacity: sending || !input.trim() ? 0.5 : 1 }}
        >
          {sending ? <Loader2 size={18} strokeWidth={2} className="animate-spin" /> : <Send size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
