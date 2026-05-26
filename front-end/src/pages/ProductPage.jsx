import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductBySlug, addToCart, getReviews, createReview } from '../api/data';
import { useAuth } from '../contexts/AuthContext';

export default function ProductPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    setLoading(true);
    getProductBySlug(slug)
      .then(p => {
        setProduct(p);
        if (p) getReviews(p.id).then(setReviews).catch(() => {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  async function handleAddToCart() {
    try {
      await addToCart(product.id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      alert('Failed to add to cart: ' + e.message);
    }
  }

  if (loading) return <main className="content-area"><div className="container"><p className="loading">Loading...</p></div></main>;
  if (!product) return <main className="content-area"><div className="container"><p>Product not found.</p></div></main>;

  const img = product.images?.[0]?.src || '';
  const gallery = product.images?.slice(1) || [];
  const price = Number(product.price) || 0;
  const regularPrice = product.compare_price ? Number(product.compare_price) : null;
  const salePrice = regularPrice && regularPrice > price ? price : null;
  const displayPrice = salePrice || price;
  const isOnSale = !!salePrice;
  const inStock = product.stock > 0;
  const attrs = product.attributes || {};

  return (
    <main className="content-area">
      <div className="container">
        <nav className="woocommerce-breadcrumb">
          <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / <span>{product.name}</span>
        </nav>

        <div className="single-product-wrapper">
          <div className="single-product-gallery">
            <div className="product-main-image">
              {img ? (
                <img src={img} alt={product.name} />
              ) : (
                <div className="product-main-image placeholder">
                  <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
              )}
            </div>
            {gallery.length > 0 && (
              <div className="product-thumbnails">
                {product.images.map((img, i) => (
                  <div key={i} className="thumb"><img src={img.src} alt="" /></div>
                ))}
              </div>
            )}
          </div>

          <div className="single-product-summary">
            <h1 className="product-title">{product.name}</h1>
            {isOnSale && <span className="sale-badge">Sale</span>}
            <div className="product-price">
              {isOnSale ? <><del>${regularPrice.toFixed(2)}</del> <ins>${salePrice.toFixed(2)}</ins></> : `$${displayPrice.toFixed(2)}`}
            </div>
            <div className="product-availability">
              {inStock ? (
                <span className="in-stock">✓ In Stock ({product.stock} available)</span>
              ) : (
                <span className="out-of-stock">✗ Out of Stock</span>
              )}
            </div>
            {product.short_description && (
              <div className="product-excerpt" dangerouslySetInnerHTML={{ __html: product.short_description }} />
            )}

            {inStock && (
              <div className="cart">
                <div className="quantity">
                  <input type="number" className="qty" value={qty} min="1" max={Math.min(99, product.stock)} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <button onClick={handleAddToCart} className="btn btn-accent single_add_to_cart_button" disabled={!user}>
                  {!user ? 'Log in to Purchase' : added ? '✓ Added!' : 'Add to Cart'}
                </button>
                {!user && <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Create an account to add items to your cart.</p>}
              </div>
            )}

            {Object.keys(attrs).length > 0 && (
              <div className="product-attributes">
                {Object.entries(attrs).map(([key, value]) => (
                  <div className="attr-row" key={key}>
                    <span className="attr-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <span className="attr-value">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {product.sku && <div className="product-sku">SKU: {product.sku}</div>}
          </div>
        </div>

        {product.description && (
          <div className="single-product-tabs">
            <div className="woocommerce-tabs">
              <ul className="tabs">
                <li className="active"><a href="#description">Description</a></li>
              </ul>
              <div className="panel" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="single-product-tabs" style={{ marginTop: 40 }}>
          <h2>Customer Reviews</h2>
          {reviews.length > 0 ? (
            <div className="reviews-list">
              {reviews.map(r => (
                <div key={r.id} className="review-item" style={{ padding: 16, borderBottom: '1px solid #333', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{r.profiles?.first_name || 'Anonymous'}</strong>
                    <span style={{ color: '#d4a84b' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {r.title && <h4 style={{ margin: '8px 0 4px' }}>{r.title}</h4>}
                  {r.content && <p style={{ fontSize: 14, color: '#ccc' }}>{r.content}</p>}
                  <small style={{ color: '#666' }}>{new Date(r.created_at).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>No reviews yet.</p>
          )}

          {user && (
            <div style={{ marginTop: 24, padding: 20, background: '#1e1e32', borderRadius: 8 }}>
              <h3>Write a Review</h3>
              <form onSubmit={async e => {
                e.preventDefault();
                const form = e.target;
                try {
                  await createReview(product.id, {
                    rating: parseInt(form.rating.value),
                    title: form.title.value,
                    content: form.content.value,
                  });
                  alert('Review submitted! It will appear after approval.');
                  form.reset();
                } catch (err) {
                  alert('Failed to submit review: ' + err.message);
                }
              }}>
                <div style={{ marginBottom: 12 }}>
                  <label>Rating *</label>
                  <select name="rating" required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}>
                    <option value="">Select rating</option>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Terrible</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Title</label>
                  <input name="title" type="text" placeholder="Review title" style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Review</label>
                  <textarea name="content" rows="4" placeholder="Share your thoughts..." style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, background: '#0f0f23', border: '1px solid #333', color: '#fff', borderRadius: 4 }} />
                </div>
                <button type="submit" className="btn btn-accent">Submit Review</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
