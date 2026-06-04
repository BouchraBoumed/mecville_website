import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import HeroSection from '../components/HeroSection';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import { getFeaturedProducts, getCategories } from '../api/data';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    getFeaturedProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
    getCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, []);

  return (
    <main className="homepage">
      <Seo />
      <HeroSection />

      <section className="section featured-products">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Featured Products</h2>
            <Link to="/shop" className="btn btn-outline">View All</Link>
          </div>
          {loadingProducts ? (
            <div className="products-grid">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-card" aria-hidden="true" />)}
            </div>
          ) : products.length > 0 ? (
            <div className="products-grid">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="no-products">
              <p>No featured products yet.</p>
              <Link to="/shop" className="btn btn-accent">Browse Shop</Link>
            </div>
          )}
        </div>
      </section>

      <section className="section categories-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Shop by Category</h2>
          </div>
          {loadingCategories ? (
            <div className="categories-grid">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 'var(--radius-md)' }} aria-hidden="true" />)}
            </div>
          ) : categories.length > 0 ? (
            <div className="categories-grid">
              {categories.filter(c => c.slug !== 'uncategorized').slice(0, 8).map(c => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </div>
          ) : (
            <p className="no-categories">No categories yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
