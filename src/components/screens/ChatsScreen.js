'use client';
import { useState, useEffect } from 'react';
import { Lightbulb, MessageCircle, Loader2 } from 'lucide-react';
import { subscribeToUserChats } from '@/lib/chatService';
import { useAuth } from '@/context/AuthContext';

export default function ChatsScreen({ onChatClick }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time chat threads
  useEffect(() => {
    if (!user?.uid) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserChats(user.uid, (chatData, error) => {
      setChats(chatData);
      setLoading(false);
      if (error) {
        console.error('Failed to load chats:', error);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Derive display info for each chat
  const getChatDisplay = (chat) => {
    // The "other" participant is the one who isn't the current user
    const isCurrentBuyer = chat.buyerId === user?.uid;
    const otherName = isCurrentBuyer 
      ? (chat.sellerName || 'Seller') 
      : (chat.buyerName || 'Buyer');
    const avatar = otherName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return {
      name: otherName,
      avatar,
      product: chat.productTitle || '',
      lastMessage: chat.lastMessage || 'No messages yet',
      time: chat.lastMessageAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
    };
  };

  if (loading) {
    return (
      <div className="chats-list-page animate-fade-in" id="chats-screen">
        <div className="chats-list-header">
          <h1 className="chats-list-title">Messages</h1>
        </div>
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="chat-list-item" style={{ pointerEvents: 'none' }}>
              <div className="chat-list-avatar animate-pulse" style={{ background: '#E2E8F0', color: 'transparent' }}></div>
              <div className="chat-list-content">
                <div className="animate-pulse" style={{ background: '#E2E8F0', height: '14px', width: '40%', borderRadius: '4px', marginBottom: '8px' }}></div>
                <div className="animate-pulse" style={{ background: '#E2E8F0', height: '12px', width: '70%', borderRadius: '4px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chats-list-page animate-fade-in" id="chats-screen">
      <div className="chats-list-header">
        <h1 className="chats-list-title">Messages</h1>
      </div>

      {chats.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
        }}>
          <MessageCircle size={40} strokeWidth={1.5} color="#CBD5E1" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            No conversations yet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Find a product and tap "Chat with Seller" to start one.
          </p>
        </div>
      ) : (
        chats.map(chat => {
    const display = getChatDisplay(chat);
    return (
      <div
        key={chat.id}
        className="chat-list-item"
        onClick={() => onChatClick({
          ...chat,
          name: display.name,
          avatar: display.avatar,
        })}
        id={`chat-item-${chat.id}`}
      >
              <div className="chat-list-avatar">{display.avatar}</div>
              <div className="chat-list-content">
                <div className="chat-list-name">{display.name}</div>
                <div className="chat-list-message">
                  {display.product && (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{display.product} · </span>
                  )}
                  {display.lastMessage}
                </div>
              </div>
              <div className="chat-list-meta">
                <span className="chat-list-time">{display.time}</span>
              </div>
            </div>
          );
        })
      )}

      {/* Tip */}
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-3xl) var(--space-2xl)',
        color: 'var(--text-tertiary)',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
      }}>
        <Lightbulb size={16} strokeWidth={2} color="#f59e0b" /> Tip: Tap on a product and use "Chat with Seller" to start a conversation
      </div>
    </div>
  );
}
