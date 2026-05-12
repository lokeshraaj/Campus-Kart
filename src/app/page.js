'use client';
import { useState, useEffect } from 'react';
import { Home as HomeIcon, Search, PlusSquare, MessageCircle, User, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { findOrCreateChat, updateUserPresence } from '@/lib/chatService';
import BottomNav from '@/components/BottomNav';
import HomeScreen from '@/components/screens/HomeScreen';
import SearchScreen from '@/components/screens/SearchScreen';
import AddProductScreen from '@/components/screens/AddProductScreen';
import ChatsScreen from '@/components/screens/ChatsScreen';
import ProfileScreen from '@/components/screens/ProfileScreen';
import ProductDetailScreen from '@/components/screens/ProductDetailScreen';
import ChatScreen from '@/components/screens/ChatScreen';
import LoginScreen from '@/components/screens/LoginScreen';
import toast from 'react-hot-toast';

export default function Home() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);

  // Track user presence (online/offline)
  useEffect(() => {
    if (!user?.uid) return;

    updateUserPresence(user.uid, true);

    const handleBeforeUnload = () => {
      updateUserPresence(user.uid, false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateUserPresence(user.uid, false);
    };
  }, [user?.uid]);

  // Show a loading spinner while Firebase resolves the auth session
  if (loading) {
    return (
      <div className="app-shell" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100dvh', background: 'var(--white)',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
        }}>
          <ShoppingCart size={40} strokeWidth={2} color="#2563EB" />
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading…</p>
        </div>
      </div>
    );
  }

  // Not signed in → show login
  if (!user) {
    return (
      <div className="app-shell login-shell">
        <LoginScreen />
      </div>
    );
  }

  // Product Detail view
  if (selectedProduct) {
    const handleStartChat = async () => {
      const sellerId = selectedProduct.userId;
      if (!sellerId || sellerId === user.uid) {
        toast.error("You can't chat with yourself!");
        return;
      }

      try {
        const buyerName = user.displayName || user.email?.split('@')[0] || 'Buyer';
        const sellerName = selectedProduct.sellerName || 'Seller';
        const sellerFirst = sellerName.trim().split(' ')[0] || 'S';
        const chatId = await findOrCreateChat(user.uid, sellerId, {
          ...selectedProduct,
          buyerName,
          sellerName,
        });
        setSelectedChat({
          id: chatId,
          participants: [user.uid, sellerId].sort(),
          buyerId: user.uid,
          sellerId,
          buyerName,
          sellerName,
          name: sellerName,
          avatar: sellerFirst.slice(0, 2).toUpperCase(),
          productId: selectedProduct.id,
          productTitle: selectedProduct.title,
          productPrice: selectedProduct.price,
        });
        setSelectedProduct(null);
      } catch (err) {
        console.error('Failed to start chat:', err);
        toast.error('Failed to start conversation');
      }
    };

    return (
      <div className="app-shell detail-shell">
        <ProductDetailScreen
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          onChat={handleStartChat}
        />
      </div>
    );
  }

  // Individual Chat view
  if (selectedChat) {
    return (
      <div className="app-shell detail-shell">
        <ChatScreen
          chat={selectedChat}
          onBack={() => {
            setSelectedChat(null);
            setActiveTab('chats');
          }}
        />
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onProductClick={setSelectedProduct} onSearchClick={() => setActiveTab('search')} />;
      case 'search':
        return <SearchScreen onProductClick={setSelectedProduct} />;
      case 'add':
        return <AddProductScreen onNavigate={setActiveTab} />;
      case 'chats':
        return <ChatsScreen onChatClick={setSelectedChat} />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onProductClick={setSelectedProduct} onSearchClick={() => setActiveTab('search')} />;
    }
  };

  const navItems = [
    { id: 'home', icon: <HomeIcon size={20} strokeWidth={2} />, label: 'Home' },
    { id: 'search', icon: <Search size={20} strokeWidth={2} />, label: 'Search' },
    { id: 'add', icon: <PlusSquare size={20} strokeWidth={2} />, label: 'Sell Item' },
    { id: 'chats', icon: <MessageCircle size={20} strokeWidth={2} />, label: 'Messages' },
    { id: 'profile', icon: <User size={20} strokeWidth={2} />, label: 'Profile' },
  ];

  return (
    <div className="app-shell holy-grail-layout">
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div className="sidebar-logo">
          <ShoppingCart size={24} strokeWidth={2} className="sidebar-logo-icon" /> CampusKart
        </div>
        <nav className="sidebar-nav-menu">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="page-content holy-grail-main">
        {renderScreen()}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="mobile-bottom-nav">
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}
