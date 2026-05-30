'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Share2, Sparkles, Recycle, ShieldCheck, Star, MapPin, Heart, MessageCircle, BadgeDollarSign, ImageIcon, Flag, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSaveToggle } from '@/hooks/useRealtimeData';
import { useSuccessPopup } from '@/components/SuccessPopup';
import { rateSeller, reportListing } from '@/lib/productService';
import { getProfileCollegeLine, getProfileDisplayName, getProfileInitials, getUserProfile } from '@/lib/userService';
import toast from 'react-hot-toast';

/**
 * Image component with built-in error handling and fallback UI.
 */
function SafeImage({ src, alt, className, containerStyle, ...props }) {
  const [error, setError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fallbackSrc = 'https://placehold.co/600x600/F1F5F9/94A3B8/png?text=No+Image';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...containerStyle }}>
      {!isLoaded && (
        <div 
          className="image-placeholder-empty" 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}
        />
      )}
      <Image
        src={error || !src ? fallbackSrc : src}
        alt={alt || 'Image'}
        onError={() => { setError(true); setIsLoaded(true); }}
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
  const { isSaved, toggling, toggle: rawToggle } = useSaveToggle(user?.uid, product);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('misleading');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const { showSuccess } = useSuccessPopup();

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadSellerProfile() {
      if (!product?.userId) {
        setSellerProfile(null);
        return;
      }

      try {
        const profile = await getUserProfile(product.userId);
        if (!cancelled) setSellerProfile(profile);
      } catch (err) {
        console.warn('Seller profile could not be loaded:', err?.message || err);
        if (!cancelled) setSellerProfile(null);
      }
    }

    loadSellerProfile();
    return () => {
      cancelled = true;
    };
  }, [product?.userId]);

  if (!product) return null;
  const galleryImages = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.imageUrl || product.image].filter(Boolean);
  // Clamp active index in case images array changed
  const safeIndex = Math.min(activeImageIndex, galleryImages.length - 1);
  const imageUrl = galleryImages[safeIndex] || '';

  const handleToggleSave = async () => {
    await rawToggle();
    if (isSaved) {
      toast('Removed from Saved');
    } else {
      showSuccess('Item Saved!', 'This item has been added to your saved collection.');
    }
  };

  const sellerName = getProfileDisplayName(sellerProfile, product.seller?.name || product.sellerName || 'Seller');
  const sellerAvatar = sellerProfile?.photoURL
    ? null
    : (product.seller?.avatar || getProfileInitials(sellerProfile, sellerName));
  const sellerCollege = getProfileCollegeLine(sellerProfile, product.seller?.college || product.college || 'College not specified');
  const sellerVerified = sellerProfile?.verified ?? sellerProfile?.emailVerified ?? product.seller?.verified ?? true;
  const sellerRating = sellerProfile?.ratingAverage || product.seller?.rating || 4.5;
  const sellerReviews = sellerProfile?.ratingCount || product.seller?.reviews || 0;
  const postedDate = product.postedAt || (product.createdAt?.toDate ? product.createdAt.toDate().toLocaleDateString() : 'recently');
  const canRateSeller = !!user?.uid && user.uid !== product.userId && product.status === 'sold' && !ratingDone;

  const handleRateSeller = async () => {
    if (!selectedRating) {
      toast.error('Please select a star rating first.');
      return;
    }
    try {
      setRatingSubmitting(true);
      await rateSeller({
        productId: product.id,
        sellerId: product.userId,
        rating: selectedRating,
      });
      setRatingDone(true);
      setRatingModalOpen(false);
      showSuccess('Rating Submitted!', 'Thanks for rating the seller.');
    } catch (err) {
      console.error('Failed to submit seller rating:', err);
      toast.error(err?.message || 'Could not submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleShare = async () => {
    const shareText = `${product.title} — ₹${product.price?.toLocaleString() ?? ''} on CampusKart`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://campuskart.app';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: product.title, text: shareText, url: shareUrl });
      } catch (err) {
        // User cancelled — not an error
        if (err.name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        if (typeof navigator === 'undefined') throw new Error('Navigator unavailable');
        if (!navigator.clipboard) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Could not copy link.');
      }
    }
  };

  const handleReportListing = async () => {
    try {
      setReportSubmitting(true);
      await reportListing({
        productId: product.id,
        reason: reportReason,
        details: reportDetails,
      });
      setReportModalOpen(false);
      setReportDetails('');
      showSuccess('Report Submitted', 'Thanks for helping keep CampusKart safe.');
    } catch (err) {
      console.error('Report listing failed:', err);
      toast.error(err?.message || 'Could not submit report');
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* ===== Product Detail — E-commerce Layout ===== */
        .pdp-shell {
          background: #F9FAFB;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        }

        /* Top Nav */
        .pdp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #FFFFFF;
          border-bottom: 1px solid #E5E7EB;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .pdp-topbar-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #0F172A;
          transition: all 0.15s;
        }
        .pdp-topbar-btn:hover {
          background: #F1F5F9;
        }
        .pdp-topbar-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0F172A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 60%;
          text-align: center;
        }

        /* Main Container */
        .pdp-container {
          max-width: 80rem;
          margin: 0 auto;
          padding: 1.5rem 1rem;
        }

        /* 12-Column Grid */
        .pdp-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .pdp-container {
            padding: 2rem;
          }
          .pdp-grid {
            grid-template-columns: repeat(12, 1fr);
            gap: 2.5rem;
          }
        }

        /* LEFT COL — Image Gallery */
        .pdp-left {
          grid-column: span 1;
        }
        @media (min-width: 768px) {
          .pdp-left {
            grid-column: span 5;
            position: sticky;
            top: 5rem;
            align-self: start;
          }
        }

        .pdp-main-image {
          position: relative;
          width: 100%;
          height: 400px;
          background: #F1F5F9;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .pdp-main-image {
            height: 500px;
          }
        }

        /* Thumbnail Gallery */
        .pdp-thumbnails {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
        .pdp-thumb {
          aspect-ratio: 1;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.15s;
          overflow: hidden;
        }
        .pdp-thumb:hover, .pdp-thumb.active {
          border-color: #0F172A;
        }
        .pdp-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Desktop Action Buttons (below image on desktop) */
        .pdp-desktop-actions {
          display: none;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 1.25rem;
        }
        @media (min-width: 768px) {
          .pdp-desktop-actions {
            display: grid;
          }
        }
        .pdp-btn-chat {
          padding: 14px 16px;
          background: #0F172A;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .pdp-btn-chat:hover {
          background: #1E293B;
        }
        .pdp-btn-save {
          padding: 14px 16px;
          background: #FFFFFF;
          border: 1.5px solid #E5E7EB;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          color: #0F172A;
          transition: all 0.2s;
        }
        .pdp-btn-save:hover {
          border-color: #CBD5E1;
          background: #F8FAFC;
        }
        .pdp-btn-save.is-saved {
          background: #FEF2F2;
          border-color: #FCA5A5;
          color: #EF4444;
        }

        /* RIGHT COL — Product Details */
        .pdp-right {
          grid-column: span 1;
        }
        @media (min-width: 768px) {
          .pdp-right {
            grid-column: span 7;
          }
        }

        /* Condition Badge + Date */
        .pdp-meta-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }
        .pdp-condition-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .pdp-condition-badge.new-cond {
          background: rgba(34, 197, 94, 0.08);
          color: #16A34A;
          border: 1px solid rgba(34, 197, 94, 0.15);
        }
        .pdp-condition-badge.used-cond {
          background: rgba(245, 158, 11, 0.08);
          color: #B45309;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }
        .pdp-posted-date {
          font-size: 0.8rem;
          color: #94A3B8;
        }

        /* Title */
        .pdp-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0F172A;
          line-height: 1.35;
          margin: 0 0 1rem 0;
        }

        /* Price Box */
        .pdp-price-box {
          margin-bottom: 1.5rem;
        }
        .pdp-price {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.02em;
        }
        .pdp-price-savings {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 0.5rem;
          padding: 8px 12px;
          background: rgba(34, 197, 94, 0.06);
          border-radius: 8px;
          border: 1px solid rgba(34, 197, 94, 0.12);
        }

        /* Divider */
        .pdp-divider {
          height: 1px;
          background: #E5E7EB;
          margin: 1.5rem 0;
        }

        /* Seller Card */
        .pdp-seller-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 1rem 1.25rem;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }
        .pdp-seller-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #DBEAFE, #BFDBFE);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 700;
          color: #2563EB;
          flex-shrink: 0;
          overflow: hidden;
        }
        .pdp-seller-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pdp-seller-info { flex: 1; min-width: 0; }
        .pdp-seller-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pdp-seller-college {
          font-size: 0.8125rem;
          color: #64748B;
          margin-top: 2px;
        }
        .pdp-seller-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .pdp-verified {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.6875rem;
          font-weight: 600;
          color: #16A34A;
          background: rgba(34, 197, 94, 0.08);
          padding: 2px 6px;
          border-radius: 999px;
        }

        /* Section Blocks */
        .pdp-section {
          margin-bottom: 1.5rem;
        }
        .pdp-section-heading {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.5rem;
        }
        .pdp-section-text {
          font-size: 0.9rem;
          line-height: 1.7;
          color: #334155;
        }

        /* Location Block */
        .pdp-location {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 0.8125rem;
          color: #475569;
        }

        /* Saves Count */
        .pdp-saves {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8125rem;
          color: #94A3B8;
          margin-top: 1rem;
        }

        /* Mobile Bottom Bar (hidden on desktop) */
        .pdp-mobile-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px 16px;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid #E5E7EB;
          display: flex;
          gap: 10px;
          z-index: 50;
        }
        @media (min-width: 768px) {
          .pdp-mobile-bar {
            display: none;
          }
        }
        .pdp-mobile-chat {
          flex: 1;
          height: 48px;
          background: #0F172A;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }
        .pdp-mobile-save {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 1.5px solid #E5E7EB;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .pdp-mobile-save.is-saved {
          background: #FEF2F2;
          border-color: #FCA5A5;
          color: #EF4444;
        }

        @media (max-width: 480px) {
          .pdp-shell {
            min-height: 100svh;
            padding-bottom: calc(76px + env(safe-area-inset-bottom));
          }
          .pdp-topbar {
            padding: 10px 12px;
          }
          .pdp-topbar-btn {
            width: 38px;
            height: 38px;
          }
          .pdp-topbar-title {
            max-width: 58%;
          }
          .pdp-container {
            padding: 12px;
          }
          .pdp-grid {
            gap: 1.25rem;
          }
          .pdp-main-image {
            height: min(74vw, 320px);
            border-radius: 10px;
          }
          .pdp-thumbnails {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
          .pdp-title {
            font-size: 1.25rem;
          }
          .pdp-price {
            font-size: 1.85rem;
          }
          .pdp-seller-card {
            align-items: flex-start;
            padding: 0.875rem;
            gap: 10px;
          }
          .pdp-seller-rating {
            flex-wrap: wrap;
            justify-content: flex-end;
            max-width: 76px;
          }
          .pdp-verified {
            margin-top: 4px;
          }
          .pdp-mobile-bar {
            padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
          }
        }
      `}} />

      <div className="pdp-shell" id="product-detail-page">
        {/* Sticky Top Bar */}
        <div className="pdp-topbar">
          <button className="pdp-topbar-btn" onClick={onBack} aria-label="Go back" id="detail-back-button">
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <span className="pdp-topbar-title">{product.title}</span>
          <button className="pdp-topbar-btn" onClick={handleShare} aria-label="Share product" id="detail-share-button">
            <Share2 size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="pdp-container">
          <div className="pdp-grid">

            {/* ===== LEFT COLUMN — Image Gallery + Desktop Actions ===== */}
            <div className="pdp-left">
              {/* Main Image */}
              <div className="pdp-main-image">
                <button
                  type="button"
                  onClick={() => imageUrl && setLightboxOpen(true)}
                  aria-label="Open image gallery"
                  style={{ position: 'absolute', inset: 0, zIndex: 2, border: 'none', background: 'transparent', cursor: 'zoom-in' }}
                />
                <SafeImage
                  src={imageUrl}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  style={{ objectFit: 'contain' }}
                  loading="eager"
                />
              </div>

              {/* Thumbnail Gallery */}
              <div className="pdp-thumbnails">
                {galleryImages.slice(0, 4).map((img, idx) => (
                  <div
                    key={img + idx}
                    className={`pdp-thumb ${idx === safeIndex ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} />
                  </div>
                ))}
                {galleryImages.length === 0 && (
                  <div className="pdp-thumb active">
                    <ImageIcon size={20} strokeWidth={1.5} color="#94A3B8" />
                  </div>
                )}
              </div>

              {/* Desktop-only Action Buttons (Add to Cart / Buy Now style) */}
              <div className="pdp-desktop-actions">
                <button className="pdp-btn-chat" onClick={onChat} id="chat-with-seller-button">
                  <MessageCircle size={18} strokeWidth={2} />
                  Chat with Seller
                </button>
                <button
                  className={`pdp-btn-save ${isSaved ? 'is-saved' : ''}`}
                  onClick={handleToggleSave}
                  id="save-product-button"
                  disabled={toggling}
                  style={{ opacity: toggling ? 0.6 : 1 }}
                >
                  <Heart size={18} strokeWidth={2} fill={isSaved ? 'currentColor' : 'none'} />
                  {isSaved ? 'Saved' : 'Save Item'}
                </button>
              </div>
            </div>

            {/* ===== RIGHT COLUMN — Product Details ===== */}
            <div className="pdp-right">

              {/* Condition Badge + Date */}
              <div className="pdp-meta-row">
                <span className={`pdp-condition-badge ${(product.condition || 'Used').toLowerCase() === 'new' ? 'new-cond' : 'used-cond'}`}>
                  {product.condition === 'New'
                    ? <Sparkles size={12} strokeWidth={2} />
                    : <Recycle size={12} strokeWidth={2} />
                  }
                  {product.condition || 'Used'}
                </span>
                <span className="pdp-posted-date">Posted {postedDate}</span>
              </div>

              {/* Title */}
              <h1 className="pdp-title" id="detail-title">{product.title}</h1>

              {/* Price Box */}
              <div className="pdp-price-box">
                <span className="pdp-price" id="detail-price">₹{product.price?.toLocaleString()}</span>

                {product.originalPrice && (
                  <div className="pdp-price-savings">
                    <BadgeDollarSign size={18} strokeWidth={2} color="#16a34a" />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#16A34A' }}>
                        You save ₹{(product.originalPrice - product.price).toLocaleString()}!
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        Original: ₹{product.originalPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pdp-divider"></div>

              {/* Seller Card */}
              <div className="pdp-seller-card" id="seller-card">
                <div className="pdp-seller-avatar">
                  {sellerProfile?.photoURL ? (
                    <img src={sellerProfile.photoURL} alt={sellerName} />
                  ) : sellerAvatar}
                </div>
                <div className="pdp-seller-info">
                  <div className="pdp-seller-name">
                    {sellerName}
                    {sellerVerified && (
                      <span className="pdp-verified">
                        <ShieldCheck size={11} strokeWidth={2} /> Verified
                      </span>
                    )}
                  </div>
                  <div className="pdp-seller-college">{sellerCollege}</div>
                </div>
                <div className="pdp-seller-rating">
                  <Star size={16} strokeWidth={2} color="#f59e0b" />
                  <span style={{ color: '#0F172A', fontWeight: 600, fontSize: '0.875rem' }}>{sellerRating}</span>
                  <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>({sellerReviews})</span>
                </div>
              </div>
              {canRateSeller && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    className="pdp-btn-save"
                    onClick={() => setRatingModalOpen(true)}
                    style={{ width: '100%' }}
                    id="rate-seller-button"
                  >
                    <Star size={16} strokeWidth={2} />
                    Rate Seller
                  </button>
                </div>
              )}

              <div className="pdp-divider"></div>

              {/* Description */}
              <div className="pdp-section">
                <h2 className="pdp-section-heading">Description</h2>
                <p className="pdp-section-text" id="detail-description">
                  {product.description || 'No description provided.'}
                </p>
              </div>

              {/* Location */}
              {product.location && (
                <div className="pdp-section">
                  <h2 className="pdp-section-heading">Pickup Location</h2>
                  <div className="pdp-location" id="detail-location">
                    <MapPin size={16} strokeWidth={2} color="#64748B" />
                    <span>{product.location}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="pdp-btn-save"
                onClick={() => setReportModalOpen(true)}
                style={{ width: '100%', marginTop: '1rem', color: '#B91C1C' }}
              >
                <Flag size={16} strokeWidth={2} />
                Report Listing
              </button>

              {/* Saves Count */}
              {product.savesCount > 0 && (
                <div className="pdp-saves">
                  <Heart size={14} strokeWidth={2} />
                  {product.savesCount} {product.savesCount === 1 ? 'person' : 'people'} saved this
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile-only Sticky Bottom Bar */}
        <div className="pdp-mobile-bar">
          <button className="pdp-mobile-chat" onClick={onChat}>
            <MessageCircle size={18} strokeWidth={2} />
            Chat with Seller
          </button>
          <button
            className={`pdp-mobile-save ${isSaved ? 'is-saved' : ''}`}
            onClick={handleToggleSave}
            aria-label="Save product"
            disabled={toggling}
            style={{ opacity: toggling ? 0.6 : 1 }}
          >
            <Heart size={20} strokeWidth={2} fill={isSaved ? 'currentColor' : 'none'} color={isSaved ? '#EF4444' : '#0F172A'} />
          </button>
        </div>
      </div>
      {lightboxOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close gallery"
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 40, height: 40, borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>
          <div onClick={(event) => event.stopPropagation()} style={{ position: 'relative', width: 'min(92vw, 920px)', height: 'min(78vh, 720px)' }}>
            <SafeImage src={imageUrl} alt={product.title} fill sizes="92vw" style={{ objectFit: 'contain' }} />
          </div>
        </div>
      )}
      {reportModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
          }}
          onClick={() => setReportModalOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: '16px',
              padding: '24px', maxWidth: '380px', width: '92%',
              boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)',
            }}
          >
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>
              Report Listing
            </h2>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Reason
            </label>
            <select
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              style={{ width: '100%', height: 42, border: '1px solid #CBD5E1', borderRadius: 8, padding: '0 10px', marginBottom: 14 }}
            >
              <option value="misleading">Misleading details</option>
              <option value="prohibited">Prohibited or unsafe item</option>
              <option value="spam">Spam or duplicate</option>
              <option value="other">Other</option>
            </select>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Details
            </label>
            <textarea
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              rows={3}
              placeholder="Add context for review"
              style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: 10, resize: 'vertical', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setReportModalOpen(false)} style={{ flex: 1, height: 42, border: '1px solid #E2E8F0', borderRadius: 10, background: '#FFFFFF', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleReportListing} disabled={reportSubmitting} style={{ flex: 1, height: 42, border: 'none', borderRadius: 10, background: '#B91C1C', color: '#FFFFFF', fontWeight: 700, cursor: reportSubmitting ? 'not-allowed' : 'pointer', opacity: reportSubmitting ? 0.7 : 1 }}>
                {reportSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Star Rating Modal (Fix 6) ───────────────────── */}
      {ratingModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
            animation: 'smFadeIn 0.2s ease forwards',
          }}
          onClick={() => setRatingModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: '20px',
              padding: '32px 28px 28px', maxWidth: '340px', width: '92%',
              textAlign: 'center', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)',
              animation: 'smZoomIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⭐</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              Rate {sellerName}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px', lineHeight: 1.5 }}>
              How was your experience with this seller?
            </p>

            {/* Star picker */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '2rem', padding: '4px',
                    transition: 'transform 0.15s ease',
                    transform: (hoverRating || selectedRating) >= star ? 'scale(1.2)' : 'scale(1)',
                    filter: (hoverRating || selectedRating) >= star ? 'none' : 'grayscale(1) opacity(0.35)',
                  }}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ⭐
                </button>
              ))}
            </div>

            {selectedRating > 0 && (
              <p style={{ fontSize: '13px', color: '#2563EB', fontWeight: 600, marginBottom: '16px' }}>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][selectedRating]}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setRatingModalOpen(false); setSelectedRating(0); setHoverRating(0); }}
                style={{
                  flex: 1, height: '44px', border: '1.5px solid #E2E8F0',
                  borderRadius: '10px', background: '#FFFFFF', fontSize: '14px',
                  fontWeight: 500, color: '#64748B', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRateSeller}
                disabled={ratingSubmitting || !selectedRating}
                style={{
                  flex: 1, height: '44px', border: 'none',
                  borderRadius: '10px', background: selectedRating ? '#2563EB' : '#E2E8F0',
                  fontSize: '14px', fontWeight: 700, color: selectedRating ? '#FFFFFF' : '#94A3B8',
                  cursor: selectedRating ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
              >
                {ratingSubmitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
