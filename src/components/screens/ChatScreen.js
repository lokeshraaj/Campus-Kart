'use client';
import { useState } from 'react';
import { chatMessages } from '@/data/mockData';

export default function ChatScreen({ chat, onBack }) {
  const [messages, setMessages] = useState(chatMessages);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        id: prev.length + 1,
        text: input,
        sent: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="chat-page animate-fade-in" id="chat-page">
      {/* Header */}
      <div className="chat-header" id="chat-header">
        <button className="chat-header-back" onClick={onBack} aria-label="Go back">
          ←
        </button>
        <div className="chat-header-avatar">{chat.avatar}</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{chat.name}</div>
          <div className="chat-header-status">Online</div>
        </div>
        <button className="chat-mark-sold" id="mark-sold-button">
          ✅ Mark as Sold
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-message ${msg.sent ? 'sent' : 'received'}`}
          >
            <div>{msg.text}</div>
            <div className="chat-message-time">{msg.time}</div>
          </div>
        ))}
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
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          id="chat-send-button"
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
