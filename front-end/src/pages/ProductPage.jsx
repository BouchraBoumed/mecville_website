import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { useToast } from '../components/Toast';
import { getProductBySlug, getProducts, addToCart, getReviews, createReview } from '../api/data';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';
import { sanitizeHtml } from '../lib/sanitize';
import { Helmet } from 'react-helmet-async';

export default function ProductPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    getProductBySlug(slug)
      .then(p => {
        setProduct(p);
        if (p) {
          getReviews(p.id).then(setReviews).catch(() => {});
          if (p.category_id) {
            getProducts({ perPage: 4, category: p.categories?.slug })
              .then(({ data }) => setRelated(data.filter(r => r.id !== p.id).slice(0, 4)))
              .catch(() => {});
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  async function handleAddToCart() {
    try {
      await addToCart(product.id, qty);
      setAdded(true);
      addToast(`Added ${qty > 1 ? `${qty}x ` : ''}"${product.name}" to cart`, 'success');
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  const allImages = product?.images || [];
  const mainImg = allImages[activeImg]?.src || '';

  if (loading) return <main className="content-area"><div className="container"><p className="loading">Loading...</p></div></main>;
  if (!product) return <main className="content-area"><div className="container"><p className="no-results">Product not found.</p></div></main>;

  const price = Number(product.price) || 0;
  const regularPrice = product.compare_price ? Number(product.compare_price) : null;
  const salePrice = regularPrice && regularPrice > price ? price : null;
  const displayPrice = salePrice || price;
  const isOnSale = !!salePrice;
  const inStock = product.stock > 0;
  const attrs = product.attributes || {};

  return (
    <main className="content-area">
      <Seo
        title={product.name}
        description={product.short_description?.replace(/<[^>]*>/g, '') || `Buy ${product.name} at Mecville - Pokemon TCG store.`}
        image={allImages[0]?.src}
        url={`/product/${product.slug}`}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org/',
            '@type': 'Product',
            name: product.name,
            description: product.short_description?.replace(/<[^>]*>/g, '') || product.name,
            sku: product.sku || undefined,
            image: allImages.map(img => img.src).filter(Boolean),
            brand: { '@type': 'Brand', name: 'Mecville' },
            offers: {
              '@type': 'Offer',
              price: price.toFixed(2),
              priceCurrency: 'CAD',
              availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url: `${window.location.origin}/product/${product.slug}`,
              seller: { '@type': 'Organization', name: 'Mecville' },
            },
            ...(reviews.length > 0 ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
                reviewCount: reviews.length,
              },
            } : {}),
          })}
        </script>
      </Helmet>
      <div className="container">
        <nav className="woocommerce-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / <span>{product.name}</span>
        </nav>

        <div className="single-product-wrapper">
          <div className="single-product-gallery">
            <div className="product-main-image">
              {mainImg ? (
                <img src={mainImg} alt={product.name} />
              ) : (
                <div className="product-main-image placeholder">
                  <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="product-thumbnails">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    className={`thumb ${i === activeImg ? 'active' : ''}`}
                    onClick={() => setActiveImg(i)}
                    aria-label={`View image ${i + 1} of ${allImages.length}`}
                  >
                    <img src={img.src} alt={`${product.name} - view ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="single-product-summary">
            <h1 className="product-title">{product.name}</h1>
            {reviews.length > 0 && (
              <div className="product-rating-summary">
                <span className="rating-stars">{'★'.repeat(Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length))}{'☆'.repeat(5 - Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length))}</span>
                <span className="rating-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div className="product-price">
              {isOnSale ? <><del>${regularPrice.toFixed(2)}</del> <ins>${salePrice.toFixed(2)}</ins></> : `$${displayPrice.toFixed(2)}`}
            </div>
            <div className="product-availability">
              {inStock ? (
                <span className="in-stock">In Stock ({product.stock} available)</span>
              ) : (
                <span className="out-of-stock">Out of Stock</span>
              )}
            </div>
            {product.short_description && (
              <div className="product-excerpt" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.short_description) }} />
            )}

            {inStock && (
              <div className="cart">
                <div className="quantity-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >&minus;</button>
                  <span className="stepper-value" aria-live="polite">{qty}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setQty(Math.min(Math.min(99, product.stock), qty + 1))}
                    disabled={qty >= Math.min(99, product.stock)}
                    aria-label="Increase quantity"
                  >+</button>
                </div>
                <button onClick={handleAddToCart} className="btn btn-accent single_add_to_cart_button">
                  {added ? 'Added!' : 'Add to Cart'}
                </button>
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
          <div className="product-description" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} />
        )}

        <div className="reviews-section">
          <h2>Customer Reviews</h2>
          {reviews.length > 0 ? (
            <div>
              {reviews.map(r => (
                <div key={r.id} className="review-item">
                  <div className="review-header">
                    <span className="review-author">{r.profiles?.first_name || 'Anonymous'}</span>
                    <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {r.title && <div className="review-title">{r.title}</div>}
                  {r.content && <p className="review-content">{r.content}</p>}
                  <div className="review-date">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-results">No reviews yet. Be the first to review this product!</p>
          )}

          {user && (
            <div className="review-form">
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
                  addToast('Review submitted! It will appear after approval.', 'success');
                  form.reset();
                  getReviews(product.id).then(setReviews).catch(() => {});
                } catch (err) {
                  addToast(err.message, 'error');
                }
              }}>
                <label htmlFor="review-rating">Rating</label>
                <select id="review-rating" name="rating" required>
                  <option value="">Select rating</option>
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Terrible</option>
                </select>
                <label htmlFor="review-title">Title</label>
                <input id="review-title" name="title" type="text" placeholder="Review title" />
                <label htmlFor="review-content">Review</label>
                <textarea id="review-content" name="content" rows="4" placeholder="Share your thoughts..." />
                <button type="submit" className="btn btn-accent">Submit Review</button>
              </form>
            </div>
          )}
        </div>

        {related.length > 0 && (
          <div className="related-section">
            <h2 className="related-title">Related Products</h2>
            <div className="products-grid">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {inStock && (
        <div className="mobile-buy-bar" role="region" aria-label="Quick purchase">
          <span className="mbb-price">${displayPrice.toFixed(2)}</span>
          <button onClick={handleAddToCart} className="btn btn-accent mbb-btn">
            {added ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
      )}
    </main>
  );
}
