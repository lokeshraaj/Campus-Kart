'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Search, Bell, GraduationCap, Flame, Sparkles, Heart, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRecentlyAdded, useBestDeals, useSaveToggle } from '@/hooks/useRealtimeData';
import { isExpiredChat, subscribeToUserChats } from '@/lib/chatService';
import { categories } from '@/data/mockData';

// Tiny shimmer SVG encoded as a data URI — used as a blur placeholder
// while images lazy-load, preventing layout shift and blank flashes.
const SHIMMER_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f0f0f0"/>
          <stop offset="50%" stop-color="#e0e0e0"/>
          <stop offset="100%" stop-color="#f0f0f0"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g)"/>
    </svg>`.replace(/\s+/g, ' ')
  );

/**
 * Image component with built-in error handling and fallback UI.
 */
function SafeImage({ src, alt, ...props }) {
  const [error, setError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fallbackSrc = 'https://placehold.co/400x400/png?text=No+Image';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Skeleton Shimmer UI */}
      {!isLoaded && (
        <div 
          className="image-placeholder-empty" 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}
        />
      )}
      
      <Image
        src={error || !src ? fallbackSrc : src}
        alt={alt || 'Image'}
        onError={() => {
          setError(true);
          setIsLoaded(true);
        }}
        onLoad={() => setIsLoaded(true)}
        unoptimized={true}
        {...props}
        style={{
          ...props.style,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.4s ease-in-out',
        }}
      />
    </div>
  );
}

/**
 * Small wishlist button that integrates with Firebase saved items
 * when a user is logged in, otherwise uses local state.
 */
function WishlistButton({ product }) {
  const { user } = useAuth();
  const { isSaved, toggling, toggle } = useSaveToggle(user?.uid, product);
  const [localSaved, setLocalSaved] = useState(false);

  const saved = user ? isSaved : localSaved;

  const handleClick = (e) => {
    e.stopPropagation();
    if (user) {
      toggle();
    } else {
      setLocalSaved(!localSaved);
    }
  };

  return (
    <button
      className={`product-card-wishlist ${saved ? 'liked' : ''}`}
      onClick={handleClick}
      aria-label="Toggle wishlist"
      disabled={toggling}
      style={{ opacity: toggling ? 0.5 : 1 }}
    >
      <Heart size={18} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} color={saved ? '#ea580c' : 'currentColor'} />
    </button>
  );
}

export default function HomeScreen({ onProductClick, onSearchClick }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const handleNotificationClick = () => {
    const message = notificationCount > 0
      ? `You have ${notificationCount} recent message ${notificationCount === 1 ? 'notification' : 'notifications'}. Open Messages to reply.`
      : 'No new notifications right now.';
    showToast(message, 'info', 3000);
  };

  // Toast handler for real-time errors
  const handleRealtimeError = useCallback((msg) => {
    showToast(msg, 'info', 5000);
  }, [showToast]);

  useEffect(() => {
    if (!user?.uid) {
      setNotificationCount(0);
      return;
    }

    const unsubscribe = subscribeToUserChats(user.uid, (chatData) => {
      const count = chatData.filter((chat) => (
        !isExpiredChat(chat) &&
        chat.lastMessage &&
        chat.lastMessageSenderId !== user.uid
      )).length;
      setNotificationCount(count);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // ── Real-time feeds from Firestore ──
  const {
    products: realtimeProducts,
    loading: productsLoading,
  } = useRecentlyAdded(20, { onError: handleRealtimeError });

  const {
    deals: realtimeDeals,
    loading: dealsLoading,
  } = useBestDeals(6, { onError: handleRealtimeError });

  // ── Use Firestore data directly — no mock fallback ──
  const products = realtimeProducts;
  const deals = realtimeDeals;

  // ── Filtering & sorting (client-side on the streamed data) ──
  const filteredProducts = useMemo(() => {
    let filtered = activeCategory === 'all'
      ? products
      : products.filter(p => p.category === activeCategory);

    if (sortOrder === 'low-high') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'high-low') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    }

    return filtered;
  }, [products, activeCategory, sortOrder]);

  /** Polished skeleton card for product grid */
  const SkeletonProductCard = () => (
    <div style={{
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      border: '1px solid var(--border)', background: '#fff',
    }}>
      <div style={{
        aspectRatio: '1', background: 'linear-gradient(110deg, #F1F5F9 30%, #E8EDF2 50%, #F1F5F9 70%)',
        backgroundSize: '200% 100%', animation: 'skeletonShimmer 1.5s ease-in-out infinite',
      }} />
      <div style={{ padding: 'var(--space-md)' }}>
        <div style={{ height: 14, width: '80%', borderRadius: 6, background: '#E2E8F0', marginBottom: 10 }} />
        <div style={{ height: 18, width: '40%', borderRadius: 6, background: '#E2E8F0', marginBottom: 8 }} />
        <div style={{ height: 12, width: '60%', borderRadius: 6, background: '#F1F5F9' }} />
      </div>
    </div>
  );

  /** Polished skeleton card for deals row */
  const SkeletonDealCard = () => (
    <div style={{
      minWidth: 260, height: 110, borderRadius: 'var(--radius-xl)',
      background: 'linear-gradient(110deg, #F1F5F9 30%, #E8EDF2 50%, #F1F5F9 70%)',
      backgroundSize: '200% 100%', animation: 'skeletonShimmer 1.5s ease-in-out infinite',
      display: 'flex', alignItems: 'center', padding: '16px', gap: '12px',
    }}>
      <div style={{ width: 72, height: 72, borderRadius: 10, background: '#E2E8F0', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, width: '70%', borderRadius: 6, background: '#E2E8F0', marginBottom: 10 }} />
        <div style={{ height: 16, width: '40%', borderRadius: 6, background: '#E2E8F0', marginBottom: 8 }} />
        <div style={{ height: 12, width: '50%', borderRadius: 6, background: '#F1F5F9' }} />
      </div>
    </div>
  );

  /** Empty state component */
  const EmptyState = ({ title, subtitle, icon }) => (
    <div style={{
      textAlign: 'center', padding: 'var(--space-5xl) var(--space-2xl)',
      color: 'var(--text-tertiary)',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto var(--space-lg)',
      }}>
        {icon}
      </div>
      <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
        {subtitle}
      </p>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Skeleton shimmer keyframe */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}} />

      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-inner">
          <div className="search-bar" id="home-search-bar" onClick={onSearchClick} style={{ cursor: 'pointer' }}>
            <span className="search-bar-icon"><Search size={16} strokeWidth={2} /></span>
            <input
              type="text"
              placeholder="Search books, notes, gadgets…"
              readOnly
              style={{ cursor: 'pointer' }}
            />
          </div>
          <button
            className="notification-btn"
            id="notification-button"
            aria-label="Notifications"
            onClick={handleNotificationClick}
            type="button"
          >
            <Bell size={18} strokeWidth={2} />
            {notificationCount > 0 && <span className="notification-badge"></span>}
          </button>
        </div>
      </div>

      {/* College Banner */}
      <div style={{ padding: 'var(--space-lg) 0 0' }}>
        <div className="college-banner" id="college-banner">
          <span className="college-banner-icon"><GraduationCap size={18} strokeWidth={2} /></span>
          <span>Only students from <strong>your college</strong> can see your listings</span>
        </div>
      </div>

      {/* Category Chips */}
      <div className="category-section">
        <div className="category-scroll" id="category-scroll">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              id={`category-${cat.id}`}
            >
              <span className="category-chip-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="home-desktop-grid">
        {/* Left Column: Best Deals */}
        <div className="home-deals-col">
          <div className="section-header">
            <h2 className="section-title">
              Best Deals <Flame size={18} strokeWidth={2} color="#ea580c" style={{ marginLeft: 4 }} />
            </h2>
            <button className="section-link" id="view-all-deals">
              View All
              <span>→</span>
            </button>
          </div>

          {dealsLoading ? (
            <div style={{ padding: '0 var(--space-lg)', display: 'flex', gap: 'var(--space-md)' }}>
              {[1, 2].map(i => <SkeletonDealCard key={i} />)}
            </div>
          ) : deals.length === 0 ? (
            <EmptyState
              title="No deals yet"
              subtitle="When items are listed, the best deals will appear here."
              icon={<Flame size={32} strokeWidth={1.5} color="#CBD5E1" />}
            />
          ) : (
            <div className="deals-scroll desktop-deals-col" id="deals-scroll">
              {deals.map(deal => (
                <div
                  key={deal.id}
                  className="deal-card"
                  onClick={() => {
                    const product = products.find(p => p.id === deal.id) || deal;
                    onProductClick(product);
                  }}
                  id={`deal-${deal.id}`}
                >
                  <div className="deal-card-image">
                    <SafeImage
                      src={deal.images?.[0] || deal.imageUrl || deal.image}
                      alt={deal.title}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'cover' }}
                      placeholder="blur"
                      blurDataURL={SHIMMER_DATA_URL}
                    />
                  </div>
                  <div className="deal-card-info">
                    <div className="deal-card-title">{deal.title}</div>
                    <div className="deal-card-price">₹{deal.price?.toLocaleString()}</div>
                    {(deal.originalPrice || deal.discount) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {deal.originalPrice && (
                          <span className="deal-card-original">₹{deal.originalPrice.toLocaleString()}</span>
                        )}
                        {deal.discount && (
                          <span className="deal-card-discount">{deal.discount}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recently Added */}
        <div className="home-recent-col">
          <div className="section-header">
            <h2 className="section-title">
              Recently Added <Sparkles size={18} strokeWidth={2} color="#0284c7" style={{ marginLeft: 4 }} />
            </h2>
            <button className="section-link" id="view-all-recent">
              View All
              <span>→</span>
            </button>
          </div>

          {/* Sort Bar */}
          <div className="sort-bar">
            <span className="sort-count">
              {productsLoading ? '…' : `${filteredProducts.length} items`}
            </span>
            <button
              className="sort-btn"
              id="sort-button"
              onClick={() => {
                setSortOrder(prev => {
                  if (prev === null) return 'low-high';
                  if (prev === 'low-high') return 'high-low';
                  return null;
                });
              }}
            >
              <span><ArrowUpDown size={14} strokeWidth={2} /></span>
              <span>
                {sortOrder === 'low-high' && 'Price: Low → High'}
                {sortOrder === 'high-low' && 'Price: High → Low'}
                {!sortOrder && 'Sort'}
              </span>
            </button>
          </div>

          {/* Product Grid */}
          {productsLoading ? (
            <div className="product-grid" id="product-grid">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonProductCard key={i} />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No listings yet"
              subtitle="Be the first to sell something! Tap 'Sell Item' to post your first listing."
              icon={<Sparkles size={32} strokeWidth={1.5} color="#CBD5E1" />}
            />
          ) : (
            <div className="product-grid" id="product-grid">
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => onProductClick(product)}
                  id={`product-${product.id}`}
                >
                  <div className="product-card-image">
                    <SafeImage
                      src={product.images?.[0] || product.imageUrl || product.image}
                      alt={product.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      loading={index < 4 ? 'eager' : 'lazy'}
                      placeholder="blur"
                      blurDataURL={SHIMMER_DATA_URL}
                    />
                    <WishlistButton product={product} />
                    {product.badge && (
                      <span className={`product-card-badge ${product.badge}`}>
                        {product.badge === 'hot' ? 'Hot' : 'New'}
                      </span>
                    )}
                  </div>
                  <div className="product-card-info">
                    <h3 className="product-card-title">{product.title}</h3>
                    <div className="product-card-price">₹{product.price?.toLocaleString()}</div>
                    <div className="product-card-meta">
                      <span>{product.college || product.sellerName || 'Campus'}</span>
                      <span className="product-card-meta-dot"></span>
                      <span>{product.distance || product.condition || ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 'var(--space-3xl)' }}></div>
    </div>
  );
}
