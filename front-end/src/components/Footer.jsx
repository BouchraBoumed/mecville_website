import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Subscription failed');
      setStatus('sent');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <h4 className="footer-site-title">Mecville</h4>
            <p>Premium Pokémon TCG singles, sealed products, and graded cards. Fast shipping across Canada.</p>
            <div className="social-links" style={{ marginTop: 16 }}>
              <a href="https://facebook.com" className="social-link" aria-label="Facebook" target="_blank" rel="noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>
              </a>
              <a href="https://instagram.com" className="social-link" aria-label="Instagram" target="_blank" rel="noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
              </a>
              <a href="https://tiktok.com" className="social-link" aria-label="TikTok" target="_blank" rel="noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 6.3a4.8 4.8 0 0 1-3.5-1.4 4.8 4.8 0 0 1-1.2-2.4h-3v12.1a2.7 2.7 0 1 1-1.9-2.6V9a5.7 5.7 0 1 0 4.9 5.6V9.3a7.8 7.8 0 0 0 4.7 1.6V7.9a4.8 4.8 0 0 1 0-1.6z"/></svg>
              </a>
              <a href="https://wa.me/+14387649101" className="social-link" aria-label="WhatsApp" target="_blank" rel="noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4A11 11 0 0 0 4 20l-1 4 4-1A11 11 0 1 0 20 4zM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-2.4.6.6-2.3-.2-.3A9 9 0 1 1 12 21zm5-7c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.5.1a6 6 0 0 1-1.8-1.1 6.7 6.7 0 0 1-1.2-1.6c-.1-.2 0-.3.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1c0 1.2.9 2.4 1 2.6s1.7 2.6 4.2 3.6c1.6.6 2.2.7 3 .5.5-.1 1.6-.7 1.8-1.3s.3-1.1.2-1.2z"/></svg>
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Menu</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/shop">Shop</Link></li>
              <li><Link to="/new-arrivals">New Arrivals</Link></li>
              <li><Link to="/featured-collections">Featured Collections</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contacts</h4>
            <ul>
              <li><a href="mailto:info@mecville.com">info@mecville.com</a></li>
              <li><a href="tel:+14387649101">(+1) 438-764-9101</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Subscribe to our newsletter</h4>
            {status === 'sent' ? (
              <p style={{ fontSize: 13, color: 'var(--color-success)' }}>Thanks for subscribing!</p>
            ) : (
              <form className="footer-newsletter" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  placeholder="Email *"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  aria-label="Email"
                />
                <button type="submit" className="btn btn-accent btn-sm" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            )}
            {status === 'error' && (
              <p style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: 8 }}>
                Subscription form is not available at the moment
              </p>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Mecville. All rights reserved.</p>
          <div className="payment-icons" aria-label="Accepted payment methods">
            <svg width="36" height="24" viewBox="0 0 36 24" fill="none" role="img" aria-label="Visa">
              <rect x="0.5" y="0.5" width="35" height="23" rx="3" fill="#1a1f71" stroke="#2a3441"/>
              <text x="18" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="sans-serif">VISA</text>
            </svg>
            <svg width="36" height="24" viewBox="0 0 36 24" fill="none" role="img" aria-label="Mastercard">
              <rect x="0.5" y="0.5" width="35" height="23" rx="3" fill="#1a1a1a" stroke="#2a3441"/>
              <circle cx="14" cy="12" r="6" fill="#eb001b" opacity="0.9"/>
              <circle cx="22" cy="12" r="6" fill="#f79e1b" opacity="0.8"/>
              <circle cx="18" cy="12" r="6" fill="#ff5f00" opacity="0.5"/>
            </svg>
            <svg width="36" height="24" viewBox="0 0 36 24" fill="none" role="img" aria-label="PayPal">
              <rect x="0.5" y="0.5" width="35" height="23" rx="3" fill="#003087" stroke="#2a3441"/>
              <text x="18" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill="#009cde" fontFamily="sans-serif">PayPal</text>
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}
