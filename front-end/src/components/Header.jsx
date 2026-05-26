import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import logo from "../assets/logo.webp";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => { setMenuOpen(false); }, [location]);

  useEffect(() => {
    if (!user) { setCartCount(0); return; }

    const fetchCart = async () => {
      const { data } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id);
      const count = data?.reduce((sum, i) => sum + i.quantity, 0) || 0;
      setCartCount(count);
    };

    fetchCart();

    // Subscribe to cart changes
    const channel = supabase
      .channel('cart-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` },
        fetchCart
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="site-branding">
          <Link to="/" className="brand-logo">
            <img src={logo} alt="Mecville Logo" width="65" height="auto"/>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l2 2 4-4" />
            <span className="site-title">Mecville</span>
          </Link>
        </div>

        <div className="header-actions">
          <button className="menu-toggle" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </button>
          <nav className={`main-navigation ${menuOpen ? 'toggled' : ''}`}>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/shop">Shop</Link></li>
              <li><Link to="/gallery">Gallery</Link></li>
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
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </nav>
          <div className="header-icons">
            <Link to="/account" className="header-icon" aria-label="My account">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Link>
            <Link to="/cart" className="header-icon header-cart" aria-label="Cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
