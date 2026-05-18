import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCart, updateCartItem, removeCartItem } from '../api/woocommerce';

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCart().then(c => { setCart(c); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleQtyChange(key, qty) {
    try {
      const updated = await updateCartItem(key, qty);
      setCart(updated);
    } catch (e) { alert('Failed to update: ' + e.message); }
  }

  async function handleRemove(key) {
    try {
      const updated = await removeCartItem(key);
      setCart(updated);
    } catch (e) { alert('Failed to remove: ' + e.message); }
  }

  if (loading) return <main className="content-area"><div className="container"><p className="loading">Loading cart...</p></div></main>;

  const isEmpty = !cart || !cart.items || cart.items.length === 0;

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
              <table className="shop_table cart">
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
                      <td className="product-thumbnail">
                        <img src={item.images?.[0]?.src || item.image || ''} alt={item.name} width="64" />
                      </td>
                      <td className="product-name" data-title="Product">
                        <Link to={`/product/${item.slug}`}>{item.name}</Link>
                      </td>
                      <td className="product-price" data-title="Price">${(item.prices?.price / 100).toFixed(2)}</td>
                      <td className="product-quantity" data-title="Quantity">
                        <input type="number" className="qty" value={item.quantity} min="1" max="99" onChange={e => handleQtyChange(item.key, parseInt(e.target.value) || 1)} style={{ width: 60 }} />
                      </td>
                      <td className="product-subtotal" data-title="Subtotal">${(item.totals?.line_total / 100).toFixed(2)}</td>
                      <td className="product-remove">
                        <button className="remove" onClick={() => handleRemove(item.key)}>&times;</button>
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
                    <tr><th>Subtotal</th><td>${(cart.totals?.total_items / 100).toFixed(2)}</td></tr>
                    <tr><th>Shipping</th><td>Calculated at checkout</td></tr>
                    <tr className="order-total"><th>Total</th><td>${(cart.totals?.total_price / 100).toFixed(2)}</td></tr>
                  </tbody>
                </table>
                <div className="wc-proceed-to-checkout">
                  <Link to="/checkout" className="btn btn-accent" style={{ width: '100%', textAlign: 'center', marginTop: 16 }}>Proceed to Checkout</Link>
                </div>
              </div>
              <div className="cart-shipping-note">
                <p>🇨🇦 Free shipping on orders over $100 CAD within Canada.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
