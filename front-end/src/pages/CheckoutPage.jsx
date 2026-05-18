import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCart, submitOrder } from '../api/woocommerce';

export default function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', address: '', city: '', postcode: '',
    province: '', country: 'CA', email: '', phone: '',
  });

  useEffect(() => {
    getCart().then(c => { setCart(c); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitOrder({
        billing_address: {
          first_name: form.first_name,
          last_name: form.last_name,
          address_1: form.address,
          city: form.city,
          postcode: form.postcode,
          state: form.province,
          country: form.country,
          email: form.email,
          phone: form.phone,
        },
        shipping_address: {
          first_name: form.first_name,
          last_name: form.last_name,
          address_1: form.address,
          city: form.city,
          postcode: form.postcode,
          state: form.province,
          country: form.country,
        },
      });
      setDone(true);
    } catch (e) {
      alert('Checkout failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="content-area"><div className="container">
        <div className="cart-empty"><h2>Order Placed! 🎉</h2><p>Thank you for your order. You'll receive a confirmation email shortly.</p><Link to="/shop" className="btn btn-accent">Continue Shopping</Link></div>
      </div></main>
    );
  }

  if (loading) return <main className="content-area"><div className="container"><p className="loading">Loading...</p></div></main>;

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  if (isEmpty) {
    return <main className="content-area"><div className="container"><div className="cart-empty"><h2>Your cart is empty</h2><Link to="/shop" className="btn btn-accent">Shop Now</Link></div></div></main>;
  }

  return (
    <main className="content-area">
      <div className="container checkout-container">
        <h1 className="page-title">Checkout</h1>
        <div className="checkout-layout">
          <div className="checkout-main">
            <form onSubmit={handleSubmit}>
              <h3 style={{ marginBottom: 20 }}>Billing Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-row">
                  <label>First Name *</label>
                  <input name="first_name" value={form.first_name} onChange={handleChange} required />
                </div>
                <div className="form-row">
                  <label>Last Name *</label>
                  <input name="last_name" value={form.last_name} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <label>Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <label>Phone</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label>Address *</label>
                <input name="address" value={form.address} onChange={handleChange} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-row">
                  <label>City *</label>
                  <input name="city" value={form.city} onChange={handleChange} required />
                </div>
                <div className="form-row">
                  <label>Province *</label>
                  <input name="province" value={form.province} onChange={handleChange} required />
                </div>
                <div className="form-row">
                  <label>Postcode *</label>
                  <input name="postcode" value={form.postcode} onChange={handleChange} required />
                </div>
              </div>
              <button type="submit" className="btn btn-accent" disabled={submitting} style={{ width: '100%', marginTop: 20, padding: 16, fontSize: 16 }}>
                {submitting ? 'Processing...' : `Place Order — $${(cart?.totals?.total_price / 100).toFixed(2)}`}
              </button>
            </form>
          </div>
          <div className="checkout-sidebar">
            <div className="checkout-sidebar-inner">
              <h3>Order Summary</h3>
              {cart?.items?.map(item => (
                <div key={item.key} className="checkout-mini-item">
                  <div className="mini-item-thumb"><img src={item.images?.[0]?.src || item.image || ''} alt={item.name} /></div>
                  <div className="mini-item-info">
                    <span className="mini-item-name">{item.name}</span>
                    <span className="mini-item-qty">Qty: {item.quantity}</span>
                  </div>
                  <span className="mini-item-price">${(item.totals?.line_total / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="checkout-mini-totals">
                <div className="mini-total-row"><span>Subtotal</span><span>${(cart?.totals?.total_items / 100).toFixed(2)}</span></div>
                <div className="mini-total-row"><span>Shipping</span><span>Free</span></div>
                <div className="mini-total-row total"><span>Total</span><span>${(cart?.totals?.total_price / 100).toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
