'use client';
import { useState, useRef } from 'react';
import { uploadProductImage } from '@/lib/storageService';
import { addProduct } from '@/lib/productService';
import { useToast } from '@/context/ToastContext';

export default function AddProductScreen() {
  const { showToast } = useToast();
  const [images, setImages] = useState([null, null, null, null, null, null]);
  const [imageFiles, setImageFiles] = useState([null, null, null, null, null, null]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('Used');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [activeSlot, setActiveSlot] = useState(0);

  /**
   * Handle clicking an image slot — triggers the hidden file input.
   */
  const handleSlotClick = (index) => {
    setActiveSlot(index);
    fileInputRef.current?.click();
  };

  /**
   * Handle file selection — generates a local preview and stores
   * the File object for later upload.
   */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImages(prev => {
      const updated = [...prev];
      updated[activeSlot] = previewUrl;
      return updated;
    });
    setImageFiles(prev => {
      const updated = [...prev];
      updated[activeSlot] = file;
      return updated;
    });

    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  /**
   * Validate + upload image to Firebase Storage + save product to Firestore.
   */
  const handlePost = async () => {
    setError('');

    // Basic validation
    if (!title.trim()) return setError('Please enter a title.');
    if (!price || Number(price) <= 0) return setError('Please enter a valid price.');
    if (!category) return setError('Please select a category.');

    setLoading(true);

    try {
      // Upload the first available image (if any)
      let imageUrl = '';
      const firstFile = imageFiles.find(f => f !== null);
      if (firstFile) {
        imageUrl = await uploadProductImage(firstFile);
      }

      // Save to Firestore
      await addProduct({
        title: title.trim(),
        price: Number(price),
        description: description.trim(),
        category,
        condition,
        imageUrl,
        location: location.trim(),
      });

      // Reset form on success
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setCondition('Used');
      setLocation('');
      setImages([null, null, null, null, null, null]);
      setImageFiles([null, null, null, null, null, null]);

      // Show success toast
      showToast('🎉 Item posted successfully!', 'success');
    } catch (err) {
      console.error('[AddProduct] Post failed:', err);
      // Use the user-friendly message from storageService if available
      const message = err.userMessage || err.message || 'Failed to post item. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-page animate-fade-in" id="add-product-page">
      <h1 className="add-page-title">Sell an Item</h1>
      <p className="add-page-subtitle">List your item for students in your college</p>

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="image-file-input"
      />


      {/* Error Banner */}
      {error && (
        <div style={{
          padding: 'var(--space-md) var(--space-lg)',
          background: 'var(--error-light)',
          border: '1px solid var(--error)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-xl)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--error)',
          animation: 'slideDown 300ms ease-out',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Image Upload */}
      <div className="image-upload-grid" id="image-upload-grid">
        {images.map((img, index) => (
          <div
            key={index}
            className={`image-upload-slot ${img ? 'has-image' : ''}`}
            id={`image-slot-${index}`}
            onClick={() => handleSlotClick(index)}
          >
            {img ? (
              <img src={img} alt={`Upload ${index + 1}`} />
            ) : (
              <>
                <span className="image-upload-icon">{index === 0 ? '📷' : '+'}</span>
                <span className="image-upload-text">{index === 0 ? 'Add Photo' : 'Add'}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="form-group">
        <label className="form-label" htmlFor="product-title">Title *</label>
        <input
          type="text"
          className="form-input"
          id="product-title"
          placeholder="e.g., Engineering Mathematics Textbook"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label" htmlFor="product-description">Description</label>
        <textarea
          className="form-textarea"
          id="product-description"
          placeholder="Describe condition, edition, any markings…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={loading}
        />
      </div>

      {/* Price */}
      <div className="form-group">
        <label className="form-label" htmlFor="product-price">Price (₹) *</label>
        <input
          type="number"
          className="form-input"
          id="product-price"
          placeholder="Enter price in INR"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Category */}
      <div className="form-group">
        <label className="form-label" htmlFor="product-category">Category *</label>
        <select
          className="form-select"
          id="product-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={loading}
        >
          <option value="">Select a category</option>
          <option value="books">📚 Books</option>
          <option value="notes">📝 Notes</option>
          <option value="gadgets">💻 Gadgets</option>
          <option value="stationery">✏️ Stationery</option>
          <option value="others">📦 Others</option>
        </select>
      </div>

      {/* Location */}
      <div className="form-group">
        <label className="form-label" htmlFor="product-location">Pickup Location</label>
        <input
          type="text"
          className="form-input"
          id="product-location"
          placeholder="e.g., Hostel Block C, Room 214"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Condition */}
      <div className="form-group">
        <label className="form-label">Condition</label>
        <div className="toggle-group" id="condition-toggle">
          <button
            className={`toggle-btn ${condition === 'New' ? 'active' : ''}`}
            onClick={() => setCondition('New')}
            id="condition-new"
            type="button"
            disabled={loading}
          >
            ✨ New
          </button>
          <button
            className={`toggle-btn ${condition === 'Used' ? 'active' : ''}`}
            onClick={() => setCondition('Used')}
            id="condition-used"
            type="button"
            disabled={loading}
          >
            ♻️ Used
          </button>
        </div>
      </div>

      {/* Post Button */}
      <button
        className="btn-post"
        onClick={handlePost}
        id="post-item-button"
        disabled={loading}
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        <span>{loading ? '⏳' : '🚀'}</span>
        {loading ? 'Posting…' : 'Post Item'}
      </button>
    </div>
  );
}
