import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getGuestCartCount } from '../api/data';
import logo from "../assets/logo.webp";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => { setMenuOpen(false); }, [location]);

  useEffect(() => {
    if (!user) {
      // Guest cart — read from localStorage and keep in sync across tabs/components.
      const updateGuest = () => setCartCount(getGuestCartCount());
      updateGuest();
      window.addEventListener('storage', updateGuest);
      window.addEventListener('mecville-cart-change', updateGuest);
      return () => {
        window.removeEventListener('storage', updateGuest);
        window.removeEventListener('mecville-cart-change', updateGuest);
      };
    }

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

  function handleSearchSubmit(e) {
    e.preventDefault();
    const q = searchValue.trim();
    if (q) {
      navigate(`/shop?search=${encodeURIComponent(q)}`);
      setMenuOpen(false);
    }
  }

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="site-branding">
          <Link to="/" className="brand-logo">
            <img src={logo} alt="Mecville Logo" width="65" height="auto"/>
            <span className="site-title">Mecville</span>
          </Link>
        </div>

        <div className="header-actions">
          <button className="menu-toggle" aria-label="Toggle menu" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </button>
          <nav className={`main-navigation ${menuOpen ? 'toggled' : ''}`} id="primary-navigation" aria-label="Main navigation">
            <ul>
              <li><Link to="/">Home</Link></li>
              <li className="menu-item-has-children">
                <Link to="/shop">Shop</Link>
                <ul className="sub-menu">
                  <li><Link to="/shop">All Products</Link></li>
                  <li><Link to="/new-arrivals">New Arrivals</Link></li>
                  <li><Link to="/featured-collections">Featured Collections</Link></li>
                  <li><Link to="/shop?category=japanese-pokemon">Japanese Pokémon</Link></li>
                  <li><Link to="/shop?category=english-pokemon">English Pokémon</Link></li>
                  <li><Link to="/shop?category=graded-cards">Graded Cards</Link></li>
                  <li><Link to="/shop?category=accessories">Accessories</Link></li>
                </ul>
              </li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/terms">Terms</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </nav>
          <div className="header-icons">
            <form className="header-search" onSubmit={handleSearchSubmit} role="search">
              <input
                type="text"
                className="header-search-input"
                placeholder="Search products..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                aria-label="Search products"
              />
              <button type="submit" className="header-search-btn" aria-label="Search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </form>
            {user ? (
              <Link to="/account" className="header-icon header-account" aria-label={`My account: ${profile?.first_name || user.email}`} title={profile?.first_name || user.email}>
                <span className="account-avatar">{(profile?.first_name || user.email || '?').charAt(0).toUpperCase()}</span>
              </Link>
            ) : (
              <Link to="/account" className="header-icon" aria-label="Sign in">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </Link>
            )}
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
