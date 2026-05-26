import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const img = product.images?.[0]?.src || '';
  const price = Number(product.price) || 0;
  const comparePrice = product.compare_price ? Number(product.compare_price) : null;
  const isOnSale = !!comparePrice && comparePrice > price;
  const inStock = product.stock > 0;
  const attrs = Object.values(product.attributes || {}).filter(Boolean).slice(0, 3);

  return (
    <div className={`product-card ${!inStock ? 'product-out-of-stock' : ''}`}>
      <Link to={`/product/${product.slug}`} className="product-card-link">
        <div className="product-thumbnail-wrap">
          {img ? (
            <img src={img} alt={product.name} loading="lazy" />
          ) : (
            <div className="product-thumbnail-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
          )}
          {isOnSale && <span className="sale-badge">Sale</span>}
          {!inStock && <span className="stock-badge out-of-stock">Out of Stock</span>}
        </div>
        <div className="product-info">
          <h3 className="product-title">{product.name}</h3>
          {attrs.length > 0 && <div className="product-meta">{attrs.join(' | ')}</div>}
          <div className="product-price">
            {isOnSale && <del>${comparePrice.toFixed(2)}</del>}
            <ins>${price.toFixed(2)}</ins>
          </div>
        </div>
      </Link>
    </div>
  );
}
