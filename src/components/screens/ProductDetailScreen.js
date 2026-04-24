'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useSaveToggle } from '@/hooks/useRealtimeData';

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

export default function ProductDetailScreen({ product, onBack, onChat }) {
  const { user } = useAuth();
  const { isSaved, toggling, toggle } = useSaveToggle(user?.uid, product);
  const [activeDot, setActiveDot] = useState(0);

  if (!product) return null;

  // Support both mock data shape (product.image) and Firestore shape (product.imageUrl)
  const imageUrl = product.imageUrl || product.image;
  const sellerName = product.seller?.name || product.sellerName || 'Seller';
  const sellerAvatar = product.seller?.avatar || sellerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sellerCollege = product.seller?.college || 'IIT Delhi';
  const sellerVerified = product.seller?.verified !== undefined ? product.seller.verified : true;
  const sellerRating = product.seller?.rating || 4.5;
  const sellerReviews = product.seller?.reviews || 0;

  return (
    <div className="detail-page animate-fade-in" id="product-detail-page">
      {/* Image Section */}
      <div className="detail-image-container">
        <button
          className="detail-back"
          onClick={onBack}
          id="detail-back-button"
          aria-label="Go back"
        >
          ←
        </button>
        <button
          className="detail-share"
          id="detail-share-button"
          aria-label="Share product"
        >
          ↗️
        </button>
        <SafeImage
          src={imageUrl}
          alt={product.title}
          fill
          sizes="100vw"
          style={{ objectFit: 'cover' }}
          loading="eager"
        />
        <div className="detail-image-dots">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`detail-dot ${activeDot === i ? 'active' : ''}`}
              onClick={() => setActiveDot(i)}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="detail-body">
        {/* Price & Condition */}
        <div className="detail-price-row">
          <span className="detail-price" id="detail-price">₹{product.price?.toLocaleString()}</span>
          <span className={`detail-condition ${(product.condition || 'used').toLowerCase()}`}>
            {product.condition === 'New' ? '✨ ' : '♻️ '}{product.condition || 'Used'}
          </span>
        </div>

        {/* Title */}
        <h1 className="detail-title" id="detail-title">{product.title}</h1>

        {/* Posted Time */}
        <p className="detail-posted">
          Posted {product.postedAt || (product.createdAt?.toDate ? product.createdAt.toDate().toLocaleDateString() : 'recently')}
        </p>

        <div className="detail-divider"></div>

        {/* Seller Card */}
        <div className="seller-card" id="seller-card">
          <div className="seller-avatar">{sellerAvatar}</div>
          <div className="seller-info">
            <div className="seller-name">
              {sellerName}
              {sellerVerified && (
                <span className="verified-badge">
                  ✅ Verified
                </span>
              )}
            </div>
            <div className="seller-college">{sellerCollege}</div>
          </div>
          <div className="seller-rating">
            <span>⭐</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {sellerRating}
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
              ({sellerReviews})
            </span>
          </div>
        </div>

        <div className="detail-divider"></div>

        {/* Description */}
        <div>
          <h2 className="detail-section-title">Description</h2>
          <p className="detail-description" id="detail-description">
            {product.description}
          </p>
        </div>

        {/* Location */}
        {product.location && (
          <div className="detail-location" id="detail-location">
            <span className="detail-location-icon">📍</span>
            <span>{product.location}</span>
          </div>
        )}

        {/* Saves Count */}
        {product.savesCount > 0 && (
          <div style={{
            marginTop: 'var(--space-md)',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            ❤️ {product.savesCount} {product.savesCount === 1 ? 'person' : 'people'} saved this
          </div>
        )}

        {/* Price comparison if original price exists */}
        {product.originalPrice && (
          <div style={{
            marginTop: 'var(--space-xl)',
            padding: 'var(--space-md) var(--space-lg)',
            background: 'rgba(34, 197, 94, 0.06)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <span style={{ fontSize: '18px' }}>💰</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-dark)' }}>
                You save ₹{(product.originalPrice - product.price).toLocaleString()}!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Original price: ₹{product.originalPrice.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="detail-bottom-bar" id="detail-bottom-bar">
        <button
          className="btn-chat"
          onClick={onChat}
          id="chat-with-seller-button"
        >
          <span>💬</span>
          Chat with Seller
        </button>
        <button
          className={`btn-save ${isSaved ? 'saved' : ''}`}
          onClick={toggle}
          id="save-product-button"
          aria-label="Save product"
          disabled={toggling}
          style={{ opacity: toggling ? 0.6 : 1 }}
        >
          {isSaved ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  );
}
