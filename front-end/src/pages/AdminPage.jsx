import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getAdminStats, getAdminOrders, updateOrderStatus,
  getAdminProducts, updateProduct, deleteProduct,
  getAdminCustomers, getAdminMessages, markMessageRead,
  getAdminReviews, updateReview,
} from '../api/backend';
import { useToast } from '../components/Toast';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'customers', label: 'Customers' },
  { key: 'messages', label: 'Messages' },
  { key: 'reviews', label: 'Reviews' },
];

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'dashboard') fetchStats();
    if (tab === 'orders') fetchOrders();
    if (tab === 'products') fetchProducts();
    if (tab === 'customers') fetchCustomers();
    if (tab === 'messages') fetchMessages();
    if (tab === 'reviews') fetchReviews();
  }, [tab, isAdmin]);

  async function fetchStats() {
    setLoading(true);
    try { setStats(await getAdminStats()); } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function fetchOrders() {
    setLoading(true);
    try { setOrders((await getAdminOrders()).orders); } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function fetchProducts() {
    setLoading(true);
    try { setProducts((await getAdminProducts()).products); } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function fetchCustomers() {
    setLoading(true);
    try { setCustomers((await getAdminCustomers()).customers); } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function fetchMessages() {
    setLoading(true);
    try { setMessages((await getAdminMessages()).messages); } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function fetchReviews() {
    setLoading(true);
    try { setReviews((await getAdminReviews()).reviews); } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function handleUpdateOrderStatus(id, status) {
    try {
      await updateOrderStatus(id, { status });
      addToast(`Order updated to ${status}`, 'success');
      fetchOrders();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleToggleProductActive(p, active) {
    try {
      await updateProduct(p.id, { active });
      addToast(`Product ${active ? 'activated' : 'deactivated'}`, 'success');
      fetchProducts();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleToggleReview(r, active) {
    try {
      await updateReview(r.id, active);
      addToast(`Review ${active ? 'approved' : 'rejected'}`, 'success');
      fetchReviews();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleMarkRead(id) {
    try {
      await markMessageRead(id);
      addToast('Message marked as read', 'success');
      fetchMessages();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  if (!user || !isAdmin) {
    return (
      <main className="content-area"><div className="container">
        <div className="cart-empty">
          <h2>Admin Access Required</h2>
          <p>You need admin privileges to access this page.</p>
          <Link to="/account" className="btn btn-accent">My Account</Link>
        </div>
      </div></main>
    );
  }

  return (
    <main className="content-area">
      <div className="container">
        <h1 className="page-title">Admin Dashboard</h1>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="shop-layout">
          <aside className="shop-sidebar">
            <div className="widget">
              <h3 className="widget-title">Navigation</h3>
              <nav className="admin-nav" aria-label="Admin sections">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.key}
                    className={tab === item.key ? 'active' : ''}
                    onClick={() => setTab(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <Link to="/account" style={{ display: 'block', padding: '8px 0', color: 'var(--color-danger)', marginTop: 12, fontSize: 14 }}>Back to Account</Link>
            </div>
          </aside>

          <div className="shop-content">
            {loading && <p>Loading...</p>}

            {tab === 'dashboard' && stats && (
              <div>
                <div className="admin-stats-grid">
                  {[
                    { label: 'Total Products', value: stats.totalProducts },
                    { label: 'Total Orders', value: stats.totalOrders },
                    { label: 'Customers', value: stats.totalCustomers },
                    { label: 'Total Revenue', value: `$${(stats.totalRevenue || 0).toFixed(2)}` },
                    { label: 'Unread Messages', value: stats.unreadMessages },
                    { label: 'Low Stock Items', value: stats.lowStock?.length || 0 },
                  ].map(stat => (
                    <div key={stat.label} className="stat-card">
                      <div className="stat-value">{stat.value}</div>
                      <div className="stat-label">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {stats.lowStock?.length > 0 && (
                  <div>
                    <h3>Low Stock Alerts</h3>
                    <table className="shop_table" style={{ width: '100%' }}>
                      <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Alert At</th></tr></thead>
                      <tbody>
                        {stats.lowStock.map(p => (
                          <tr key={p.id}>
                            <td data-title="Product">{p.name}</td>
                            <td data-title="SKU">{p.sku || '-'}</td>
                            <td data-title="Stock" style={{ color: p.stock <= 0 ? 'var(--color-danger)' : 'var(--color-accent)', fontWeight: 'bold' }}>{p.stock}</td>
                            <td data-title="Alert At">{p.stock_alert}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {stats.recentOrders?.length > 0 && (
                  <div style={{ marginTop: 32 }}>
                    <h3>Recent Orders</h3>
                    <table className="shop_table" style={{ width: '100%' }}>
                      <thead><tr><th>Order #</th><th>Email</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                      <tbody>
                        {stats.recentOrders.map(o => (
                          <tr key={o.id}>
                            <td data-title="Order #">{o.order_number}</td>
                            <td data-title="Email">{o.email}</td>
                            <td data-title="Total">${Number(o.total).toFixed(2)}</td>
                            <td data-title="Status"><span style={{ color: o.status === 'delivered' ? 'var(--color-success)' : o.status === 'cancelled' ? 'var(--color-danger)' : 'var(--color-accent)' }}>{o.status}</span></td>
                            <td data-title="Date">{new Date(o.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'orders' && (
              <table className="shop_table" style={{ width: '100%' }}>
                <thead><tr><th>Order #</th><th>Email</th><th>Total</th><th>Status</th><th>Payment</th><th>Action</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td data-title="Order #">{o.order_number}</td>
                      <td data-title="Email">{o.email}</td>
                      <td data-title="Total">${Number(o.total).toFixed(2)}</td>
                      <td data-title="Status">{o.status}</td>
                      <td data-title="Payment">{o.payment_status}</td>
                      <td data-title="Action">
                        <select
                          value={o.status}
                          onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                          className="admin-status-select"
                        >
                          {['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>No orders found.</td></tr>}
                </tbody>
              </table>
            )}

            {tab === 'products' && (
              <table className="shop_table" style={{ width: '100%' }}>
                <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td data-title="Name">{p.name}</td>
                      <td data-title="SKU">{p.sku || '-'}</td>
                      <td data-title="Price">${Number(p.price).toFixed(2)}</td>
                      <td data-title="Stock" style={{ color: p.stock <= p.stock_alert ? 'var(--color-accent)' : 'inherit' }}>{p.stock}</td>
                      <td data-title="Active">{p.active ? 'Yes' : 'No'}</td>
                      <td data-title="Actions">
                        <button
                          className={`btn btn-xs ${p.active ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleToggleProductActive(p, !p.active)}
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>No products found.</td></tr>}
                </tbody>
              </table>
            )}

            {tab === 'customers' && (
              <table className="shop_table" style={{ width: '100%' }}>
                <thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Total Spent</th><th>Joined</th></tr></thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td data-title="Name">{c.first_name || c.last_name ? `${c.first_name || ''} ${c.last_name || ''}`.trim() || '-' : '-'}</td>
                      <td data-title="Email">{c.email}</td>
                      <td data-title="Orders">{c.order_count || 0}</td>
                      <td data-title="Total Spent">${(c.total_spent || 0).toFixed(2)}</td>
                      <td data-title="Joined">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {customers.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>No customers found.</td></tr>}
                </tbody>
              </table>
            )}

            {tab === 'messages' && (
              <div>
                {messages.map(m => (
                  <div key={m.id} className={`admin-message-card ${!m.read ? 'unread' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <strong>{m.name}</strong> <span style={{ color: 'var(--color-text-muted)' }}>&lt;{m.email}&gt;</span>
                        {m.subject && <span style={{ marginLeft: 12, color: 'var(--color-accent)' }}>{m.subject}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <small style={{ color: 'var(--color-text-muted)' }}>{new Date(m.created_at).toLocaleString()}</small>
                        {!m.read && (
                          <button className="btn btn-xs btn-outline" onClick={() => handleMarkRead(m.id)}>
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: 8, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                  </div>
                ))}
                {messages.length === 0 && <p className="no-results">No messages yet.</p>}
              </div>
            )}

            {tab === 'reviews' && (
              <table className="shop_table" style={{ width: '100%' }}>
                <thead><tr><th>Product</th><th>Author</th><th>Rating</th><th>Content</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {reviews.map(r => (
                    <tr key={r.id}>
                      <td data-title="Product">{r.products?.name || '-'}</td>
                      <td data-title="Author">{r.profiles?.first_name || 'Anonymous'}</td>
                      <td data-title="Rating" style={{ color: 'var(--color-accent)' }}>{'★'.repeat(r.rating)}</td>
                      <td data-title="Content" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content || r.title || '-'}</td>
                      <td data-title="Status">{r.active ? 'Approved' : 'Pending'}</td>
                      <td data-title="Action">
                        <button
                          className={`btn btn-xs ${r.active ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleToggleReview(r, !r.active)}
                        >
                          {r.active ? 'Reject' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reviews.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>No reviews found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
