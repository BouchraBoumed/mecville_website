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
            <div className="social-links">
              <a href="#" aria-label="Instagram" className="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" aria-label="Facebook" className="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Mecville. All rights reserved.</p>
          <div className="payment-icons">
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="38" height="22" rx="3"/><text x="20" y="16" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Visa</text></svg>
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="38" height="22" rx="3"/><text x="20" y="16" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none">MC</text></svg>
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="38" height="22" rx="3"/><text x="20" y="16" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none">PP</text></svg>
          </div>
        </div>
      </div>
    </footer>
  );
}
