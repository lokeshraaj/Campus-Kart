'use client';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'add', icon: '+', label: 'Add', isCenter: true },
    { id: 'chats', icon: '💬', label: 'Chats' },
    { id: 'profile', icon: '👤', label: 'Profile' },
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
                <span>+</span>
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
