'use client';

import React, { useState, useCallback } from 'react';
import { MapPin, Mail, BookOpen, Package, Heart, CheckCircle, Settings, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { logout } from '@/lib/authService';
import { useMyListings, useSoldItems, useSavedItems } from '@/hooks/useRealtimeData';
import { markAsSold } from '@/lib/productService';
import { useSuccessPopup } from '@/components/SuccessPopup';
import toast from 'react-hot-toast';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { showSuccess } = useSuccessPopup();
  const [activeTab, setActiveTab] = useState('listings');

  const handleRealtimeError = useCallback((msg) => {
    showToast(msg, 'info', 5000);
  }, [showToast]);

  // Real-time Firestore hooks — no mock data
  const { listings, loading: listingsLoading } = useMyListings(user?.uid, { onError: handleRealtimeError });
  const { soldItems, loading: soldLoading } = useSoldItems(user?.uid, { onError: handleRealtimeError });
  const { savedItems, loading: savedLoading } = useSavedItems(user?.uid, { onError: handleRealtimeError });

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const avatarText = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const userEmail = user?.email || '';

  // Live Display State (Updated only on Save)
  const [profileData, setProfileData] = useState({
    name: displayName,
    university: 'Ramgarh Engineering College',
    branch: 'Computer Science and Engineering',
    bio: 'Full-stack developer building cool things for the web.'
  });

  // Form State for Edit Profile
  const [formData, setFormData] = useState({
    name: profileData.name,
    email: userEmail,
    university: profileData.university,
    branch: profileData.branch,
    bio: profileData.bio
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setProfileData({
      name: formData.name,
      university: formData.university,
      branch: formData.branch,
      bio: formData.bio
    });
    console.log('Save to Firebase triggered:', formData);
    toast.success('Profile updated successfully!');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out');
    } catch (err) {
      console.error('Logout failed:', err.message);
      toast.error('Logout failed');
    }
  };

  const handleMarkSold = async (productId) => {
    try {
      await markAsSold(productId);
      showSuccess('Item Sold!', 'Congratulations! Your item has been marked as sold.');
    } catch (err) {
      console.error('Failed to mark as sold:', err);
      toast.error('Failed to mark item as sold');
    }
  };

  /** Renders a product list for the tab content */
  const renderProductList = (items, loading, emptyIcon, emptyTitle, emptyDesc, showSoldBadge = false, showMarkSoldButton = false) => {
    if (loading) {
      return (
        <div className="empty-state">
          <Loader2 size={32} strokeWidth={2} className="empty-icon animate-spin" />
          <p>Loading…</p>
        </div>
      );
    }

    if (!items || items.length === 0) {
      return (
        <div className="empty-state">
          {emptyIcon}
          <h3>{emptyTitle}</h3>
          <p>{emptyDesc}</p>
        </div>
      );
    }

    return (
      <div className="product-list">
        {items.map(product => (
          <div key={product.id} className="product-row">
            <div className="product-img-wrapper">
              {(product.imageUrl || product.image) ? (
                <img src={product.imageUrl || product.image} alt={product.title} />
              ) : (
                <div className="product-img-placeholder" />
              )}
            </div>
            <div className="product-info">
              <div className="product-title">{product.title}</div>
              <div className="product-price">₹{product.price?.toLocaleString()}</div>
            </div>
            {showSoldBadge && <span className="sold-badge-tag">SOLD</span>}
            {showMarkSoldButton && (
              <button 
                onClick={() => handleMarkSold(product.id)}
                className="mark-sold-btn"
              >
                Mark Sold
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="profile-wrapper">
      <div className="profile-grid">
        
        {/* LEFT COLUMN: Profile Summary (Sticky) */}
        <div className="profile-sidebar">
          <div className="profile-card text-center">
            <div className="avatar-container">
              <div className="avatar">{avatarText}</div>
              <span className="verified-badge">✓ Verified</span>
            </div>
            
            <h1 className="user-name">{profileData.name}</h1>
            <p className="user-bio">{profileData.bio}</p>

            <div className="info-list">
              <div className="info-item">
                <Mail size={16} strokeWidth={2} className="icon" />
                <span>{userEmail}</span>
              </div>
              <div className="info-item">
                <BookOpen size={16} strokeWidth={2} className="icon" />
                <span>{profileData.university}</span>
              </div>
              <div className="info-item">
                <MapPin size={16} strokeWidth={2} className="icon" />
                <span>{profileData.branch}</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-num">{listingsLoading ? '–' : listings.length}</span>
                <span className="stat-label">Listings</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{soldLoading ? '–' : soldItems.length}</span>
                <span className="stat-label">Sold</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{savedLoading ? '–' : savedItems.length}</span>
                <span className="stat-label">Saved</span>
              </div>
            </div>

            {/* Logout button */}
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={16} strokeWidth={2} /> Log Out
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Content */}
        <div className="profile-main">
          <div className="profile-card main-card">
            
            {/* Tab Navigation */}
            <div className="tabs-header">
              <button 
                className={`tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
                onClick={() => setActiveTab('listings')}
              >
                <Package size={18} strokeWidth={2} /> My Listings
              </button>
              <button 
                className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
                onClick={() => setActiveTab('saved')}
              >
                <Heart size={18} strokeWidth={2} /> Saved
              </button>
              <button 
                className={`tab-btn ${activeTab === 'sold' ? 'active' : ''}`}
                onClick={() => setActiveTab('sold')}
              >
                <CheckCircle size={18} strokeWidth={2} /> Sold Items
              </button>
              <button 
                className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
                onClick={() => setActiveTab('edit')}
              >
                <Settings size={18} strokeWidth={2} /> Edit Profile
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              
              {activeTab === 'listings' && renderProductList(
                listings, 
                listingsLoading,
                <Package size={40} strokeWidth={1.5} className="empty-icon" />,
                'No Active Listings',
                'Items you list for sale will appear here.',
                false, // showSoldBadge
                true // showMarkSoldButton
              )}

              {activeTab === 'saved' && renderProductList(
                savedItems,
                savedLoading,
                <Heart size={40} strokeWidth={1.5} className="empty-icon" />,
                'No Saved Items',
                'Your bookmarked deals will show up here.'
              )}

              {activeTab === 'sold' && renderProductList(
                soldItems,
                soldLoading,
                <CheckCircle size={40} strokeWidth={1.5} className="empty-icon" />,
                'No Sold Items',
                'Track the items you\'ve successfully sold.',
                true
              )}

              {activeTab === 'edit' && (
                <form className="edit-form" onSubmit={handleSave}>
                  <h2 className="form-title">Profile Settings</h2>
                  
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} readOnly className="read-only" />
                    <span className="help-text">Email cannot be changed once verified.</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>University</label>
                      <input type="text" name="university" value={formData.university} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Branch / Major</label>
                      <input type="text" name="branch" value={formData.branch} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Short Bio</label>
                    <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows="3"></textarea>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary">Save Changes</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Localized CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .profile-wrapper {
          background-color: #F9FAFB;
          min-height: 100vh;
          padding: 1rem;
          font-family: Inter, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        }

        @media (min-width: 768px) {
          .profile-wrapper {
            padding: 2rem 1.5rem;
          }
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (min-width: 1024px) {
          .profile-grid {
            grid-template-columns: 320px 1fr;
            align-items: start;
          }
        }

        .profile-card {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #E5E7EB;
        }

        .profile-sidebar {
          position: sticky;
          top: 2rem;
        }

        .main-card {
          min-height: 600px;
        }

        /* Avatar & User Info */
        .text-center { text-align: center; }
        
        .avatar-container {
          position: relative;
          display: inline-block;
          margin-bottom: 1rem;
        }

        .avatar {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: #0F172A;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 600;
          margin: 0 auto;
        }

        .verified-badge {
          position: absolute;
          bottom: 0;
          right: -10px;
          background: #10B981;
          color: white;
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 12px;
          font-weight: 600;
          border: 2px solid white;
        }

        .user-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 0.5rem 0;
        }

        .user-bio {
          font-size: 0.875rem;
          color: #64748B;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
          margin-bottom: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #E5E7EB;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #475569;
          font-size: 0.875rem;
        }

        .icon {
          color: #94A3B8;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #E5E7EB;
        }

        .stat-box {
          display: flex;
          flex-direction: column;
        }

        .stat-num {
          font-size: 1.125rem;
          font-weight: 700;
          color: #0F172A;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 2px;
        }

        /* Logout Button */
        .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          margin-top: 1.5rem;
          padding: 0.625rem;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: white;
          color: #0F172A;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .logout-button:hover {
          background: #FEE2E2;
          color: #EF4444;
          border-color: #FECACA;
        }

        /* Tabs */
        .tabs-header {
          display: flex;
          gap: 2rem;
          border-bottom: 1px solid #E5E7EB;
          margin-bottom: 2rem;
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none;  /* IE and Edge */
        }
        .tabs-header::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 0 1rem 0;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 0.9rem;
          font-weight: 500;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: #0F172A;
        }

        .tab-btn.active {
          color: #0F172A;
          border-bottom-color: #0F172A;
        }

        /* Empty States */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          color: #64748B;
        }

        .empty-icon {
          color: #CBD5E1;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: #0F172A;
          margin: 0 0 0.5rem 0;
          font-weight: 600;
        }

        /* Product Lists inside Tabs */
        .product-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .product-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 8px;
          transition: background 0.15s ease;
        }

        .product-row:hover {
          background: #F9FAFB;
        }

        .product-img-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          overflow: hidden;
          background: #F1F5F9;
          border: 1px solid #E5E7EB;
          flex-shrink: 0;
        }

        .product-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-img-placeholder {
          width: 100%;
          height: 100%;
          background: #E2E8F0;
        }

        .product-info {
          flex: 1;
          min-width: 0;
        }

        .product-title {
          font-size: 0.875rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #0F172A;
          margin-bottom: 2px;
        }

        .product-price {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0F172A;
        }

        .sold-badge-tag {
          font-size: 0.65rem;
          font-weight: 600;
          color: #16A34A;
          background: #DCFCE7;
          padding: 2px 8px;
          border-radius: 12px;
          letter-spacing: 0.05em;
        }

        .mark-sold-btn {
          margin-left: auto;
          font-size: 0.75rem;
          font-weight: 600;
          color: #0F172A;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .mark-sold-btn:hover {
          background: #E2E8F0;
        }

        /* Spin animation */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        /* Form Styling */
        .edit-form {
          max-width: 600px;
        }

        .form-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #0F172A;
          margin: 0 0 1.5rem 0;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #334155;
          margin-bottom: 0.5rem;
        }

        input, textarea {
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.875rem;
          color: #0F172A;
          transition: border-color 0.2s;
        }

        input:focus, textarea:focus {
          outline: none;
          border-color: #0F172A;
          box-shadow: 0 0 0 1px #0F172A;
        }

        input.read-only {
          background: #F8FAFC;
          color: #94A3B8;
          cursor: not-allowed;
        }

        .help-text {
          display: block;
          font-size: 0.75rem;
          color: #94A3B8;
          margin-top: 0.25rem;
        }

        .btn-primary {
          background: #0F172A;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #1E293B;
        }
      `}} />
    </div>
  );
}