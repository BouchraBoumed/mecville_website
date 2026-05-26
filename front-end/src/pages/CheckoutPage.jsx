import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCart } from '../api/data';
import { createStripePaymentIntent, confirmStripePayment, createPayPalOrder, capturePayPalOrder } from '../api/backend';
import { useAuth } from '../contexts/AuthContext';

export default function CheckoutPage() {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', address: '', city: '', postcode: '',
    province: '', country: 'CA', email: '', phone: '',
  });

  const returningFromPayPal = sessionStorage.getItem('paypal_order_id') && window.location.pathname === '/order/confirm';

  useEffect(() => {
    if (!user || returningFromPayPal) { setLoading(false); return; }
    getCart().then(c => { setCart(c); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleStripeCheckout() {
    setError('');

    // Create payment intent via backend
    const { clientSecret, orderNumber: onum } = await createStripePaymentIntent();
    setOrderNumber(onum);

    // Load Stripe Elements
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      setError('Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in .env');
      return;
    }

    const stripe = window.Stripe(stripeKey);
    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: { token: 'tok_visa' }, // Placeholder — real integration uses Elements
        billing_details: { name: `${form.first_name} ${form.last_name}`, email: form.email },
      },
    });

    if (stripeError) {
      setError(stripeError.message);
      return;
    }

    // Payment succeeded — confirm on backend
    const result = await confirmStripePayment(clientSecret.split('_secret_')[0]);
    if (result.success) {
      setDone(true);
    } else {
      setError('Payment confirmation failed');
    }
  }

  async function handlePayPalCheckout() {
    setError('');

    const { paypalOrderId, approvalUrl } = await createPayPalOrder();

    // Redirect to PayPal for approval
    if (approvalUrl) {
      // Store order info for return
      sessionStorage.setItem('paypal_order_id', paypalOrderId);
      window.location.href = approvalUrl;
    } else {
      setError('PayPal is not available');
    }
  }

  // Handle PayPal return — capture on mount
  useEffect(() => {
    const paypalOrderId = sessionStorage.getItem('paypal_order_id');
    if (paypalOrderId && window.location.pathname === '/order/confirm') {
      capturePayPalOrder(paypalOrderId)
        .then(result => {
          if (result.success) {
            setOrderNumber(result.order?.order_number || '');
            setDone(true);
          }
        })
        .catch(err => setError(err.message))
        .finally(() => sessionStorage.removeItem('paypal_order_id'));
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (paymentMethod === 'stripe') {
        await handleStripeCheckout();
      } else {
        await handlePayPalCheckout();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="content-area"><div className="container">
        <div className="cart-empty"><h2>Order Placed!</h2>
          <p>Thank you for your order{orderNumber ? ` (#${orderNumber})` : ''}. You'll receive a confirmation email shortly.</p>
          <Link to="/shop" className="btn btn-accent">Continue Shopping</Link>
        </div>
      </div></main>
    );
  }

  if (!user) {
    return <main className="content-area"><div className="container"><div className="cart-empty"><h2>Please log in to checkout</h2><Link to="/account" className="btn btn-accent">My Account</Link></div></div></main>;
  }

  if (loading) return <main className="content-area"><div className="container"><p className="loading">Loading...</p></div></main>;

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  if (isEmpty) {
    return <main className="content-area"><div className="container"><div className="cart-empty"><h2>Your cart is empty</h2><Link to="/shop" className="btn btn-accent">Shop Now</Link></div></div></main>;
  }

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 100 ? 0 : 15;
  const total = subtotal + shipping;

  return (
    <main className="content-area">
      <div className="container checkout-container">
        <h1 className="page-title">Checkout</h1>
        {error && <div style={{ background: '#442222', color: '#ff6666', padding: 12, borderRadius: 4, marginBottom: 16 }}>{error}</div>}
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

              <h3 style={{ margin: '24px 0 12px' }}>Payment Method</h3>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <label style={{ flex: 1, padding: 12, border: `2px solid ${paymentMethod === 'stripe' ? '#d4a84b' : '#333'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
                  <input type="radio" name="payment" value="stripe" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} style={{ display: 'none' }} />
                  <div>💳 Credit / Debit</div>
                  <small style={{ color: '#888' }}>Visa, Mastercard, Amex</small>
                </label>
                <label style={{ flex: 1, padding: 12, border: `2px solid ${paymentMethod === 'paypal' ? '#d4a84b' : '#333'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
                  <input type="radio" name="payment" value="paypal" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} style={{ display: 'none' }} />
                  <div>🅿️ PayPal</div>
                  <small style={{ color: '#888' }}>PayPal + Credit Card</small>
                </label>
              </div>

              <button type="submit" className="btn btn-accent" disabled={submitting} style={{ width: '100%', marginTop: 20, padding: 16, fontSize: 16 }}>
                {submitting ? 'Processing...' : `Pay $${total.toFixed(2)} — ${paymentMethod === 'stripe' ? 'Pay with Card' : 'Pay with PayPal'}`}
              </button>
            </form>
          </div>
          <div className="checkout-sidebar">
            <div className="checkout-sidebar-inner">
              <h3>Order Summary</h3>
              {cart?.items?.map(item => (
                <div key={item.key} className="checkout-mini-item">
                  <div className="mini-item-thumb"><img src={item.image || ''} alt={item.name} /></div>
                  <div className="mini-item-info">
                    <span className="mini-item-name">{item.name}</span>
                    <span className="mini-item-qty">Qty: {item.quantity}</span>
                  </div>
                  <span className="mini-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="checkout-mini-totals">
                <div className="mini-total-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="mini-total-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div>
                <div className="mini-total-row total"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
