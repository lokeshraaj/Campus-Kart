// ============================================
// CampusKart - HomeContext
// ============================================
// Owns the persistent state for the Home screen.
// Lives above <main> so it survives tab switches.
//
// Responsibilities:
//   • Single Firestore onSnapshot listeners for
//     products and best-deals (never torn down
//     while the user is authenticated).
//   • Active category + sort-order filter state
//     (restored when user returns to Home tab).
//   • Saved scroll position for the Home feed.
//   • Notification badge count from chat threads
//     (also persisted across tab switches).
// ============================================

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  subscribeToRecentlyAdded,
  subscribeToBestDeals,
} from '@/hooks/useRealtimeData';
import { subscribeToUserChats, isExpiredChat } from '@/lib/chatService';

// ─────────────────────────────────────────────
// Context definition
// ─────────────────────────────────────────────

const HomeContext = createContext(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

/**
 * Wrap the authenticated app shell with this provider.
 * It mounts exactly one set of Firestore listeners for the
 * lifetime of the user's session and exposes stable state
 * and setters to any HomeScreen descendant.
 *
 * @param {{ userId: string|null, children: React.ReactNode }} props
 */
export function HomeProvider({ userId, children }) {
  // ── Feed data ────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [deals, setDeals] = useState([]);
  // true only before the very first snapshot arrives
  const [productsLoading, setProductsLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(true);

  // ── UI filter state (persists across tab switches) ───────
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState(null); // null | 'low-high' | 'high-low'

  // ── Scroll position (saved on leave, restored on return) ─
  const [scrollY, setScrollY] = useState(0);

  // ── Notification badge ───────────────────────────────────
  const [notificationCount, setNotificationCount] = useState(0);

  // Guard: only show loading=true before the first snapshot
  const productsSeenRef = useRef(false);
  const dealsSeenRef = useRef(false);

  // ── Products listener (mounted once per user session) ────
  useEffect(() => {
    if (!userId) {
      setProducts([]);
      setProductsLoading(false);
      productsSeenRef.current = false;
      return;
    }

    productsSeenRef.current = false;
    setProductsLoading(true);

    const unsub = subscribeToRecentlyAdded(20, (data) => {
      setProducts(data);
      if (!productsSeenRef.current) {
        productsSeenRef.current = true;
        setProductsLoading(false);
      }
    });

    return () => unsub();
  }, [userId]);

  // ── Deals listener (mounted once per user session) ───────
  useEffect(() => {
    if (!userId) {
      setDeals([]);
      setDealsLoading(false);
      dealsSeenRef.current = false;
      return;
    }

    dealsSeenRef.current = false;
    setDealsLoading(true);

    const unsub = subscribeToBestDeals(6, (data) => {
      setDeals(data);
      if (!dealsSeenRef.current) {
        dealsSeenRef.current = true;
        setDealsLoading(false);
      }
    });

    return () => unsub();
  }, [userId]);

  // ── Notification listener (mounted once per user session) 
  useEffect(() => {
    if (!userId) {
      setNotificationCount(0);
      return;
    }

    const unsub = subscribeToUserChats(userId, (chatData) => {
      const count = chatData.filter(
        (chat) =>
          !isExpiredChat(chat) &&
          chat.lastMessage &&
          chat.lastMessageSenderId !== userId
      ).length;
      setNotificationCount(count);
    });

    return () => unsub();
  }, [userId]);

  // ── Cycle sort order helper ──────────────────────────────
  const cycleSortOrder = useCallback(() => {
    setSortOrder((prev) => {
      if (prev === null) return 'low-high';
      if (prev === 'low-high') return 'high-low';
      return null;
    });
  }, []);

  // ── Context value ────────────────────────────────────────
  const value = {
    // data
    products,
    deals,
    productsLoading,
    dealsLoading,
    // filters
    activeCategory,
    setActiveCategory,
    sortOrder,
    cycleSortOrder,
    // scroll
    scrollY,
    setScrollY,
    // notifications
    notificationCount,
  };

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

// ─────────────────────────────────────────────
// Consumer hook
// ─────────────────────────────────────────────

/**
 * Access the Home context from any component inside HomeProvider.
 * Throws if used outside the provider — helps catch wiring mistakes early.
 */
export function useHomeContext() {
  const ctx = useContext(HomeContext);
  if (!ctx) {
    throw new Error('useHomeContext must be used inside <HomeProvider>');
  }
  return ctx;
}
