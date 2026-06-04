import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOrders } from '../api/data';
import { useToast } from '../components/Toast';

export default function AccountPage() {
  const { user, profile, loading: authLoading, signIn, signUp, signOut, updateProfile, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState('login');
  const [accountTab, setAccountTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

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
      addToast('Welcome back!', 'success');
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
      addToast('Account created! Check your email.', 'success');
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
      addToast('Profile updated', 'success');
    } catch (err) {
      setError(err.message);
    }
  }

  if (authLoading) {
    return <main className="content-area"><div className="container"><p className="loading">Loading...</p></div></main>;
  }

  if (!user) {
    return (
      <main className="content-area">
        <div className="container">
          <div className="my-account-wrapper" style={{ maxWidth: 480, margin: '0 auto', gridTemplateColumns: '1fr' }}>
            <div className="auth-tabs" role="tablist" aria-label="Authentication">
              <button
                role="tab"
                aria-selected={tab === 'login'}
                className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                onClick={() => setTab('login')}
              >
                Sign In
              </button>
              <button
                role="tab"
                aria-selected={tab === 'register'}
                className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
                onClick={() => setTab('register')}
              >
                Register
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <label htmlFor="login-email">Email</label>
                  <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="form-row">
                  <label htmlFor="login-password">Password</label>
                  <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <button type="submit" className="btn btn-accent">Sign In</button>
              </form>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <label htmlFor="register-first-name">First Name</label>
                  <input id="register-first-name" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" />
                </div>
                <div className="form-row">
                  <label htmlFor="register-last-name">Last Name</label>
                  <input id="register-last-name" type="text" value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" />
                </div>
                <div className="form-row">
                  <label htmlFor="register-email">Email *</label>
                  <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="form-row">
                  <label htmlFor="register-password">Password * (min 6 characters)</label>
                  <input id="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                </div>
                <button type="submit" className="btn btn-accent">Create Account</button>
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="content-area">
      <div className="container">
        <nav className="woocommerce-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link> / <span>My Account</span>
        </nav>
        <div className="my-account-wrapper">
          <nav className="woocommerce-MyAccount-navigation" aria-label="Account sections">
            <ul>
              <li className={accountTab === 'dashboard' ? 'is-active' : ''}>
                <button onClick={() => setAccountTab('dashboard')}>Dashboard</button>
              </li>
              <li className={accountTab === 'orders' ? 'is-active' : ''}>
                <button onClick={() => setAccountTab('orders')}>Orders</button>
              </li>
              <li className={accountTab === 'details' ? 'is-active' : ''}>
                <button onClick={() => setAccountTab('details')}>Account Details</button>
              </li>
              {isAdmin && <li><Link to="/admin" style={{ display: 'block', padding: '14px 20px', color: 'var(--color-accent)' }}>Admin</Link></li>}
              <li><button onClick={signOut} style={{ color: 'var(--color-danger)' }}>Log Out</button></li>
            </ul>
          </nav>
          <div className="woocommerce-MyAccount-content">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {accountTab === 'dashboard' && (
              <div>
                <p>Welcome back, <strong>{profile?.first_name || user.email}</strong>!</p>
                <p>From your account dashboard you can view your recent orders and edit your account details.</p>
                {isAdmin && <p><Link to="/admin" className="btn btn-accent">Go to Admin Dashboard</Link></p>}
              </div>
            )}

            {accountTab === 'orders' && (
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
                          <td data-title="Order">{order.order_number}</td>
                          <td data-title="Date">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td data-title="Status"><span style={{ color: order.status === 'delivered' ? 'var(--color-success)' : order.status === 'cancelled' ? 'var(--color-danger)' : 'var(--color-accent)' }}>{order.status}</span></td>
                          <td data-title="Total">${Number(order.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-results">No orders yet. <Link to="/shop">Start shopping!</Link></p>
                )}
              </div>
            )}

            {accountTab === 'details' && (
              <form onSubmit={handleUpdateProfile} style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <label htmlFor="profile-email">Email</label>
                  <input id="profile-email" type="email" value={user.email || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="form-row">
                  <label htmlFor="profile-first-name">First Name</label>
                  <input id="profile-first-name" type="text" value={firstName || profile?.first_name || ''} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="form-row">
                  <label htmlFor="profile-last-name">Last Name</label>
                  <input id="profile-last-name" type="text" value={lastName || profile?.last_name || ''} onChange={e => setLastName(e.target.value)} />
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
