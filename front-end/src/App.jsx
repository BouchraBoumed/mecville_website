import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { ScrollTrigger } from './lib/gsap';

// Code-split route components so Stripe/PayPal libs and admin code only load
// when those routes are visited. This keeps the initial bundle small and
// improves first-paint / page-load-speed (a key UX metric).
const HomePage = lazy(() => import('./pages/HomePage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const NewArrivalsPage = lazy(() => import('./pages/NewArrivalsPage'));
const FeaturedCollectionsPage = lazy(() => import('./pages/FeaturedCollectionsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RouteFallback() {
  return (
    <main className="content-area">
      <div className="container">
        <div className="skeleton-page" aria-hidden="true">
          <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const location = useLocation();

  // Refresh ScrollTrigger positions on route changes so GSAP reveals
  // trigger correctly after the new page's content renders.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <ErrorBoundary>
    <div className="site">
      <Header />
      <div className="site-content">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:category" element={<ShopPage />} />
            <Route path="/new-arrivals" element={<NewArrivalsPage />} />
            <Route path="/featured-collections" element={<FeaturedCollectionsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order/confirm" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<LegalPage page="privacy" />} />
            <Route path="/terms" element={<LegalPage page="terms" />} />
            <Route path="/shipping" element={<LegalPage page="shipping" />} />
            <Route path="/refund" element={<LegalPage page="refund" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
    </ErrorBoundary>
  );
}