import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductBySlug, addToCart } from '../api/woocommerce';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProductBySlug(slug)
      .then(p => { setProduct(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <main className="content-area"><div className="container"><p className="loading">Loading...</p></div></main>;
  if (!product) return <main className="content-area"><div className="container"><p>Product not found.</p></div></main>;

  const img = product.images?.[0]?.src || '';
  const gallery = product.images?.slice(1) || [];
  const price = product.prices?.price ? parseInt(product.prices.price) / 100 : 0;
  const regularPrice = product.prices?.regular_price ? parseInt(product.prices.regular_price) / 100 : 0;
  const salePrice = product.prices?.sale_price ? parseInt(product.prices.sale_price) / 100 : null;

  const attrs = product.attributes || [];

  async function handleAddToCart() {
    try {
      await addToCart(product.id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      alert('Failed to add to cart: ' + e.message);
    }
  }

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
            {product.on_sale && <span className="sale-badge">Sale</span>}
            <div className="product-price">
              {salePrice ? <><del>${regularPrice.toFixed(2)}</del> <ins>${salePrice.toFixed(2)}</ins></> : `$${price.toFixed(2)}`}
            </div>
            <div className="product-availability">
              {product.is_in_stock ? (
                <span className="in-stock">✓ In Stock</span>
              ) : (
                <span className="out-of-stock">✗ Out of Stock</span>
              )}
            </div>
            {product.short_description && (
              <div className="product-excerpt" dangerouslySetInnerHTML={{ __html: product.short_description }} />
            )}

            <div className="cart">
              <div className="quantity">
                <input type="number" className="qty" value={qty} min="1" onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <button onClick={handleAddToCart} className="btn btn-accent single_add_to_cart_button" disabled={!product.is_in_stock}>
                {added ? '✓ Added!' : 'Add to Cart'}
              </button>
            </div>

            {attrs.length > 0 && (
              <div className="product-attributes">
                {attrs.filter(a => a.name !== 'Description').map(attr => (
                  <div className="attr-row" key={attr.id || attr.name}>
                    <span className="attr-label">{attr.name}</span>
                    <span className="attr-value">{attr.options?.join(', ') || attr.option}</span>
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
      </div>
    </main>
  );
}
