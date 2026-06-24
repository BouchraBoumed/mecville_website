import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { getProducts } from '../api/data';

export default function GalleryPage() {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Curated wall: newest arrivals with images (sorted by created_at desc by default).
    getProducts({ page: 1, perPage: 50 })
      .then(({ data }) => {
        const withImages = (data || []).filter(p => p.images && p.images.length > 0);
        setGalleryItems(withImages.slice(0, 12));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="content-area">
      <Seo title="New Arrivals" description="Explore Mecville's latest arrivals and hits of the week: premium Pokémon TCG singles, sealed products, and graded cards." />
      <div className="container">
        <section className="page-intro">
          <h1>New Arrivals</h1>
          <p>Fresh pulls, recent restocks, and hits of the week. Browse our latest additions before they are gone.</p>
        </section>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : galleryItems.length > 0 ? (
          <div className="gallery-grid">
            {galleryItems.map(item => {
              const price = Number(item.price) || 0;
              const inStock = item.stock > 0;
              return (
                <Link to={`/product/${item.slug}`} key={item.id} style={{ textDecoration: 'none' }}>
                  <article className="gallery-card">
                    <img src={item.images?.[0]?.src} alt={item.name} loading="lazy" />
                    <div className="gallery-card-content">
                      <h3 className="gallery-card-title">{item.name}</h3>
                      <div className="gallery-card-meta">
                        <span className="gallery-card-price">${price.toFixed(2)}</span>
                        <span className={`gallery-card-stock ${inStock ? 'in' : 'out'}`}>{inStock ? 'In Stock' : 'Sold Out'}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 18, marginBottom: 24 }}>New arrivals will appear here once products with images are added.</p>
            <Link to="/shop" className="btn btn-accent">Browse Shop</Link>
          </div>
        )}
      </div>
    </main>
  );
}
