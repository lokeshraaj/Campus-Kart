'use client';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', icon: <Home size={20} strokeWidth={2} />, label: 'Home' },
    { id: 'search', icon: <Search size={20} strokeWidth={2} />, label: 'Search' },
    { id: 'add', icon: <PlusSquare size={20} strokeWidth={2} />, label: 'Add', isCenter: true },
    { id: 'chats', icon: <MessageCircle size={20} strokeWidth={2} />, label: 'Chats' },
    { id: 'profile', icon: <User size={20} strokeWidth={2} />, label: 'Profile' },
  ];

  return (
    <nav className="bottom-nav" id="bottom-navigation">
      {tabs.map((tab) => {
        if (tab.isCenter) {
          return (
            <button
              key={tab.id}
              className="nav-item nav-item-add"
              onClick={() => onTabChange(tab.id)}
              id="nav-add-button"
              aria-label="Add new product"
            >
              <div className="nav-add-btn">
                <PlusSquare size={24} strokeWidth={2} />
              </div>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            id={`nav-${tab.id}`}
            aria-label={tab.label}
          >
            <span className="nav-item-icon">{tab.icon}</span>
            <span className="nav-item-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
