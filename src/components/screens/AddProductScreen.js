'use client';
import { useRef, useState } from 'react';
import { Loader2, Check, ImagePlus, X } from 'lucide-react';
import { addProduct } from '@/lib/productService';
import { getCurrentUser } from '@/lib/authService';
import { uploadProductImage } from '@/lib/storageService';
import toast from 'react-hot-toast';

const MAX_IMAGES = 5;
const PUBLISH_TIMEOUT_MS = 8000;

function withPublishTimeout(promise) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve({ timedOut: true }), PUBLISH_TIMEOUT_MS);
  });

  return Promise.race([
    promise.then((value) => ({ value, timedOut: false })),
    timeout,
  ]).finally(() => clearTimeout(timeoutId));
}

export default function AddProductScreen({ onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('Used');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  /** Reset the entire form back to blank */
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setCategory('');
    setCondition('Used');
    setLocation('');
    setImages([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setError('');
    const currentUser = getCurrentUser();
    if (!currentUser) {
      const message = 'You must be logged in to upload images.';
      setError(message);
      toast.error(message);
      return;
    }

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      toast.error(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const filesToUpload = selectedFiles
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      const message = 'Please choose a valid image file.';
      setError(message);
      toast.error(message);
      return;
    }

    setUploadingImages(true);
    try {
      const uploadedUrls = await Promise.all(filesToUpload.map(uploadProductImage));
      setImages((prev) => [...prev, ...uploadedUrls].slice(0, MAX_IMAGES));
      toast.success(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded!`);
    } catch (err) {
      console.error('Image upload failed:', err);
      const message = err.userMessage || err.message || 'Image upload failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (imageUrl) => {
    setImages((prev) => prev.filter((img) => img !== imageUrl));
  };

  /** Called when the user dismisses the success modal */
  const handleClose = () => {
    setShowSuccess(false);
    resetForm();
    if (onNavigate) onNavigate('profile');
  };

  /** Submit handler */
  const handlePost = async () => {
    setError('');

    if (!title.trim()) return setError('Please enter a title.');
    if (!price || Number(price) <= 0) return setError('Please enter a valid price.');
    if (!category) return setError('Please select a category.');

    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast.error('You must be logged in to post an item.');
      return setError('You must be logged in to post an item.');
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image before posting.');
      return setError('Please upload at least one image before posting.');
    }

    setLoading(true);

    const publishPromise = addProduct({
      title: title.trim(),
      price: Number(price),
      description: description.trim(),
      category,
      condition,
      images,
      imageUrl: images[0],
      location: location.trim(),
    });

    try {
      const result = await withPublishTimeout(publishPromise);

      if (result.timedOut) {
        publishPromise.catch((err) => {
          console.error('Post eventually failed after the UI was released:', err);
        });
        toast.success('Listing submitted. It may take a moment to finish syncing.');
      }
      setShowSuccess(true);
    } catch (err) {
      console.error('Post failed:', err);
      const message = err.userMessage || err.message || 'Failed to post item. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ───────────── Success Modal ───────────── */
  const SuccessModal = () => (
    <div className="sm-overlay" id="success-modal-overlay">
      <div className="sm-card" id="success-modal-card">
        {/* Confetti decorations */}
        <div className="sm-confetti-area">
          <span className="sm-dot" style={{ top: '10%', left: '36%', background: '#10B981', width: 10, height: 10 }} />
          <span className="sm-dot" style={{ top: '15%', left: '56%', background: '#EF4444', width: 7, height: 7 }} />
          <span className="sm-ring" style={{ top: '30%', left: '14%', width: 11, height: 11, borderColor: '#FCD34D' }} />
          <span className="sm-ring" style={{ top: '65%', left: '18%', width: 12, height: 12, borderColor: '#CBD5E1' }} />
          <span className="sm-dot" style={{ top: '70%', left: '58%', background: '#3B82F6', width: 10, height: 10 }} />
          <span className="sm-ring" style={{ top: '32%', left: '76%', width: 9, height: 9, borderColor: '#A78BFA' }} />
          <svg className="sm-squig" width="24" height="12" viewBox="0 0 24 12" style={{ top: '28%', left: '8%', transform: 'rotate(-20deg)' }}><path d="M2 10C6 2 10 2 12 6C14 10 18 10 22 2" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" fill="none" /></svg>
          <svg className="sm-squig" width="22" height="11" viewBox="0 0 24 12" style={{ top: '8%',  left: '70%', transform: 'rotate(140deg)' }}><path d="M2 10C6 2 10 2 12 6C14 10 18 10 22 2" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" fill="none" /></svg>
          <svg className="sm-squig" width="20" height="10" viewBox="0 0 24 12" style={{ top: '68%', left: '72%', transform: 'rotate(30deg)' }}><path d="M2 10C6 2 10 2 12 6C14 10 18 10 22 2" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" /></svg>

          {/* Green check circle */}
          <div className="sm-circle-outer">
            <div className="sm-circle-inner">
              <Check size={44} strokeWidth={3} color="#fff" />
            </div>
          </div>
        </div>

        <h2 className="sm-title">Item Posted Successfully</h2>
        <p className="sm-subtitle">Your item is now live and visible to students in your college.</p>

        <button className="sm-btn" onClick={handleClose} id="success-view-listings-btn">
          View My Listings
        </button>
      </div>
    </div>
  );

  /* ───────────── Component Return ───────────── */
  return (
    <div className="sell-page" id="add-product-page">
      <div className="sell-container">

        {/* Header */}
        <div className="sell-header">
          <h1 className="sell-title">Sell an Item</h1>
          <p className="sell-subtitle">List your item for students in your college</p>
        </div>

        {/* Error */}
        {error && (
          <div className="sell-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <div className={`sell-form ${loading ? 'sell-form--disabled' : ''}`}>

          {/* Image Upload */}
          <div className="sell-field">
            <label className="sell-label">Product Images * (up to 5)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sell-file-input"
              onChange={handleImageUpload}
              disabled={loading || uploadingImages || images.length >= MAX_IMAGES}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`sell-upload-btn ${images.length > 0 ? 'sell-upload-btn--done' : ''}`}
              disabled={loading || uploadingImages || images.length >= MAX_IMAGES}
            >
              {uploadingImages ? (
                <>
                  <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                  Uploading images...
                </>
              ) : images.length > 0 ? (
                <>
                  <Check size={18} strokeWidth={2.5} />
                  {images.length} Image{images.length > 1 ? 's' : ''} Uploaded
                </>
              ) : (
                <>
                  <ImagePlus size={18} strokeWidth={2} />
                  Upload Product Images
                </>
              )}
            </button>
            {images.length > 0 && (
              <div className="sell-thumb-grid">
                {images.map((img, index) => (
                  <div key={img + index} className="sell-thumb-wrap">
                    <img src={img} alt={`Uploaded preview ${index + 1}`} className="sell-thumb" />
                    <button
                      type="button"
                      className="sell-thumb-remove"
                      onClick={() => removeImage(img)}
                      aria-label="Remove image"
                      disabled={loading || uploadingImages}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="sell-field">
            <label className="sell-label" htmlFor="product-title">Title *</label>
            <input type="text" className="sell-input" id="product-title" placeholder="e.g., Engineering Mathematics Textbook" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} />
          </div>

          {/* Description */}
          <div className="sell-field">
            <label className="sell-label" htmlFor="product-description">Description</label>
            <textarea className="sell-textarea" id="product-description" placeholder="Describe condition, edition, any markings…" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} disabled={loading} />
          </div>

          {/* Price + Category */}
          <div className="sell-row">
            <div className="sell-field">
              <label className="sell-label" htmlFor="product-price">Price (₹) *</label>
              <input type="number" className="sell-input" id="product-price" placeholder="Enter price in INR" value={price} onChange={(e) => setPrice(e.target.value)} disabled={loading} />
            </div>
            <div className="sell-field">
              <label className="sell-label" htmlFor="product-category">Category *</label>
              <select className="sell-select" id="product-category" value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading}>
                <option value="">Select a category</option>
                <option value="books">Books</option>
                <option value="notes">Notes</option>
                <option value="gadgets">Gadgets</option>
                <option value="stationery">Stationery</option>
                <option value="others">Others</option>
              </select>
            </div>
          </div>

          {/* Location + Condition */}
          <div className="sell-row">
            <div className="sell-field">
              <label className="sell-label" htmlFor="product-location">Pickup Location</label>
              <input type="text" className="sell-input" id="product-location" placeholder="e.g., Hostel Block C, Room 214" value={location} onChange={(e) => setLocation(e.target.value)} disabled={loading} />
            </div>
            <div className="sell-field">
              <label className="sell-label">Condition</label>
              <div className="sell-toggle-group" id="condition-toggle">
                <button className={`sell-toggle ${condition === 'New' ? 'sell-toggle--active' : ''}`} onClick={() => setCondition('New')} type="button" disabled={loading}>New</button>
                <button className={`sell-toggle ${condition === 'Used' ? 'sell-toggle--active' : ''}`} onClick={() => setCondition('Used')} type="button" disabled={loading}>Used</button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button className="sell-submit" onClick={handlePost} disabled={loading || uploadingImages}>
          {loading ? (
            <><Loader2 size={18} strokeWidth={2.5} className="animate-spin" /> Publishing…</>
          ) : uploadingImages ? (
            <><Loader2 size={18} strokeWidth={2.5} className="animate-spin" /> Uploading Images…</>
          ) : (
            'Post Item'
          )}
        </button>
      </div>

      {/* ═══ Success Modal ═══ */}
      {showSuccess && <SuccessModal />}

      {/* ── Scoped Styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ═══════════ FORM STYLES ═══════════ */
        .sell-page {
          min-height: 100dvh;
          background: #F8FAFC;
          padding: 16px;
          padding-bottom: 100px;
        }
        .sell-container {
          max-width: 680px;
          margin: 0 auto;
          padding: 8px 0;
        }
        .sell-header { margin-bottom: 28px; }
        .sell-title {
          font-family: 'Poppins', Inter, -apple-system, sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 4px;
        }
        .sell-subtitle { font-size: 14px; color: #94A3B8; margin: 0; }

        .sell-error {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; background: #FEE2E2; border: 1px solid #FECACA;
          border-radius: 10px; margin-bottom: 24px;
          font-size: 13px; font-weight: 500; color: #DC2626;
          animation: sellSlideDown 0.3s ease-out;
        }
        @keyframes sellSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .sell-form { display: flex; flex-direction: column; gap: 24px; }
        .sell-form--disabled { opacity: 0.6; pointer-events: none; }
        .sell-file-input { display: none; }
        .sell-field { display: flex; flex-direction: column; gap: 6px; }
        .sell-label { font-size: 13px; font-weight: 600; color: #334155; letter-spacing: 0.01em; }

        .sell-input, .sell-textarea, .sell-select {
          width: 100%; padding: 12px 14px; background: #FFFFFF;
          border: 1.5px solid #E2E8F0; border-radius: 10px;
          font-family: inherit; font-size: 14px; color: #0F172A;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .sell-input { height: 46px; }
        .sell-input:focus, .sell-textarea:focus, .sell-select:focus {
          outline: none; border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }
        .sell-input::placeholder, .sell-textarea::placeholder { color: #94A3B8; }
        .sell-textarea { min-height: 100px; resize: vertical; line-height: 1.5; }
        .sell-select {
          height: 46px; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center;
        }

        .sell-row { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 640px) { .sell-row { grid-template-columns: 1fr 1fr; } }

        .sell-upload-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; height: 46px; border-radius: 10px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; background: #2563EB; color: #FFFFFF; border: none;
        }
        .sell-upload-btn:hover { background: #1D4ED8; }
        .sell-upload-btn--done { background: #10B981; }
        .sell-upload-btn--done:hover { background: #059669; }
        .sell-upload-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .sell-thumb-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .sell-thumb-wrap { position: relative; min-width: 0; }
        .sell-thumb { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; border: 1px solid #E2E8F0; }
        .sell-thumb-remove {
          position: absolute; top: 6px; right: 6px;
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(15, 23, 42, 0.76); color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.28);
        }

        .sell-toggle-group { display: flex; gap: 8px; }
        .sell-toggle {
          flex: 1; height: 46px; border: 1.5px solid #E2E8F0; border-radius: 10px;
          font-size: 14px; font-weight: 500; color: #475569;
          background: #FFFFFF; cursor: pointer; transition: all 0.15s ease;
        }
        .sell-toggle:hover { border-color: #CBD5E1; }
        .sell-toggle--active {
          background: #2563EB; color: #FFFFFF; border-color: #2563EB;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        .sell-submit {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; height: 52px; margin-top: 32px;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          color: #FFFFFF; font-size: 16px; font-weight: 700;
          border: none; border-radius: 14px; cursor: pointer;
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
          transition: all 0.15s ease;
        }
        .sell-submit:hover:not(:disabled) { box-shadow: 0 8px 28px rgba(37, 99, 235, 0.4); transform: translateY(-1px); }
        .sell-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        /* ═══════════ SUCCESS MODAL ═══════════ */
        .sm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0, 0, 0, 0.40);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          animation: smFadeIn 0.25s ease forwards;
        }
        @keyframes smFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .sm-card {
          background: #FFFFFF;
          border-radius: 24px;
          padding: 40px 32px 32px;
          max-width: 380px;
          width: 92%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.04);
          animation: smZoomIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes smZoomIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ── Confetti Area ── */
        .sm-confetti-area {
          position: relative;
          width: 180px;
          height: 180px;
          margin-bottom: 24px;
        }

        .sm-dot {
          position: absolute; border-radius: 50%;
          animation: smPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }
        .sm-ring {
          position: absolute; border-radius: 50%; border: 2px solid;
          animation: smPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both;
        }
        .sm-squig {
          position: absolute;
          animation: smPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
        }
        @keyframes smPop {
          from { opacity: 0; transform: scale(0); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Green Circle ── */
        .sm-circle-outer {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 110px; height: 110px;
          border-radius: 50%;
          border: 3px solid #34D399;
          display: flex; align-items: center; justify-content: center;
          animation: smRingIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
        }
        .sm-circle-inner {
          width: 88px; height: 88px;
          border-radius: 50%;
          background: linear-gradient(145deg, #34D399, #10B981);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
          animation: smCheckBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }
        @keyframes smRingIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes smCheckBounce {
          from { opacity: 0; transform: scale(0.2); }
          60%  { transform: scale(1.1); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Text ── */
        .sm-title {
          font-size: 1.4rem; font-weight: 800; color: #111827;
          margin: 0 0 8px;
          font-family: 'Poppins', Inter, -apple-system, sans-serif;
        }
        .sm-subtitle {
          font-size: 0.875rem; color: #6B7280;
          margin: 0 0 24px; line-height: 1.6;
        }

        /* ── Button ── */
        .sm-btn {
          width: 100%; padding: 14px;
          background: #2563EB; color: #FFFFFF;
          border: none; border-radius: 14px;
          font-size: 15px; font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .sm-btn:hover { background: #1D4ED8; }

        @media (max-width: 480px) {
          .sell-page {
            min-height: 100svh;
            padding: 14px;
            padding-bottom: calc(92px + env(safe-area-inset-bottom));
          }
          .sell-header { margin-bottom: 20px; }
          .sell-title { font-size: 23px; }
          .sell-form { gap: 18px; }
          .sell-row { gap: 18px; }
          .sell-input, .sell-textarea, .sell-select, .sell-upload-btn {
            font-size: 16px;
          }
          .sell-thumb-grid { grid-template-columns: repeat(2, 1fr); }
          .sell-submit {
            position: sticky;
            bottom: calc(78px + env(safe-area-inset-bottom));
            z-index: 20;
            margin-top: 22px;
          }
          .sm-card {
            width: min(92vw, 360px);
            padding: 30px 20px 24px;
            border-radius: 18px;
          }
          .sm-confetti-area {
            width: 140px;
            height: 140px;
          }
        }
      `}} />
    </div>
  );
}
