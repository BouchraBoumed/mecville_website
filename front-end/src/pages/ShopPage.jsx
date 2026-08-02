import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import ErrorState from '../components/ErrorState';
import { getProducts, getCategories } from '../api/data';

const PER_PAGE = 12;
const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A-Z' },
  { value: 'name-desc', label: 'Name: Z-A' },
];

// Attribute keys that get checkbox facets in the sidebar.
const FACET_KEYS = ['set', 'series', 'condition', 'grade', 'grader', 'rarity', 'language'];

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

// Parse a comma-separated URL param into an array of strings.
function paramToArray(val) {
  if (!val) return [];
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState({ data: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'created_at-desc';

  // Filter params from URL
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const inStockOnly = searchParams.get('in_stock') === '1';
  const activeFacets = useMemo(() => {
    const facets = {};
    for (const key of FACET_KEYS) {
      facets[key] = paramToArray(searchParams.get(`f_${key}`));
    }
    return facets;
  }, [searchParams]);

  const debounceRef = useRef(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setSearchInput(search);
    setLoading(true);
    setError(false);
    const [sortField, sortDir] = sort.split('-');
    getProducts({ page, perPage: PER_PAGE, category, search, sort: sortField, order: sortDir })
      .then(setProducts)
      .catch(() => { setProducts({ data: [], total: 0 }); setError(true); })
      .finally(() => setLoading(false));
  }, [category, search, page, sort]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    const [sortField, sortDir] = sort.split('-');
    getProducts({ page, perPage: PER_PAGE, category, search, sort: sortField, order: sortDir })
      .then(setProducts)
      .catch(() => { setProducts({ data: [], total: 0 }); setError(true); })
      .finally(() => setLoading(false));
  }, [category, search, page, sort]);

  // Apply client-side filters (price, stock, attributes) to the fetched products.
  const filteredData = useMemo(() => {
    let result = products.data;

    if (minPrice) {
      const min = parseFloat(minPrice);
      result = result.filter(p => Number(p.price) >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      result = result.filter(p => Number(p.price) <= max);
    }
    if (inStockOnly) {
      result = result.filter(p => p.stock > 0);
    }
    // Attribute facets: a product matches if it has the attribute key with a value
    // that's in the selected set (case-insensitive). Empty facet sets = no filter.
    for (const key of FACET_KEYS) {
      const selected = activeFacets[key];
      if (selected.length === 0) continue;
      result = result.filter(p => {
        const attrs = p.attributes || {};
        const val = String(attrs[key] || '').toLowerCase();
        return selected.some(s => s.toLowerCase() === val);
      });
    }
    return result;
  }, [products.data, minPrice, maxPrice, inStockOnly, activeFacets]);

  // Build available facet options from the fetched products.
  const facetOptions = useMemo(() => {
    const options = {};
    for (const key of FACET_KEYS) {
      const values = new Set();
      for (const p of products.data) {
        const attrs = p.attributes || {};
        if (attrs[key]) values.add(String(attrs[key]));
      }
      options[key] = Array.from(values).sort();
    }
    return options;
  }, [products.data]);

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
  }, [searchParams]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    updateParams({ search: searchInput.trim() });
  }

  function handleFacetToggle(key, value) {
    const current = activeFacets[key];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateParams({ [`f_${key}`]: next.join(',') });
  }

  function clearAllFilters() {
    const params = new URLSearchParams(searchParams);
    // Remove all filter params but keep category, search, sort, page.
    params.delete('min_price');
    params.delete('max_price');
    params.delete('in_stock');
    for (const key of FACET_KEYS) params.delete(`f_${key}`);
    params.delete('page');
    setSearchParams(params);
  }

  const hasActiveFilters = minPrice || maxPrice || inStockOnly ||
    FACET_KEYS.some(k => activeFacets[k].length > 0);

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
              <form onSubmit={handleSearchSubmit} className="shop-search-form">
                <input
                  id="shop-search"
                  type="text"
                  value={searchInput}
                  onChange={handleSearchInput}
                  placeholder="Search products..."
                  aria-label="Search products"
                />
                <button type="submit" className="shop-search-btn" aria-label="Search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
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

            <div className="widget">
              <h3 className="widget-title">Price Range</h3>
              <div className="price-range-filter">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  value={minPrice}
                  onChange={e => updateParams({ min_price: e.target.value })}
                  aria-label="Minimum price"
                />
                <span className="price-range-sep">&ndash;</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={e => updateParams({ max_price: e.target.value })}
                  aria-label="Maximum price"
                />
              </div>
            </div>

            <div className="widget">
              <h3 className="widget-title">Availability</h3>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={e => updateParams({ in_stock: e.target.checked ? '1' : '' })}
                />
                In stock only
              </label>
            </div>

            {FACET_KEYS.map(key => {
              const opts = facetOptions[key];
              if (!opts || opts.length === 0) return null;
              return (
                <div className="widget" key={key}>
                  <h3 className="widget-title">{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                  <div className="facet-options">
                    {opts.map(val => (
                      <label className="filter-checkbox" key={val}>
                        <input
                          type="checkbox"
                          checked={activeFacets[key].includes(val)}
                          onChange={() => handleFacetToggle(key, val)}
                        />
                        {val}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 4 }}>
                Clear all filters
              </button>
            )}
          </aside>

          <div className="shop-content">
            {!loading && products.data.length === 0 && !search ? null : (
              <div className="shop-toolbar">
                <span className="woocommerce-result-count">{filteredData.length} of {products.total} products</span>
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
            ) : error ? (
              <ErrorState title="Couldn't load products" message="We couldn't fetch products right now. Please try again." onRetry={reload} />
            ) : filteredData.length > 0 ? (
              <>
                <Reveal as="div" className="products-grid" stagger={0.04} y={20}>
                  {filteredData.map(p => <ProductCard key={p.id} product={p} />)}
                </Reveal>

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
              <ErrorState
                title="No products found"
                message={search ? `No products matched "${search}"${hasActiveFilters ? ' with the current filters' : ''}. Try adjusting your search or filters.` : 'No products match the current filters. Try clearing them.'}
                actionTo="/shop"
                actionLabel="Reset filters"
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
