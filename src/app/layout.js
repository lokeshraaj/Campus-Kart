import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { SuccessPopupProvider } from "@/components/SuccessPopup";

export const metadata = {
  title: "CampusKart - College Marketplace",
  description: "Buy & sell books, notes, gadgets and more within your college campus. Only verified students allowed.",
  keywords: "college marketplace, student marketplace, buy sell books, campus buy sell, college gadgets",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <SuccessPopupProvider>{children}</SuccessPopupProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
