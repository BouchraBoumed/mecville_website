import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOrders, getOrder } from '../api/data';
import { useToast } from '../components/Toast';

export default function AccountPage() {
  const { user, profile, loading: authLoading, signIn, signUp, signOut, updateProfile, isAdmin, resetPassword, updatePassword } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState('login');
  const [accountTab, setAccountTab] = useState('dashboard');
  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get('reset') === 'true';
  const [newPassword, setNewPassword] = useState('');
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
            {tab === 'forgot' && <h3 style={{ marginTop: 16, marginBottom: 0 }}>Reset Password</h3>}

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
                <button
                  type="button"
                  onClick={() => setTab('forgot')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'var(--font-primary)', textAlign: 'left' }}
                >
                  Forgot your password?
                </button>
              </form>
            ) : tab === 'forgot' ? (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <label htmlFor="reset-email">Email</label>
                  <input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <button type="submit" className="btn btn-accent">Send Reset Link</button>
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'var(--font-primary)', textAlign: 'left' }}
                >
                  &larr; Back to Sign In
                </button>
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

            {isResetMode && (
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                Please set a new password to complete the reset process.
              </div>
            )}

            {accountTab === 'dashboard' && (
              <div>
                <p>Welcome back, <strong>{profile?.first_name || user.email}</strong>!</p>
                <p>From your account dashboard you can view your recent orders and edit your account details.</p>
                {isAdmin && <p><Link to="/admin" className="btn btn-accent">Go to Admin Dashboard</Link></p>}
              </div>
            )}

            {accountTab === 'orders' && (
              <div>
                {selectedOrder ? (
                  <div>
                    <button
                      onClick={() => { setSelectedOrder(null); setOrderDetail(null); }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0, fontFamily: 'var(--font-primary)' }}
                    >
                      &larr; Back to Orders
                    </button>
                    {orderDetailLoading ? (
                      <p>Loading order details...</p>
                    ) : orderDetail ? (
                      <div>
                        <h3>Order {orderDetail.order_number}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                          <div>
                            <strong>Order Date:</strong>
                            <p>{new Date(orderDetail.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <strong>Status:</strong>
                            <p style={{ color: orderDetail.status === 'delivered' ? 'var(--color-success)' : orderDetail.status === 'cancelled' ? 'var(--color-danger)' : 'var(--color-accent)' }}>
                              {orderDetail.status} / {orderDetail.payment_status}
                            </p>
                          </div>
                          <div>
                            <strong>Shipping Address:</strong>
                            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                              {orderDetail.shipping_address?.first_name} {orderDetail.shipping_address?.last_name}<br />
                              {orderDetail.shipping_address?.address}<br />
                              {orderDetail.shipping_address?.city}, {orderDetail.shipping_address?.province} {orderDetail.shipping_address?.postcode}<br />
                              {orderDetail.shipping_address?.country}
                            </p>
                          </div>
                          <div>
                            <strong>Tracking:</strong>
                            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                              {orderDetail.tracking_number || 'Not yet shipped'}
                            </p>
                          </div>
                        </div>

                        <table className="shop_table" style={{ width: '100%' }}>
                          <thead>
                            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                          </thead>
                          <tbody>
                            {(orderDetail.order_items || []).map(item => (
                              <tr key={item.id}>
                                <td data-title="Item">{item.name}</td>
                                <td data-title="Qty">{item.quantity}</td>
                                <td data-title="Price">${Number(item.price).toFixed(2)}</td>
                                <td data-title="Total">${Number(item.total).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ marginTop: 16, textAlign: 'right' }}>
                          <p><strong>Subtotal:</strong> ${Number(orderDetail.subtotal).toFixed(2)}</p>
                          <p><strong>Shipping:</strong> {Number(orderDetail.shipping_cost) > 0 ? '$' + Number(orderDetail.shipping_cost).toFixed(2) : 'Free'}</p>
                          <p><strong>Tax:</strong> ${Number(orderDetail.tax || 0).toFixed(2)}</p>
                          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent)' }}><strong>Total:</strong> ${Number(orderDetail.total).toFixed(2)}</p>
                        </div>
                      </div>
                    ) : (
                      <p>Could not load order details.</p>
                    )}
                  </div>
                ) : (
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
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(order => (
                            <tr key={order.id}>
                              <td data-title="Order">{order.order_number}</td>
                              <td data-title="Date">{new Date(order.created_at).toLocaleDateString()}</td>
                              <td data-title="Status"><span style={{ color: order.status === 'delivered' ? 'var(--color-success)' : order.status === 'cancelled' ? 'var(--color-danger)' : 'var(--color-accent)' }}>{order.status}</span></td>
                              <td data-title="Total">${Number(order.total).toFixed(2)}</td>
                              <td data-title=""><button className="btn btn-xs btn-outline" onClick={() => handleViewOrder(order.id)}>View</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="no-results">No orders yet. <Link to="/shop">Start shopping!</Link></p>
                    )}
                  </div>
                )}
              </div>
            )}

            {accountTab === 'details' && (
              <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 32 }}>
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3>Profile Details</h3>
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
                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3>Change Password</h3>
                  <div className="form-row">
                    <label htmlFor="new-password">New Password (min 8 characters)</label>
                    <input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" />
                  </div>
                  <button type="submit" className="btn btn-outline">Update Password</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
