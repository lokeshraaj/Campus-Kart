'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';
import HomeScreen from '@/components/screens/HomeScreen';
import SearchScreen from '@/components/screens/SearchScreen';
import AddProductScreen from '@/components/screens/AddProductScreen';
import ChatsScreen from '@/components/screens/ChatsScreen';
import ProfileScreen from '@/components/screens/ProfileScreen';
import ProductDetailScreen from '@/components/screens/ProductDetailScreen';
import ChatScreen from '@/components/screens/ChatScreen';
import LoginScreen from '@/components/screens/LoginScreen';

export default function Home() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);

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
          <div className="login-logo">🛒</div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading…</p>
        </div>
      </div>
    );
  }

  // Not signed in → show login
  if (!user) {
    return (
      <div className="app-shell">
        <LoginScreen />
      </div>
    );
  }

  // Product Detail view
  if (selectedProduct) {
    return (
      <div className="app-shell">
        <ProductDetailScreen
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          onChat={() => {
            setSelectedChat({
              id: selectedProduct.seller?.name || selectedProduct.sellerName,
              name: selectedProduct.seller?.name || selectedProduct.sellerName,
              avatar: selectedProduct.seller?.avatar || (selectedProduct.sellerName || 'U').slice(0, 2).toUpperCase(),
            });
            setSelectedProduct(null);
          }}
        />
      </div>
    );
  }

  // Individual Chat view
  if (selectedChat) {
    return (
      <div className="app-shell">
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
        return <HomeScreen onProductClick={setSelectedProduct} />;
      case 'search':
        return <SearchScreen onProductClick={setSelectedProduct} />;
      case 'add':
        return <AddProductScreen />;
      case 'chats':
        return <ChatsScreen onChatClick={setSelectedChat} />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onProductClick={setSelectedProduct} />;
    }
  };

  return (
    <div className="app-shell">
      <div className="page-content">
        {renderScreen()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
