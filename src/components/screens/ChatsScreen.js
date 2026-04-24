'use client';
import { chatsList } from '@/data/mockData';

export default function ChatsScreen({ onChatClick }) {
  return (
    <div className="chats-list-page animate-fade-in" id="chats-screen">
      <div className="chats-list-header">
        <h1 className="chats-list-title">Messages</h1>
      </div>

      {chatsList.map(chat => (
        <div
          key={chat.id}
          className="chat-list-item"
          onClick={() => onChatClick(chat)}
          id={`chat-item-${chat.id}`}
        >
          <div className="chat-list-avatar">{chat.avatar}</div>
          <div className="chat-list-content">
            <div className="chat-list-name">{chat.name}</div>
            <div className="chat-list-message">
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{chat.product} · </span>
              {chat.lastMessage}
            </div>
          </div>
          <div className="chat-list-meta">
            <span className="chat-list-time">{chat.time}</span>
            {chat.unread > 0 && (
              <span className="chat-list-unread">{chat.unread}</span>
            )}
          </div>
        </div>
      ))}

      {/* Empty state hint */}
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-3xl) var(--space-2xl)',
        color: 'var(--text-tertiary)',
        fontSize: '13px',
      }}>
        💡 Tip: Tap on a product and use "Chat with Seller" to start a conversation
      </div>
    </div>
  );
}
