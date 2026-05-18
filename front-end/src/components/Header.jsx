import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCart } from '../api/woocommerce';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location]);

  useEffect(() => {
    getCart().then(cart => setCartCount(cart?.items?.length || 0)).catch(() => {});
  }, []);

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="header-left">
          <button className="menu-toggle" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </button>
          <nav className={`main-navigation ${menuOpen ? 'toggled' : ''}`}>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/shop">Shop</Link></li>
              <li className="menu-item-has-children">
                <Link to="/shop">Categories</Link>
                <ul className="sub-menu">
                  <li><Link to="/shop">All Products</Link></li>
                  <li><Link to="/shop?category=sealed">Sealed</Link></li>
                  <li><Link to="/shop?category=singles">Singles</Link></li>
                  <li><Link to="/shop?category=graded">Graded</Link></li>
                  <li><Link to="/shop?category=bundles">Bundles</Link></li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
        <div className="site-branding">
          <Link to="/"><span className="site-title">Mecville</span></Link>
        </div>
        <div className="header-right">
          <Link to="/account" className="header-icon" aria-label="My account">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </Link>
          <Link to="/cart" className="header-icon header-cart" aria-label="Cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
