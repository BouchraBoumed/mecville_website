import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { getProducts } from '../api/data';

export default function GalleryPage() {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      <Seo title="Gallery" description="Explore Mecville's product highlights and premium Pokémon TCG collectables." />
      <div className="container">
        <section className="page-intro">
          <h1>Gallery</h1>
          <p>Explore Mecville's product highlights and premium collectables. Browse curated card collections, sealed sets, and graded inventory in one place.</p>
        </section>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : galleryItems.length > 0 ? (
          <div className="gallery-grid">
            {galleryItems.map(item => (
              <Link to={`/product/${item.slug}`} key={item.id} style={{ textDecoration: 'none' }}>
                <article className="gallery-card">
                  <img src={item.images?.[0]?.src} alt={item.name} />
                  <div className="gallery-card-content">
                    <h3 className="gallery-card-title">{item.name}</h3>
                    <p className="gallery-card-description">{item.short_description?.replace(/<[^>]*>/g, '').slice(0, 120) || 'Premium collectable card or product.'}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: '#8892a4', fontSize: 18, marginBottom: 24 }}>Gallery items will appear here once products with images are added.</p>
            <Link to="/shop" className="btn btn-accent">Browse Shop</Link>
          </div>
        )}
      </div>
    </main>
  );
}
