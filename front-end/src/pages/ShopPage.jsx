import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import { getProducts, getCategories } from '../api/data';

const PER_PAGE = 12;
const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A-Z' },
  { value: 'name-desc', label: 'Name: Z-A' },
];

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState({ data: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'created_at-desc';

  const debounceRef = useRef(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setSearchInput(search);
    setLoading(true);
    const [sortField, sortDir] = sort.split('-');
    getProducts({ page, perPage: PER_PAGE, category, search, sort: sortField, order: sortDir })
      .then(setProducts)
      .catch(() => setProducts({ data: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [category, search, page, sort]);

  function updateParams(updates) {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (!('page' in updates)) params.delete('page');
    setSearchParams(params);
  }

  const handleSearchInput = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: val.trim() });
    }, 400);
  }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    updateParams({ search: searchInput.trim() });
  }

  const currentCat = categories.find(c => c.slug === category);
  const totalPages = Math.max(1, Math.ceil(products.total / PER_PAGE));
  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <main className="content-area">
      <Seo title={currentCat ? currentCat.name : 'Shop'} description={currentCat?.description || 'Browse our full collection of Pokemon TCG products.'} />
      <div className="container">
        <header className="shop-header">
          <h1 className="shop-title">{currentCat ? currentCat.name : 'Shop'}</h1>
          {currentCat?.description && <p className="term-description">{currentCat.description}</p>}
        </header>

        <div className="shop-layout">
          <aside className="shop-sidebar">
            <div className="widget">
              <label htmlFor="shop-search" className="widget-title">Search</label>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  id="shop-search"
                  type="text"
                  value={searchInput}
                  onChange={handleSearchInput}
                  placeholder="Search products..."
                />
                <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Go</button>
              </form>
              {search && (
                <button
                  onClick={() => updateParams({ search: '' })}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'var(--font-primary)' }}
                >
                  Clear search
                </button>
              )}
            </div>

            <div className="widget">
              <h3 className="widget-title">Categories</h3>
              <ul>
                <li>
                  <Link to="/shop" className={!category ? 'active' : ''}>
                    All Products
                  </Link>
                </li>
                {categories.filter(c => c.slug !== 'uncategorized').map(c => (
                  <li key={c.id}>
                    <Link to={`/shop?category=${c.slug}`} className={category === c.slug ? 'active' : ''}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="shop-content">
            {!loading && products.data.length === 0 && !search ? null : (
              <div className="shop-toolbar">
                <span className="woocommerce-result-count">{products.total} products</span>
                <div className="shop-sort">
                  <label htmlFor="shop-sort" className="sr-only">Sort by</label>
                  <select
                    id="shop-sort"
                    value={sort}
                    onChange={e => updateParams({ sort: e.target.value })}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {loading ? (
              <div className="products-grid">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="skeleton skeleton-card" aria-hidden="true" />
                ))}
              </div>
            ) : products.data.length > 0 ? (
              <>
                <div className="products-grid">
                  {products.data.map(p => <ProductCard key={p.id} product={p} />)}
                </div>

                {totalPages > 1 && (
                  <nav className="pagination" aria-label="Product pagination">
                    <button
                      className="pagination-btn"
                      disabled={page <= 1}
                      onClick={() => updateParams({ page: String(page - 1) })}
                      aria-label="Previous page"
                    >
                      &lsaquo; Prev
                    </button>
                    {pageNumbers.map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="pagination-ellipsis">&hellip;</span>
                      ) : (
                        <button
                          key={p}
                          className={`pagination-btn ${p === page ? 'active' : ''}`}
                          onClick={() => updateParams({ page: String(p) })}
                          aria-label={`Page ${p}`}
                          aria-current={p === page ? 'page' : undefined}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      className="pagination-btn"
                      disabled={page >= totalPages}
                      onClick={() => updateParams({ page: String(page + 1) })}
                      aria-label="Next page"
                    >
                      Next &rsaquo;
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <p className="no-results">No products found{search ? ` for "${search}"` : ''}.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
