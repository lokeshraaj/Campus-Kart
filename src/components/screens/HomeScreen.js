'use client';
import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRecentlyAdded, useBestDeals, useSaveToggle } from '@/hooks/useRealtimeData';
import { products as mockProducts, categories, bestDeals as mockDeals } from '@/data/mockData';

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
      {saved ? '❤️' : '🤍'}
    </button>
  );
}

export default function HomeScreen({ onProductClick }) {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState(null);

  // Toast handler for real-time errors
  const handleRealtimeError = useCallback((msg) => {
    showToast(msg, 'info', 5000);
  }, [showToast]);

  // ── Real-time feeds from Firestore ──
  const {
    products: realtimeProducts,
    loading: productsLoading,
  } = useRecentlyAdded(20, { onError: handleRealtimeError });

  const {
    deals: realtimeDeals,
    loading: dealsLoading,
  } = useBestDeals(6, { onError: handleRealtimeError });

  // ── Use Firestore data when available, otherwise fall back to mock ──
  const products = realtimeProducts.length > 0 ? realtimeProducts : mockProducts;
  const deals = realtimeDeals.length > 0 ? realtimeDeals : mockDeals;

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

  return (
    <div className="animate-fade-in">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-inner">
          <div className="search-bar" id="home-search-bar">
            <span className="search-bar-icon">🔍</span>
            <input
              type="text"
              placeholder="Search books, notes, gadgets…"
              readOnly
            />
          </div>
          <button className="notification-btn" id="notification-button" aria-label="Notifications">
            🔔
            <span className="notification-badge"></span>
          </button>
        </div>
      </div>

      {/* College Banner */}
      <div style={{ padding: 'var(--space-lg) 0 0' }}>
        <div className="college-banner" id="college-banner">
          <span className="college-banner-icon">🏫</span>
          <span>Only students from <strong>IIT Delhi</strong> can see your listings</span>
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

      {/* Best Deals Section */}
      <div>
        <div className="section-header">
          <h2 className="section-title">
            Best Deals 🔥
          </h2>
          <button className="section-link" id="view-all-deals">
            View All
            <span>→</span>
          </button>
        </div>

        {dealsLoading ? (
          <div style={{ padding: '0 var(--space-lg)', display: 'flex', gap: 'var(--space-md)' }}>
            {[1, 2].map(i => (
              <div key={i} style={{
                minWidth: 260, height: 110, borderRadius: 'var(--radius-xl)',
                background: 'var(--bg-secondary)', animation: 'pulse 1.5s infinite',
              }} />
            ))}
          </div>
        ) : (
          <div className="deals-scroll" id="deals-scroll">
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
                    src={deal.imageUrl || deal.image}
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

      {/* Recently Added Section */}
      <div className="section-header">
        <h2 className="section-title">
          Recently Added ✨
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
          <span>↕️</span>
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
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                aspectRatio: '1', background: 'var(--bg-secondary)',
                animation: 'pulse 1.5s infinite',
              }} />
              <div style={{ padding: 'var(--space-md)' }}>
                <div style={{
                  height: 14, width: '80%', borderRadius: 4,
                  background: 'var(--bg-secondary)', marginBottom: 8,
                }} />
                <div style={{
                  height: 18, width: '40%', borderRadius: 4,
                  background: 'var(--bg-secondary)',
                }} />
              </div>
            </div>
          ))}
        </div>
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
                  src={product.imageUrl || product.image}
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
                    {product.badge === 'hot' ? '🔥 Hot' : '✨ New'}
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

      <div style={{ height: 'var(--space-3xl)' }}></div>
    </div>
  );
}
