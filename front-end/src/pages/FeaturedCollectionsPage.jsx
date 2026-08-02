import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import CategoryCard from '../components/CategoryCard';
import Reveal from '../components/Reveal';
import ErrorState from '../components/ErrorState';
import { getCategories, getFeaturedProducts } from '../api/data';
import ProductCard from '../components/ProductCard';

export default function FeaturedCollectionsPage() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      getCategories().catch(() => { throw new Error('categories'); }),
      getFeaturedProducts().catch(() => { throw new Error('featured'); }),
    ])
      .then(([cats, feats]) => {
        setCategories(cats || []);
        setFeatured(feats || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="content-area">
      <Seo title="Featured Collections" description="Curated Pokémon TCG collections from Mecville — booster boxes, premium singles, graded cards, and exclusive accessories." />
      <div className="container">
        <section className="page-intro">
          <h1>Featured Collections</h1>
          <p>Hand-picked sets and standout singles from our curated Pokémon TCG lineup.</p>
        </section>

        {loading ? (
          <div className="categories-grid">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 'var(--radius-md)' }} aria-hidden="true" />)}
          </div>
        ) : error ? (
          <ErrorState title="Couldn't load collections" message="We couldn't fetch our collections right now. Please try again." onRetry={load} />
        ) : categories.length > 0 ? (
          <Reveal as="div" className="categories-grid" stagger={0.05} y={24}>
            {categories.filter(c => c.slug !== 'uncategorized').map(c => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </Reveal>
        ) : (
          <ErrorState title="No collections yet" message="Collections will appear here once categories are added. Browse the full shop in the meantime." actionTo="/shop" />
        )}

        {featured.length > 0 && (
          <section className="section featured-products" style={{ padding: '40px 0' }}>
            <div className="section-header">
              <h2 className="section-title">Featured Products</h2>
              <Link to="/shop" className="view-all-link">View All &rsaquo;</Link>
            </div>
            <Reveal as="div" className="products-grid" stagger={0.05} y={20}>
              {featured.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
            </Reveal>
          </section>
        )}
      </div>
    </main>
  );
}