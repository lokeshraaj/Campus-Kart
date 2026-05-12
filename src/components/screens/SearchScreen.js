'use client';
import { useState, useEffect } from 'react';
import { Search, X, Heart, Clock, Flame, Filter, Loader2 } from 'lucide-react';
import { useRecentlyAdded } from '@/hooks/useRealtimeData';
import { useSaveToggle } from '@/hooks/useRealtimeData';
import { useAuth } from '@/context/AuthContext';
import { useSuccessPopup } from '@/components/SuccessPopup';
import toast from 'react-hot-toast';

export default function SearchScreen({ onProductClick }) {
  const { user } = useAuth();
  const { showSuccess } = useSuccessPopup();
  const [query, setQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [wishlist, setWishlist] = useState({});

  // Fetch real products from Firestore (up to 50 active listings)
  const { products: allProducts, loading } = useRecentlyAdded(50);

  const recentSearches = [
    'Engineering Mathematics', 
    'MacBook Air', 
    'Lab Coat', 
    'Physics Notes',
    'Calculator',
  ];

  const trendingTags = [
    'Textbooks', 'Laptops', 'Handwritten Notes', 
    'Lab Equipment', 'Headphones', 'Drafting Tools',
    'Backpacks', 'Phones', 'Study Furniture',
  ];

  // Filter products by search query AND condition dropdown
  const searchResults = allProducts.filter(p => {
    // Text match (title + description)
    const textMatch = query
      ? (p.title?.toLowerCase().includes(query.toLowerCase()) ||
         p.description?.toLowerCase().includes(query.toLowerCase()) ||
         p.category?.toLowerCase().includes(query.toLowerCase()))
      : false;

    // Condition match
    const conditionMatch = conditionFilter === 'all' 
      ? true 
      : (p.condition || 'Used').toLowerCase() === conditionFilter.toLowerCase();

    return textMatch && conditionMatch;
  });

  const toggleWishlist = (e, productId) => {
    e.stopPropagation();
    setWishlist(prev => ({ ...prev, [productId]: !prev[productId] }));
    if (!wishlist[productId]) {
      showSuccess('Item Saved!', 'This item has been added to your saved collection.');
    }
  };

  return (
    <div className="search-page animate-fade-in">
      {/* Search Input + Condition Filter */}
      <div className="search-page-header">
        <div className="search-page-input" id="search-input-container">
          <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
            <Search size={18} strokeWidth={2} />
          </span>
          <input
            type="text"
            placeholder="Search books, notes, gadgets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            id="search-input"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label="Clear search"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Condition Dropdown */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginTop: '10px'
        }}>
          <Filter size={16} strokeWidth={2} color="#64748B" />
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontFamily: 'inherit',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
            aria-label="Filter by condition"
          >
            <option value="all">Condition: All</option>
            <option value="new">New</option>
            <option value="used">Used</option>
          </select>
        </div>
      </div>

      {query ? (
        /* Search Results */
        <div>
          <div className="sort-bar">
            <span className="sort-count">
              {loading ? 'Searching…' : `${searchResults.length} results for "${query}"`}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <Loader2 size={32} strokeWidth={2} color="#CBD5E1" className="animate-spin" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: '1rem', color: 'var(--text-tertiary)', fontSize: '14px' }}>Searching database…</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="product-grid" id="search-results-grid">
              {searchResults.map(product => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => onProductClick(product)}
                  id={`search-result-${product.id}`}
                >
                  <div className="product-card-image">
                    <img src={product.imageUrl || product.image} alt={product.title} loading="lazy" />
                    <button
                      className={`product-card-wishlist ${wishlist[product.id] ? 'liked' : ''}`}
                      onClick={(e) => toggleWishlist(e, product.id)}
                      aria-label="Toggle wishlist"
                    >
                      <Heart 
                        size={18} 
                        strokeWidth={2} 
                        fill={wishlist[product.id] ? 'currentColor' : 'none'} 
                        color={wishlist[product.id] ? '#ea580c' : 'currentColor'} 
                      />
                    </button>
                    {/* Condition badge */}
                    {product.condition && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        background: product.condition === 'New' ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                        color: product.condition === 'New' ? '#16a34a' : '#64748b',
                        border: `1px solid ${product.condition === 'New' ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'}`,
                        letterSpacing: '0.03em',
                      }}>
                        {product.condition}
                      </span>
                    )}
                  </div>
                  <div className="product-card-info">
                    <h3 className="product-card-title">{product.title}</h3>
                    <div className="product-card-price">₹{product.price?.toLocaleString()}</div>
                    <div className="product-card-meta">
                      <span>{product.sellerName || 'Seller'}</span>
                      <span className="product-card-meta-dot"></span>
                      <span>{product.createdAt?.toDate ? product.createdAt.toDate().toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-5xl) var(--space-2xl)',
            }}>
              <div style={{ marginBottom: 'var(--space-lg)', color: '#CBD5E1', display: 'flex', justifyContent: 'center' }}>
                <Search size={40} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>
                No results found
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                Try a different search term or filter
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Default - Recent & Trending */
        <div>
          {/* Recent Searches */}
          <div className="search-recent">
            <h3 className="search-recent-title">Recent Searches</h3>
            {recentSearches.map((item, i) => (
              <div
                key={i}
                className="search-recent-item"
                onClick={() => setQuery(item)}
              >
                <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center' }}><Clock size={16} strokeWidth={2} /></span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Trending */}
          <div className="search-trending">
            <h3 className="search-trending-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Trending Right Now <Flame size={18} strokeWidth={2} color="#ea580c" />
            </h3>
            <div className="search-trending-tags">
              {trendingTags.map((tag, i) => (
                <button
                  key={i}
                  className="search-trending-tag"
                  onClick={() => setQuery(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
