import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCart, updateCartItem, removeCartItem } from '../api/data';
import { useToast } from '../components/Toast';

export default function CartPage() {
  const { addToast } = useToast();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingQty, setPendingQty] = useState({});

  useEffect(() => {
    getCart().then(c => { setCart(c); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleQtyChange(key, qty) {
    if (qty < 1) qty = 1;
    setPendingQty(prev => ({ ...prev, [key]: qty }));
    try {
      const updated = await updateCartItem(key, qty);
      setCart(updated);
      setPendingQty(prev => { const n = { ...prev }; delete n[key]; return n; });
    } catch (e) {
      addToast(e.message, 'error');
      setPendingQty(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  }

  async function handleRemove(key) {
    try {
      const updated = await removeCartItem(key);
      setCart(updated);
      addToast('Item removed from cart', 'info');
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  if (loading) return (
    <main className="content-area">
      <div className="container">
        <div className="skeleton-page" aria-hidden="true">
          <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)', marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>
    </main>
  );

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  const subtotal = !isEmpty ? cart.items.reduce((s, i) => s + i.price * i.quantity, 0) : 0;

  return (
    <main className="content-area">
      <div className="container">
        <h1 className="page-title">Cart</h1>

        {isEmpty ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any cards yet. Time to start collecting!</p>
            <Link to="/shop" className="btn btn-accent">Browse Products</Link>
          </div>
        ) : (
          <>
            <div className="cart-table-wrap">
              <table className="shop_table cart" aria-label="Shopping cart">
                <thead>
                  <tr>
                    <th className="product-thumbnail">&nbsp;</th>
                    <th className="product-name">Product</th>
                    <th className="product-price">Price</th>
                    <th className="product-quantity">Quantity</th>
                    <th className="product-subtotal">Subtotal</th>
                    <th className="product-remove">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map(item => (
                    <tr key={item.key}>
                      <td className="product-thumbnail" data-title="Image">
                        <img src={item.image || ''} alt={item.name} width="64" height="64" loading="lazy" />
                      </td>
                      <td className="product-name" data-title="Product">
                        <Link to={`/product/${item.slug}`}>{item.name}</Link>
                      </td>
                      <td className="product-price" data-title="Price">${item.price.toFixed(2)}</td>
                      <td className="product-quantity" data-title="Quantity">
                        <label htmlFor={`qty-${item.key}`} className="sr-only">Quantity for {item.name}</label>
                        <input
                          id={`qty-${item.key}`}
                          type="number"
                          className="qty"
                          value={pendingQty[item.key] ?? item.quantity}
                          min="1"
                          max={Math.min(99, item.stock)}
                          onChange={e => handleQtyChange(item.key, parseInt(e.target.value) || 1)}
                        />
                      </td>
                      <td className="product-subtotal" data-title="Subtotal">${(item.price * (pendingQty[item.key] ?? item.quantity)).toFixed(2)}</td>
                      <td className="product-remove" data-title="Remove">
                        <button className="remove" onClick={() => handleRemove(item.key)} aria-label={`Remove ${item.name} from cart`}>&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cart-collaterals">
              <div className="cart_totals">
                <h2>Cart Totals</h2>
                <table>
                  <tbody>
                    <tr><th>Subtotal</th><td>${subtotal.toFixed(2)}</td></tr>
                    <tr><th>Shipping</th><td>Calculated at checkout</td></tr>
                    <tr><th>Tax</th><td>Calculated at checkout</td></tr>
                  </tbody>
                </table>
                <div className="wc-proceed-to-checkout" style={{ marginTop: 16 }}>
                  <Link to="/checkout" className="btn btn-accent" style={{ width: '100%', textAlign: 'center' }}>Proceed to Checkout</Link>
                </div>
              </div>
              <div>
                <div className="cart-shipping-note">
                  {subtotal >= 100 ? (
                    <p className="free-shipping-unlocked">Free shipping unlocked!</p>
                  ) : (
                    <>
                      <p>Add ${(100 - subtotal).toFixed(2)} more for free shipping.</p>
                      <div className="shipping-progress-bar">
                        <div className="shipping-progress-fill" style={{ width: `${Math.min(100, (subtotal / 100) * 100)}%` }} />
                      </div>
                    </>
                  )}
                </div>
                <Link to="/shop" className="btn btn-outline" style={{ width: '100%', textAlign: 'center', marginTop: 12 }}>Continue Shopping</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
