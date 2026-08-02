import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import HeroSection from '../components/HeroSection';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import ErrorState from '../components/ErrorState';
import { getFeaturedProducts, getProducts } from '../api/data';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [errorGallery, setErrorGallery] = useState(false);
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState('idle');

  const loadProducts = useCallback(() => {
    setLoadingProducts(true);
    setErrorProducts(false);
    getFeaturedProducts()
      .then(setProducts)
      .catch(() => setErrorProducts(true))
      .finally(() => setLoadingProducts(false));
  }, []);

  const loadGallery = useCallback(() => {
    setLoadingGallery(true);
    setErrorGallery(false);
    getProducts({ page: 1, perPage: 50 })
      .then(({ data }) => {
        const withImages = (data || []).filter(p => p.images && p.images.length > 0);
        setGalleryItems(withImages.slice(0, 5));
      })
      .catch(() => setErrorGallery(true))
      .finally(() => setLoadingGallery(false));
  }, []);

  useEffect(() => {
    loadProducts();
    loadGallery();
  }, [loadProducts, loadGallery]);

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!email) return;
    setSubStatus('sending');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('failed');
      setSubStatus('sent');
      setEmail('');
    } catch {
      setSubStatus('error');
    }
  }

  return (
    <main className="homepage">
      <Seo />
      <HeroSection />

      <section className="section promo-blocks">
        <div className="container promo-grid">
          <Reveal as="article" className="promo-block" y={40}>
            <div className="promo-block-content">
              <h2>Unlock rare cards and fresh sets with every booster box.</h2>
              <Link to="/shop?category=sealed" className="btn btn-accent">Shop Booster Boxes</Link>
            </div>
          </Reveal>
          <Reveal as="article" className="promo-block" y={40} delay={0.1}>
            <div className="promo-block-content">
              <h2>Protect your collection with sleek, durable accessories.</h2>
              <Link to="/shop?category=accessories" className="btn btn-outline">Shop Accessories</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section featured-products">
        <div className="container">
          <Reveal as="div" className="section-header" stagger={0}>
            <h2 className="section-title">Shop Cards</h2>
            <Link to="/shop" className="view-all-link">Browse our curated selection of booster boxes, singles, and exclusive accessories to power up your Pokémon collection. &rsaquo;</Link>
          </Reveal>
          {loadingProducts ? (
            <div className="products-grid">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-card" aria-hidden="true" />)}
            </div>
          ) : errorProducts ? (
            <ErrorState title="Couldn't load products" message="We couldn't fetch our featured cards right now. Please try again." onRetry={loadProducts} actionTo="/shop" />
          ) : products.length > 0 ? (
            <Reveal as="div" className="products-grid" stagger={0.08} y={28}>
              {products.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
            </Reveal>
          ) : (
            <ErrorState title="No featured products yet" message="Our catalog is being curated. In the meantime, browse the full shop or sign up for drops below." actionTo="/shop" actionLabel="Browse Shop" />
          )}
        </div>
      </section>

      <section className="section gallery-section">
        <div className="container">
          <Reveal as="div" className="section-header" stagger={0}>
            <h2 className="section-title">Gallery</h2>
          </Reveal>
          <Reveal as="p" className="section-intro" y={16}>A vivid peek into Mecville's premium Pokémon collectibles and rare finds.</Reveal>
          {loadingGallery ? (
            <div className="gallery-masonry">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ minHeight: 240 }} aria-hidden="true" />)}
            </div>
          ) : errorGallery ? (
            <ErrorState title="Couldn't load the gallery" message="We couldn't fetch the latest collectibles. Please try again." onRetry={loadGallery} />
          ) : galleryItems.length > 0 ? (
            <Reveal as="div" className="gallery-masonry" stagger={0.1} y={32}>
              {galleryItems.map(item => (
                <Link to={`/product/${item.slug}`} key={item.id} className="gallery-tile" style={{ textDecoration: 'none' }}>
                  <img src={item.images?.[0]?.src} alt={item.name} loading="lazy" />
                </Link>
              ))}
            </Reveal>
          ) : (
            <ErrorState title="Gallery coming soon" message="Collectibles will appear here once products are added. Browse the full shop in the meantime." actionTo="/shop" />
          )}
        </div>
      </section>

      <section className="section newsletter-section">
        <Reveal as="div" className="container newsletter-inner" y={32}>
          <h2>Join Mecville</h2>
          <p>Get exclusive drops, early access, and special offers delivered straight to your inbox.</p>
          {subStatus === 'sent' ? (
            <p className="newsletter-confirm">Thanks for subscribing!</p>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Email *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                aria-label="Email"
              />
              <button type="submit" className="btn btn-accent" disabled={subStatus === 'sending'}>
                {subStatus === 'sending' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
          {subStatus === 'error' && (
            <p className="newsletter-error">Subscription form is not available at the moment</p>
          )}
        </Reveal>
      </section>
    </main>
  );
}