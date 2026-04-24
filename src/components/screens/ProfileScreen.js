'use client';
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { logout } from '@/lib/authService';
import { useMyListings, useSoldItems, useSavedItems } from '@/hooks/useRealtimeData';
import { userProfile } from '@/data/mockData';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState(null);

  // Toast handler for real-time errors
  const handleRealtimeError = useCallback((msg) => {
    showToast(msg, 'info', 5000);
  }, [showToast]);

  // ── Real-time data feeds ──
  const { listings, loading: listingsLoading } = useMyListings(user?.uid, { onError: handleRealtimeError });
  const { soldItems, loading: soldLoading } = useSoldItems(user?.uid, { onError: handleRealtimeError });
  const { savedItems, loading: savedLoading } = useSavedItems(user?.uid, { onError: handleRealtimeError });

  // Derive display values from the Firebase user, falling back to mock data
  const displayName = user?.displayName || user?.email?.split('@')[0] || userProfile.name;
  const avatarText = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const college = userProfile.college;
  const branch = userProfile.branch;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err.message);
    }
  };

  // Build menu items with live counts
  const menuItems = [
    {
      section: 'My Activity',
      items: [
        {
          icon: '📦', label: 'My Listings', id: 'my-listings',
          desc: listingsLoading ? 'Loading…' : `${listings.length} active listings`,
          count: listings.length,
          data: listings,
        },
        {
          icon: '❤️', label: 'Saved Items', id: 'saved-items',
          desc: savedLoading ? 'Loading…' : `${savedItems.length} items saved`,
          count: savedItems.length,
          data: savedItems,
        },
        {
          icon: '✅', label: 'Sold Items', id: 'sold-items',
          desc: soldLoading ? 'Loading…' : `${soldItems.length} items sold`,
          count: soldItems.length,
          data: soldItems,
        },
      ],
    },
    {
      section: 'Settings',
      items: [
        { icon: '🔔', label: 'Notifications', desc: 'Manage push notifications', id: 'notifications' },
        { icon: '🔒', label: 'Privacy', desc: 'Manage your privacy settings', id: 'privacy' },
        { icon: '🎨', label: 'Appearance', desc: 'Theme and display', id: 'appearance' },
        { icon: '❓', label: 'Help & Support', desc: 'FAQs and contact us', id: 'help' },
      ],
    },
  ];

  // ── Expandable section renderer ──
  const renderExpandedSection = (item) => {
    if (!item.data || item.data.length === 0) {
      return (
        <div style={{
          padding: 'var(--space-xl)',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--text-tertiary)',
        }}>
          {item.id === 'my-listings' && '📦 No active listings yet. Tap + to sell something!'}
          {item.id === 'saved-items' && '❤️ No saved items. Browse the feed and save what you like!'}
          {item.id === 'sold-items' && '✅ Nothing sold yet. Your first sale is coming!'}
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)',
        padding: '0 var(--space-lg) var(--space-md)',
      }}>
        {item.data.map(product => (
          <div key={product.id} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
            padding: 'var(--space-sm)',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-sm)',
              overflow: 'hidden', flexShrink: 0,
              background: 'var(--bg-secondary)',
            }}>
              {(product.imageUrl || product.image) && (
                <img
                  src={product.imageUrl || product.image}
                  alt={product.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px', fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {product.title}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>
                ₹{product.price?.toLocaleString()}
              </div>
            </div>
            {item.id === 'sold-items' && (
              <span style={{
                fontSize: '10px', fontWeight: 700, color: 'var(--accent-dark)',
                background: 'rgba(34, 197, 94, 0.1)',
                padding: '2px 8px', borderRadius: 'var(--radius-full)',
              }}>SOLD</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="profile-page animate-fade-in" id="profile-screen">
      {/* Header */}
      <div className="profile-header" id="profile-header">
        <div className="profile-avatar">{avatarText}</div>
        <div className="profile-name">
          {displayName}
          <span className="verified-badge">✅ Verified</span>
        </div>
        <div className="profile-college">
          {college} · {branch}
        </div>
        {user?.email && (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {user.email}
          </div>
        )}

        {/* Live Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">
              {listingsLoading ? '…' : listings.length}
            </div>
            <div className="profile-stat-label">Listings</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">
              {soldLoading ? '…' : soldItems.length}
            </div>
            <div className="profile-stat-label">Sold</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">
              {savedLoading ? '…' : savedItems.length}
            </div>
            <div className="profile-stat-label">Saved</div>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="profile-menu">
        {menuItems.map((section, i) => (
          <div key={i} className="profile-menu-section">
            <div className="profile-menu-section-title">{section.section}</div>
            {section.items.map((item) => (
              <div key={item.id}>
                <div
                  className="profile-menu-item"
                  id={`profile-${item.id}`}
                  onClick={() => {
                    if (item.data !== undefined) {
                      setActiveSection(activeSection === item.id ? null : item.id);
                    }
                  }}
                  style={{ cursor: item.data !== undefined ? 'pointer' : 'default' }}
                >
                  <div className="profile-menu-icon">{item.icon}</div>
                  <div className="profile-menu-text">
                    <div className="profile-menu-label">{item.label}</div>
                    <div className="profile-menu-desc">{item.desc}</div>
                  </div>
                  <span className="profile-menu-arrow" style={{
                    transform: activeSection === item.id ? 'rotate(90deg)' : 'none',
                    transition: 'transform 200ms ease',
                  }}>›</span>
                </div>

                {/* Expandable content */}
                {activeSection === item.id && item.data !== undefined && (
                  <div style={{ animation: 'slideDown 250ms ease-out' }}>
                    {renderExpandedSection(item)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Logout */}
        <button
          className="btn-secondary"
          onClick={handleLogout}
          id="logout-button"
          style={{
            marginTop: 'var(--space-lg)',
            color: 'var(--error)',
            borderColor: 'var(--error-light)',
            background: 'var(--error-light)',
          }}
        >
          🚪 Log Out
        </button>

        <div style={{
          textAlign: 'center',
          padding: 'var(--space-xl)',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
        }}>
          CampusKart v1.0.0
        </div>
      </div>
    </div>
  );
}
