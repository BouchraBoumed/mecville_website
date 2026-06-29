import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <h4 className="footer-site-title">Mecville</h4>
            <p>Premium Pokémon TCG singles, sealed products, and graded cards. Fast shipping across Canada.</p>
          </div>
          <div className="footer-col">
            <h4>Shop</h4>
            <ul>
              <li><Link to="/shop">All Products</Link></li>
              <li><Link to="/shop?category=sealed">Sealed</Link></li>
              <li><Link to="/shop?category=singles">Singles</Link></li>
              <li><Link to="/shop?category=graded">Graded</Link></li>
              <li><Link to="/shop?category=bundles">Bundles</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Help</h4>
            <ul>
              <li><Link to="/shipping">Shipping</Link></li>
              <li><Link to="/refund">Returns</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <ul>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
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
