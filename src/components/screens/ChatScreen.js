'use client';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle, Send, Loader2, ImagePlus, X, Star } from 'lucide-react';
import { sendMessage, subscribeToMessages, subscribeToPresence } from '@/lib/chatService';
import { uploadChatImage } from '@/lib/storageService';
import { markAsSold, rateSeller } from '@/lib/productService';
import { useAuth } from '@/context/AuthContext';
import { useSuccessPopup } from '@/components/SuccessPopup';
import toast from 'react-hot-toast';

export default function ChatScreen({ chat, onBack }) {
  const { user } = useAuth();
  const { showSuccess } = useSuccessPopup();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [presence, setPresence] = useState({ isOnline: false, lastSeen: null });
  const [productStatus, setProductStatus] = useState(chat.productStatus || 'active');
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState(null);   // File object
  const [imagePreview, setImagePreview] = useState(null);     // Object URL for thumbnail
  const [uploadProgress, setUploadProgress] = useState(null); // 'uploading' | null

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Determine the other participant's ID for presence tracking
  const otherUserId = chat.participants
    ? chat.participants.find(id => id !== user?.uid)
    : null;

  // Subscribe to real-time messages
  useEffect(() => {
    if (!chat.id) return;
    setLoading(true);
    const unsubscribe = subscribeToMessages(chat.id, (msgs, error) => {
      setMessages(msgs);
      setLoading(false);
      if (error) console.error('Failed to load messages:', error);
    });
    return () => unsubscribe();
  }, [chat.id]);

  useEffect(() => {
    setProductStatus(chat.productStatus || 'active');
    setRatingDone(false);
  }, [chat.id, chat.productStatus]);

  // Subscribe to other user's presence
  useEffect(() => {
    if (!otherUserId) return;
    const unsubscribe = subscribeToPresence(otherUserId, setPresence);
    return () => unsubscribe();
  }, [otherUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // ── Image selection ────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (max 10 MB before compression)
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image is too large. Please choose a file under 10 MB.');
      return;
    }

    // Revoke any previous preview URL
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));

    // Reset the input so the same file can be re-selected after clearing
    e.target.value = '';
  };

  const handleClearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);
  };

  // ── Send message (text + optional image) ────────────────────
  const handleSend = async () => {
    const hasText = input.trim().length > 0;
    const hasImage = !!selectedImage;
    if ((!hasText && !hasImage) || sending || !chat.id || !user?.uid) return;

    setSending(true);
    try {
      let imageUrl = null;

      if (hasImage) {
        setUploadProgress('uploading');
        imageUrl = await uploadChatImage(selectedImage, chat.id);
        setUploadProgress(null);
        handleClearImage();
      }

      await sendMessage(chat.id, user.uid, input, imageUrl);
      setInput('');
    } catch (err) {
      console.error('Send failed:', err);
      setUploadProgress(null);
      toast.error(err.userMessage || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMarkSold = async () => {
    if (!chat.productId) return;
    try {
      await markAsSold(chat.productId);
      setProductStatus('sold');
      showSuccess('Item Sold!', 'The listing has been removed from the marketplace.');
    } catch (err) {
      console.error('Mark sold failed:', err);
      toast.error('Failed to mark as sold');
    }
  };

  const handleRateSeller = async () => {
    if (!selectedRating) {
      toast.error('Please select a star rating first.');
      return;
    }
    try {
      setRatingSubmitting(true);
      await rateSeller({
        productId: chat.productId,
        sellerId: chat.sellerId,
        rating: selectedRating,
      });
      setRatingDone(true);
      setRatingModalOpen(false);
      showSuccess('Rating Submitted!', 'Thanks for rating the seller.');
    } catch (err) {
      console.error('Rating failed:', err);
      toast.error(err?.message || 'Could not submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleSendOffer = async () => {
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid offer amount.');
      return;
    }
    if (!chat.id || !user?.uid || sending) return;

    setSending(true);
    try {
      await sendMessage(chat.id, user.uid, `Offer: ₹${amount.toLocaleString('en-IN')}`, null);
      setOfferAmount('');
      setOfferOpen(false);
      toast.success('Offer sent');
    } catch (err) {
      console.error('Offer send failed:', err);
      toast.error('Failed to send offer');
    } finally {
      setSending(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const presenceText = presence.isOnline
    ? 'Online'
    : presence.lastSeen
      ? `Last seen ${presence.lastSeen.toLocaleString()}`
      : 'Offline';

  const chatName = chat.name || chat.productTitle || 'Chat';
  const chatAvatar = chat.avatar || chatName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const canSend = (input.trim().length > 0 || !!selectedImage) && !sending;
  const canRateSeller = user?.uid === chat.buyerId && productStatus === 'sold' && !ratingDone;
  const canMakeOffer = user?.uid === chat.buyerId && productStatus !== 'sold';

  return (
    <div className="chat-page animate-fade-in" id="chat-page">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="chat-header" id="chat-header">
        <button className="chat-header-back" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className="chat-header-avatar">{chatAvatar}</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{chatName}</div>
          <div className="chat-header-status" style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            color: presence.isOnline ? '#16a34a' : 'var(--text-tertiary)'
          }}>
            {presence.isOnline && (
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#16a34a', display: 'inline-block'
              }} />
            )}
            {presenceText}
          </div>
        </div>
        {chat.productId && user?.uid === chat.sellerId && (
          <button
            className="chat-mark-sold"
            id="mark-sold-button"
            onClick={handleMarkSold}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <CheckCircle size={16} strokeWidth={2} /> Mark as Sold
          </button>
        )}
      </div>

      {/* ── Product context bar ────────────────────────── */}
      {chat.productTitle && (
        <div style={{
          padding: '8px 16px',
          background: '#F1F5F9',
          borderBottom: '1px solid #E2E8F0',
          fontSize: '13px',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontWeight: 500 }}>About:</span> {chat.productTitle}
          {chat.productPrice > 0 && (
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              ₹{chat.productPrice?.toLocaleString()}
            </span>
          )}
          {productStatus === 'sold' && (
            <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>
              Sold
            </span>
          )}
          {canRateSeller && (
            <button
              type="button"
              onClick={() => setRatingModalOpen(true)}
              style={{
                marginLeft: productStatus === 'sold' ? '8px' : 'auto',
                border: '1px solid #F59E0B',
                background: '#FFFBEB',
                color: '#92400E',
                borderRadius: '8px',
                padding: '5px 9px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Star size={13} strokeWidth={2} /> Rate Seller
            </button>
          )}
          {canMakeOffer && (
            <button
              type="button"
              onClick={() => setOfferOpen((open) => !open)}
              style={{
                marginLeft: 'auto',
                border: '1px solid #2563EB',
                background: '#EFF6FF',
                color: '#1D4ED8',
                borderRadius: '8px',
                padding: '5px 9px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Make Offer
            </button>
          )}
        </div>
      )}
      {offerOpen && (
        <div style={{
          padding: '10px 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          <input
            type="number"
            min="1"
            placeholder="Offer amount"
            value={offerAmount}
            onChange={(event) => setOfferAmount(event.target.value)}
            style={{
              flex: 1,
              height: '38px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '0 10px',
              fontSize: '14px',
            }}
          />
          <button
            type="button"
            onClick={handleSendOffer}
            disabled={sending}
            style={{
              height: '38px',
              border: 'none',
              borderRadius: '8px',
              padding: '0 14px',
              background: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.7 : 1,
            }}
          >
            Send
          </button>
        </div>
      )}

      {/* ── Messages ──────────────────────────────────── */}
      <div className="chat-messages" id="chat-messages">
        {loading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="chat-message received" style={{ maxWidth: '60%' }}>
              <div className="animate-pulse bg-gray-200 rounded-md" style={{ height: '24px', width: '100%', marginBottom: '4px' }}></div>
              <div className="animate-pulse bg-gray-200 rounded-md" style={{ height: '24px', width: '60%' }}></div>
            </div>
            <div className="chat-message sent" style={{ maxWidth: '60%' }}>
              <div className="animate-pulse bg-gray-200 rounded-md" style={{ height: '24px', width: '80%', marginBottom: '4px' }}></div>
            </div>
            <div className="chat-message received" style={{ maxWidth: '60%' }}>
              <div className="animate-pulse bg-gray-200 rounded-md" style={{ height: '24px', width: '90%' }}></div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8', fontSize: '14px' }}>
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map(msg => {
            const isSent = msg.senderId === user?.uid;
            return (
              <div
                key={msg.id}
                className={`chat-message ${isSent ? 'sent' : 'received'}`}
              >
                {/* Image attachment */}
                {msg.imageUrl && (
                  <div className="chat-message-image-wrapper">
                    <img
                      src={msg.imageUrl}
                      alt="Image attachment"
                      className="chat-message-image"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  </div>
                )}
                {/* Text body */}
                {msg.text && <div className="chat-message-text">{msg.text}</div>}
                <div className="chat-message-time">{msg.time}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Image attachment preview bar ───────────────── */}
      {imagePreview && (
        <div className="chat-image-preview-bar" id="chat-image-preview-bar">
          <div className="chat-image-preview-inner">
            <img src={imagePreview} alt="Selected attachment" className="chat-image-preview-thumb" />
            <div className="chat-image-preview-info">
              <span className="chat-image-preview-name">
                {selectedImage?.name?.length > 30
                  ? selectedImage.name.slice(0, 28) + '…'
                  : selectedImage?.name}
              </span>
              <span className="chat-image-preview-size">
                {selectedImage ? (selectedImage.size / 1024).toFixed(0) + ' KB' : ''}
              </span>
            </div>
            <button
              className="chat-image-preview-remove"
              onClick={handleClearImage}
              aria-label="Remove selected image"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          {uploadProgress === 'uploading' && (
            <div className="chat-upload-progress-bar">
              <div className="chat-upload-progress-fill" />
            </div>
          )}
        </div>
      )}

      {/* ── Input Bar ──────────────────────────────────── */}
      <div className="chat-input-bar" id="chat-input-bar">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
          id="chat-file-input"
        />

        {/* Attachment button */}
        <button
          className="chat-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
          disabled={sending}
          id="chat-attach-button"
          title="Send a photo"
        >
          {uploadProgress === 'uploading'
            ? <Loader2 size={20} strokeWidth={2} className="animate-spin" />
            : <ImagePlus size={20} strokeWidth={2} />
          }
        </button>

        <input
          type="text"
          className="chat-input"
          placeholder={selectedImage ? 'Add a caption…' : 'Type a message…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          id="chat-input"
          disabled={sending}
        />

        <button
          className="chat-send-btn"
          onClick={handleSend}
          id="chat-send-button"
          aria-label="Send message"
          disabled={!canSend}
          style={{ opacity: canSend ? 1 : 0.5 }}
        >
          {sending
            ? <Loader2 size={18} strokeWidth={2} className="animate-spin" />
            : <Send size={18} strokeWidth={2} />
          }
        </button>
      </div>

      {ratingModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => setRatingModalOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '340px',
              width: '92%',
              textAlign: 'center',
              boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              Rate Seller
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px', lineHeight: 1.5 }}>
              How was your experience buying this item?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '22px' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || selectedRating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: active ? '#F59E0B' : '#CBD5E1',
                      cursor: 'pointer',
                      padding: '4px',
                      transform: active ? 'scale(1.12)' : 'scale(1)',
                      transition: 'transform 0.15s ease, color 0.15s ease',
                    }}
                  >
                    <Star size={30} strokeWidth={2} fill={active ? 'currentColor' : 'none'} />
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setRatingModalOpen(false); setSelectedRating(0); setHoverRating(0); }}
                style={{
                  flex: 1,
                  height: '42px',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  color: '#64748B',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRateSeller}
                disabled={ratingSubmitting || !selectedRating}
                style={{
                  flex: 1,
                  height: '42px',
                  border: 'none',
                  borderRadius: '10px',
                  background: selectedRating ? '#0F172A' : '#E2E8F0',
                  color: selectedRating ? '#FFFFFF' : '#94A3B8',
                  fontWeight: 700,
                  cursor: selectedRating ? 'pointer' : 'not-allowed',
                }}
              >
                {ratingSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
