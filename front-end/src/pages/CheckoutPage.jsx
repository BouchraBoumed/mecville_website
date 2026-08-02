import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getCart } from '../api/data';
import { createStripePaymentIntent, confirmStripePayment, createPayPalOrder, capturePayPalOrder } from '../api/backend';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

const cardStyle = {
  style: {
    base: {
      color: '#e8e6e3',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '15px',
      '::placeholder': { color: '#6b7280' },
      iconColor: '#FFCB05',
    },
    invalid: { color: '#ef4444', iconColor: '#ef4444' },
  },
};

export default function CheckoutPage() {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { addToast } = useToast();
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

  // Build structured address object from form state for the backend
  function buildAddress() {
    return {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || null,
      address: form.address,
      city: form.city,
      province: form.province,
      postcode: form.postcode,
      country: form.country,
    };
  }

  // Canadian tax rates by province (must match backend utils/tax.js)
  const TAX_RATES = {
    AB: 0.05, BC: 0.12, MB: 0.12, NB: 0.15, NL: 0.15, NS: 0.15, NT: 0.05,
    NU: 0.05, 'ON': 0.13, PE: 0.15, QC: 0.14975, SK: 0.11, YT: 0.05,
  };
  const taxRate = TAX_RATES[form.province?.toUpperCase()] || 0;

  useEffect(() => {
    if (returningFromPayPal) { setLoading(false); return; }
    getCart().then(c => { setCart(c); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleStripeCheckout() {
    setError('');
    if (!stripe || !elements) {
      setError('Payment system is still loading. Please try again.');
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card details not available.');
      return;
    }

    const address = buildAddress();
    // Guests must send their cart items (no server cart to read from).
    const guestItems = !user ? cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })) : null;
    const { clientSecret, orderNumber: onum } = await createStripePaymentIntent(address, address, guestItems);
    setOrderNumber(onum);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: `${form.first_name} ${form.last_name}`,
          email: form.email,
          address: {
            line1: form.address,
            city: form.city,
            state: form.province,
            postal_code: form.postcode,
            country: form.country,
          },
        },
      },
    });

    if (stripeError) {
      setError(stripeError.message);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      const result = await confirmStripePayment(paymentIntent.id);
      if (result.success) {
        // Clear the guest cart on success.
        if (!user) localStorage.removeItem('mecville_cart');
        setDone(true);
      } else {
        setError('Payment confirmation failed. Please contact support.');
      }
    }
  }

  async function handlePayPalCheckout() {
    setError('');
    const address = buildAddress();
    const guestItems = !user ? cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })) : null;
    const { paypalOrderId, approvalUrl, orderId } = await createPayPalOrder(address, address, guestItems);
    if (approvalUrl) {
      sessionStorage.setItem('paypal_order_id', paypalOrderId);
      sessionStorage.setItem('paypal_db_order_id', orderId ?? '');
      sessionStorage.setItem('paypal_shipping_address', JSON.stringify(address));
      if (!user) sessionStorage.setItem('paypal_guest_items', JSON.stringify(guestItems));
      window.location.href = approvalUrl;
    } else {
      setError('PayPal is not available');
    }
  }

  useEffect(() => {
    const paypalOrderId = sessionStorage.getItem('paypal_order_id');
    const orderId = sessionStorage.getItem('paypal_db_order_id');
    if (paypalOrderId && window.location.pathname === '/order/confirm') {
      capturePayPalOrder(paypalOrderId, orderId || null)
        .then(result => {
          if (result.success) {
            localStorage.removeItem('mecville_cart');
            sessionStorage.removeItem('paypal_guest_items');
            setOrderNumber(result.order?.order_number || '');
            setDone(true);
          }
        })
        .catch(err => setError(err.message))
        .finally(() => {
          sessionStorage.removeItem('paypal_order_id');
          sessionStorage.removeItem('paypal_db_order_id');
        });
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
          {!user && form.email && (
            <div className="guest-account-offer">
              <p>Want to track this order and save your details for next time?</p>
              <Link to="/account" className="btn btn-outline" style={{ marginTop: 8 }}>Create an account</Link>
            </div>
          )}
          <Link to="/shop" className="btn btn-accent" style={{ marginTop: 16 }}>Continue Shopping</Link>
        </div>
      </div></main>
    );
  }

  if (loading) return (
    <main className="content-area">
      <div className="container">
        <div className="skeleton-page" aria-hidden="true">
          <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    </main>
  );

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  if (isEmpty) {
    return <main className="content-area"><div className="container"><div className="cart-empty"><h2>Your cart is empty</h2><Link to="/shop" className="btn btn-accent">Shop Now</Link></div></div></main>;
  }

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 100 ? 0 : 15;
  const taxAmountCalc = subtotal * taxRate;
  const total = subtotal + shipping + taxAmountCalc;

  return (
    <main className="content-area">
      <div className="container checkout-container">
        <h1 className="page-title">Checkout</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="checkout-layout">
          <div className="checkout-main">
            <form onSubmit={handleSubmit} noValidate>
              <h3 style={{ marginBottom: 20 }}>Billing Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-row">
                  <label htmlFor="billing-first-name">First Name *</label>
                  <input id="billing-first-name" name="first_name" value={form.first_name} onChange={handleChange} required />
                </div>
                <div className="form-row">
                  <label htmlFor="billing-last-name">Last Name *</label>
                  <input id="billing-last-name" name="last_name" value={form.last_name} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="billing-email">Email *</label>
                <input id="billing-email" type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <label htmlFor="billing-phone">Phone</label>
                <input id="billing-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="billing-address">Address *</label>
                <input id="billing-address" name="address" value={form.address} onChange={handleChange} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-row">
                  <label htmlFor="billing-city">City *</label>
                  <input id="billing-city" name="city" value={form.city} onChange={handleChange} required />
                </div>
                <div className="form-row">
                  <label htmlFor="billing-province">Province *</label>
                  <select id="billing-province" name="province" value={form.province} onChange={handleChange} required>
                    <option value="">Select...</option>
                    <option value="AB">Alberta</option>
                    <option value="BC">British Columbia</option>
                    <option value="MB">Manitoba</option>
                    <option value="NB">New Brunswick</option>
                    <option value="NL">Newfoundland and Labrador</option>
                    <option value="NS">Nova Scotia</option>
                    <option value="NT">Northwest Territories</option>
                    <option value="NU">Nunavut</option>
                    <option value="ON">Ontario</option>
                    <option value="PE">Prince Edward Island</option>
                    <option value="QC">Quebec</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="YT">Yukon</option>
                  </select>
                </div>
                <div className="form-row">
                  <label htmlFor="billing-postcode">Postcode *</label>
                  <input id="billing-postcode" name="postcode" value={form.postcode} onChange={handleChange} required />
                </div>
              </div>

              <h3 style={{ margin: '24px 0 12px' }}>Payment Method</h3>
              <fieldset style={{ border: 'none', padding: 0, margin: 0, marginBottom: 20 }}>
                <legend className="sr-only">Select payment method</legend>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div
                    className={`payment-method-card ${paymentMethod === 'stripe' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('stripe')}
                    role="radio"
                    aria-checked={paymentMethod === 'stripe'}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setPaymentMethod('stripe'); } }}
                  >
                    <input type="radio" name="payment" value="stripe" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} tabIndex={-1} />
                    <div className="pm-label">Credit / Debit</div>
                    <div className="pm-desc">Visa, Mastercard, Amex</div>
                  </div>
                  <div
                    className={`payment-method-card ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('paypal')}
                    role="radio"
                    aria-checked={paymentMethod === 'paypal'}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setPaymentMethod('paypal'); } }}
                  >
                    <input type="radio" name="payment" value="paypal" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} tabIndex={-1} />
                    <div className="pm-label">PayPal</div>
                    <div className="pm-desc">PayPal + Credit Card</div>
                  </div>
                </div>
              </fieldset>

              {paymentMethod === 'stripe' && (
                <div className="stripe-card-container">
                  <CardElement options={cardStyle} />
                </div>
              )}

              <div className="checkout-trust">
                <span className="trust-badge">Secure checkout &middot; Stripe encrypted</span>
                <span className="trust-note">All cards are authentic. 30-day returns on sealed products.</span>
              </div>

              <button type="submit" className="btn btn-accent btn-lg" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'Processing...' : `Pay $${total.toFixed(2)}`}
              </button>
            </form>
          </div>
          <div className="checkout-sidebar">
            <div className="checkout-sidebar-inner">
              <h3>Order Summary</h3>
              {cart?.items?.map(item => (
                <div key={item.key} className="checkout-mini-item">
                  <div className="mini-item-thumb"><img src={item.image || ''} alt={item.name} loading="lazy" /></div>
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
                {taxRate > 0 && (
                  <div className="mini-total-row"><span>Tax ({(taxRate * 100).toFixed(2)}%)</span><span>${taxAmountCalc.toFixed(2)}</span></div>
                )}
                <div className="mini-total-row total"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
