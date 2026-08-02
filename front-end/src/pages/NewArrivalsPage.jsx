import { useState, useEffect, useCallback } from 'react';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import ErrorState from '../components/ErrorState';
import { getProducts } from '../api/data';

export default function NewArrivalsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getProducts({ page: 1, perPage: 24 })
      .then(({ data }) => setItems(data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="content-area">
      <Seo title="New Arrivals" description="Fresh pulls, recent restocks, and hits of the week from Mecville — premium Pokémon TCG singles, sealed products, and graded cards." />
      <div className="container">
        <section className="page-intro">
          <h1>New Arrivals</h1>
          <p>Fresh pulls, recent restocks, and hits of the week. Browse our latest additions before they are gone.</p>
        </section>

        {loading ? (
          <div className="products-grid">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton skeleton-card" aria-hidden="true" />)}
          </div>
        ) : error ? (
          <ErrorState title="Couldn't load new arrivals" message="We couldn't fetch the latest arrivals right now. Please try again." onRetry={load} />
        ) : items.length > 0 ? (
          <Reveal as="div" className="products-grid" stagger={0.04} y={20}>
            {items.map(p => <ProductCard key={p.id} product={p} />)}
          </Reveal>
        ) : (
          <ErrorState title="No new arrivals yet" message="New arrivals will appear here once products are added. Browse the full shop in the meantime." actionTo="/shop" />
        )}
      </div>
    </main>
  );
}