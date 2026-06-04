import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addToCart } from '../api/data';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const img = product.images?.[0]?.src || '';
  const price = Number(product.price) || 0;
  const comparePrice = product.compare_price ? Number(product.compare_price) : null;
  const isOnSale = !!comparePrice && comparePrice > price;
  const inStock = product.stock > 0;
  const attrs = Object.values(product.attributes || {}).filter(Boolean).slice(0, 3);

  async function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      addToast('Please log in to add items to your cart', 'info');
      return;
    }
    if (!inStock) return;
    setAdding(true);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      addToast(`Added "${product.name}" to cart`, 'success');
      setTimeout(() => setAdded(false), 1500);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  }

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
      <button
        className={`product-card-add ${added ? 'added' : ''}`}
        onClick={handleAddToCart}
        disabled={!inStock || adding}
        aria-label={inStock ? `Add ${product.name} to cart` : `${product.name} is out of stock`}
      >
        {!inStock ? 'Out of Stock' : added ? 'Added!' : 'Add to Cart'}
      </button>
    </div>
  );
}
