import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts, getCategories } from '../api/woocommerce';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const catId = categories.find(c => c.slug === category)?.id;
    getProducts({ page, category: catId, search })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, search, page]);

  const currentCat = categories.find(c => c.slug === category);

  return (
    <main className="content-area">
      <div className="container">
        <header className="shop-header">
          <h1 className="shop-title">{currentCat ? currentCat.name : 'Shop'}</h1>
          {currentCat?.description && <p className="term-description">{currentCat.description}</p>}
        </header>

        <div className="shop-layout">
          <aside className="shop-sidebar">
            <div className="widget">
              <h3 className="widget-title">Categories</h3>
              <ul>
                <li><a href="/shop" className={!category ? 'active' : ''}>All Products</a></li>
                {categories.filter(c => c.slug !== 'uncategorized').map(c => (
                  <li key={c.id}>
                    <a
                      href={`/shop?category=${c.slug}`}
                      className={category === c.slug ? 'active' : ''}
                    >
                      {c.name} ({c.count})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="shop-content">
            <div className="shop-toolbar">
              <span className="woocommerce-result-count">{products.length} products</span>
            </div>

            {loading ? (
              <div className="loading">Loading...</div>
            ) : products.length > 0 ? (
              <div className="products-grid">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <p className="no-products">No products found.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
