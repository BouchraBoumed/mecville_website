import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOrders } from '../api/data';
import { supabase } from '../lib/supabase';

export default function AccountPage() {
  const { user, profile, loading: authLoading, signIn, signUp, signOut, updateProfile, isAdmin } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Fetch orders when authenticated
  useEffect(() => {
    if (user) {
      setOrdersLoading(true);
      getOrders().then(setOrders).catch(() => {}).finally(() => setOrdersLoading(false));
    }
  }, [user]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await signUp(email, password, { first_name: firstName, last_name: lastName });
      setSuccess('Account created! Check your email for confirmation.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setError('');
    try {
      await updateProfile({ first_name: firstName || undefined, last_name: lastName || undefined });
      setSuccess('Profile updated!');
    } catch (err) {
      setError(err.message);
    }
  }

  // Loading state
  if (authLoading) {
    return <main className="content-area"><div className="container"><p className="loading">Loading...</p></div></main>;
  }

  // Not logged in — show login/register
  if (!user) {
    return (
      <main className="content-area">
        <div className="container">
          <div className="my-account-wrapper" style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
              <button onClick={() => setTab('login')} className="btn" style={{ flex: 1, borderRadius: '8px 0 0 8px', background: tab === 'login' ? '#d4a84b' : '#1e1e32', color: tab === 'login' ? '#0f0f23' : '#fff' }}>Sign In</button>
              <button onClick={() => setTab('register')} className="btn" style={{ flex: 1, borderRadius: '0 8px 8px 0', background: tab === 'register' ? '#d4a84b' : '#1e1e32', color: tab === 'register' ? '#0f0f23' : '#fff' }}>Register</button>
            </div>

            {error && <div style={{ background: '#442222', color: '#ff6666', padding: 12, borderRadius: 4, marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ background: '#224422', color: '#66ff66', padding: 12, borderRadius: 4, marginBottom: 16 }}>{success}</div>}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-accent">Sign In</button>
              </form>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <label>First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="form-row">
                  <label>Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div className="form-row">
                  <label>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label>Password * (min 6 characters)</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <button type="submit" className="btn btn-accent">Create Account</button>
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Logged in — show dashboard
  return (
    <main className="content-area">
      <div className="container">
        <nav className="woocommerce-breadcrumb">
          <Link to="/">Home</Link> / <span>My Account</span>
        </nav>
        <div className="my-account-wrapper">
          <nav className="woocommerce-MyAccount-navigation">
            <ul>
              <li className={tab === 'dashboard' ? 'is-active' : ''}><a onClick={() => setTab('dashboard')}>Dashboard</a></li>
              <li className={tab === 'orders' ? 'is-active' : ''}><a onClick={() => setTab('orders')}>Orders</a></li>
              <li className={tab === 'details' ? 'is-active' : ''}><a onClick={() => setTab('details')}>Account Details</a></li>
              {isAdmin && <li><Link to="/admin">Admin</Link></li>}
              <li><a onClick={signOut} style={{ color: '#ff6666' }}>Log Out</a></li>
            </ul>
          </nav>
          <div className="woocommerce-MyAccount-content">
            {error && <div style={{ background: '#442222', color: '#ff6666', padding: 12, borderRadius: 4, marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ background: '#224422', color: '#66ff66', padding: 12, borderRadius: 4, marginBottom: 16 }}>{success}</div>}

            {tab === 'dashboard' && (
              <div>
                <p>Welcome back, <strong>{profile?.first_name || user.email}</strong>!</p>
                <p>From your account dashboard you can view your recent orders and edit your account details.</p>
                {profile?.role === 'admin' && <p><Link to="/admin" className="btn btn-accent">Go to Admin Dashboard</Link></p>}
              </div>
            )}

            {tab === 'orders' && (
              <div>
                <h3>Order History</h3>
                {ordersLoading ? (
                  <p>Loading orders...</p>
                ) : orders.length > 0 ? (
                  <table className="shop_table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id}>
                          <td>{order.order_number}</td>
                          <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td><span style={{ color: order.status === 'delivered' ? '#66ff66' : order.status === 'cancelled' ? '#ff6666' : '#d4a84b' }}>{order.status}</span></td>
                          <td>${Number(order.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No orders yet. <Link to="/shop">Start shopping!</Link></p>
                )}
              </div>
            )}

            {tab === 'details' && (
              <form onSubmit={handleUpdateProfile} style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <label>Email</label>
                  <input type="email" value={user.email} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="form-row">
                  <label>First Name</label>
                  <input type="text" value={firstName || profile?.first_name || ''} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="form-row">
                  <label>Last Name</label>
                  <input type="text" value={lastName || profile?.last_name || ''} onChange={e => setLastName(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-accent">Save Changes</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
