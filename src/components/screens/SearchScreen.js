'use client';
import { useState } from 'react';
import { products, categories } from '@/data/mockData';

export default function SearchScreen({ onProductClick }) {
  const [query, setQuery] = useState('');
  const [wishlist, setWishlist] = useState({});

  const recentSearches = [
    'Engineering Mathematics', 
    'MacBook Air', 
    'Lab Coat', 
    'Physics Notes',
    'Calculator',
  ];

  const trendingTags = [
    '📚 Textbooks', '💻 Laptops', '📝 Handwritten Notes', 
    '🔬 Lab Equipment', '🎧 Headphones', '📐 Drafting Tools',
    '🎒 Backpacks', '📱 Phones', '🪑 Study Furniture',
  ];

  const searchResults = query
    ? products.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const toggleWishlist = (e, productId) => {
    e.stopPropagation();
    setWishlist(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <div className="search-page animate-fade-in">
      {/* Search Input */}
      <div className="search-page-header">
        <div className="search-page-input" id="search-input-container">
          <span style={{ color: 'var(--text-tertiary)', fontSize: '16px' }}>🔍</span>
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
              style={{ fontSize: '16px', color: 'var(--text-tertiary)' }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {query ? (
        /* Search Results */
        <div>
          <div className="sort-bar">
            <span className="sort-count">{searchResults.length} results for "{query}"</span>
          </div>
          {searchResults.length > 0 ? (
            <div className="product-grid" id="search-results-grid">
              {searchResults.map(product => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => onProductClick(product)}
                  id={`search-result-${product.id}`}
                >
                  <div className="product-card-image">
                    <img src={product.image} alt={product.title} loading="lazy" />
                    <button
                      className={`product-card-wishlist ${wishlist[product.id] || product.wishlisted ? 'liked' : ''}`}
                      onClick={(e) => toggleWishlist(e, product.id)}
                      aria-label="Toggle wishlist"
                    >
                      {wishlist[product.id] || product.wishlisted ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div className="product-card-info">
                    <h3 className="product-card-title">{product.title}</h3>
                    <div className="product-card-price">₹{product.price.toLocaleString()}</div>
                    <div className="product-card-meta">
                      <span>{product.college}</span>
                      <span className="product-card-meta-dot"></span>
                      <span>{product.distance}</span>
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
              <div style={{ fontSize: '48px', marginBottom: 'var(--space-lg)' }}>🔍</div>
              <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>
                No results found
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                Try a different search term
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
                <span style={{ color: 'var(--text-tertiary)' }}>🕐</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Trending */}
          <div className="search-trending">
            <h3 className="search-trending-title">Trending Right Now 🔥</h3>
            <div className="search-trending-tags">
              {trendingTags.map((tag, i) => (
                <button
                  key={i}
                  className="search-trending-tag"
                  onClick={() => setQuery(tag.split(' ').slice(1).join(' '))}
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
