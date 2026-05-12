// ============================================
// CampusKart - Static UI Configuration
// ============================================
// This file contains ONLY static UI configuration (e.g. category
// definitions for filter chips). All product, chat, and user data
// is fetched from Firebase Firestore in real time.
// ============================================

import { Tag, Book, FileText, Laptop, Pencil, Package } from 'lucide-react';

export const categories = [
  { id: 'all', label: 'All', icon: <Tag size={18} strokeWidth={2} /> },
  { id: 'books', label: 'Books', icon: <Book size={18} strokeWidth={2} /> },
  { id: 'notes', label: 'Notes', icon: <FileText size={18} strokeWidth={2} /> },
  { id: 'gadgets', label: 'Gadgets', icon: <Laptop size={18} strokeWidth={2} /> },
  { id: 'stationery', label: 'Stationery', icon: <Pencil size={18} strokeWidth={2} /> },
  { id: 'others', label: 'Others', icon: <Package size={18} strokeWidth={2} /> },
];
