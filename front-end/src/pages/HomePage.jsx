import { useState, useEffect } from 'react';
import HeroSection from '../components/HeroSection';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import { getFeaturedProducts, getCategories } from '../api/data';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getFeaturedProducts().then(setProducts).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
  }, []);

  return (
    <main className="homepage">
      <HeroSection />

      <section className="section featured-products">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Featured Products</h2>
            <a href="/shop" className="btn btn-outline">View All</a>
          </div>
          {products.length > 0 ? (
            <div className="products-grid">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <p className="no-products">No featured products yet.</p>
          )}
        </div>
      </section>

      <section className="section categories-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Shop by Category</h2>
          </div>
          {categories.length > 0 ? (
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
