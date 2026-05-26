import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getAdminStats,
  getAdminOrders,
  updateOrderStatus,
  getAdminProducts,
  updateProduct,
  deleteProduct,
  getAdminCustomers,
  getAdminMessages,
  markMessageRead,
  getAdminReviews,
  updateReview,
} from '../api/backend';

export default function AdminPage() {
  const { user, profile, isAdmin } = useAuth();
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

  const navItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'orders', label: 'Orders' },
    { key: 'products', label: 'Products' },
    { key: 'customers', label: 'Customers' },
    { key: 'messages', label: 'Messages' },
    { key: 'reviews', label: 'Reviews' },
  ];

  return (
    <main className="content-area">
      <div className="container">
        <h1 className="page-title">Admin Dashboard</h1>
        {error && <div style={{ background: '#442222', color: '#ff6666', padding: 12, borderRadius: 4, marginBottom: 16 }}>{error}</div>}

        <div className="shop-layout">
          <aside className="shop-sidebar">
            <div className="widget">
              <h3 className="widget-title">Navigation</h3>
              <ul>
                {navItems.map(item => (
                  <li key={item.key}>
                    <a
                      href="#"
                      onClick={e => { e.preventDefault(); setTab(item.key); }}
                      className={tab === item.key ? 'active' : ''}
                      style={{ display: 'block', padding: '8px 0', color: tab === item.key ? '#d4a84b' : '#ccc' }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
                <li><Link to="/account" style={{ display: 'block', padding: '8px 0', color: '#ff6666' }}>← Back to Account</Link></li>
              </ul>
            </div>
          </aside>

          <div className="shop-content">
            {loading && <p>Loading...</p>}

            {tab === 'dashboard' && stats && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    { label: 'Total Products', value: stats.totalProducts },
                    { label: 'Total Orders', value: stats.totalOrders },
                    { label: 'Customers', value: stats.totalCustomers },
                    { label: 'Total Revenue', value: `$${(stats.totalRevenue || 0).toFixed(2)}` },
                    { label: 'Unread Messages', value: stats.unreadMessages },
                    { label: 'Low Stock Items', value: stats.lowStock?.length || 0 },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: '#1e1e32', padding: 20, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 'bold', color: '#d4a84b' }}>{stat.value}</div>
                      <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{stat.label}</div>
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
                            <td>{p.name}</td>
                            <td>{p.sku || '-'}</td>
                            <td style={{ color: p.stock <= 0 ? '#ff6666' : '#d4a84b', fontWeight: 'bold' }}>{p.stock}</td>
                            <td>{p.stock_alert}</td>
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
                            <td>{o.order_number}</td>
                            <td>{o.email}</td>
                            <td>${Number(o.total).toFixed(2)}</td>
                            <td><span style={{ color: o.status === 'delivered' ? '#66ff66' : o.status === 'cancelled' ? '#ff6666' : '#d4a84b' }}>{o.status}</span></td>
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
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
                      <td>{o.order_number}</td>
                      <td>{o.email}</td>
                      <td>${Number(o.total).toFixed(2)}</td>
                      <td>{o.status}</td>
                      <td>{o.payment_status}</td>
                      <td>
                        <select
                          value={o.status}
                          onChange={async e => {
                            await updateOrderStatus(o.id, { status: e.target.value });
                            fetchOrders();
                          }}
                          style={{ padding: 4, background: '#0f0f23', color: '#fff', border: '1px solid #333', borderRadius: 4 }}
                        >
                          {['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'products' && (
              <table className="shop_table" style={{ width: '100%' }}>
                <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.sku || '-'}</td>
                      <td>${Number(p.price).toFixed(2)}</td>
                      <td style={{ color: p.stock <= p.stock_alert ? '#d4a84b' : 'inherit' }}>{p.stock}</td>
                      <td>{p.active ? '✓' : '✗'}</td>
                      <td>
                        <button
                          className="btn"
                          style={{ padding: '4px 12px', fontSize: 12, background: p.active ? '#662222' : '#226622', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          onClick={async () => {
                            await updateProduct(p.id, { active: !p.active });
                            fetchProducts();
                          }}
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'customers' && (
              <table className="shop_table" style={{ width: '100%' }}>
                <thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Total Spent</th><th>Joined</th></tr></thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td>{c.first_name || c.last_name ? `${c.first_name || ''} ${c.last_name || ''}` : '-'}</td>
                      <td>{c.email}</td>
                      <td>{c.order_count || 0}</td>
                      <td>${(c.total_spent || 0).toFixed(2)}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'messages' && (
              <div>
                {messages.map(m => (
                  <div key={m.id} style={{ background: m.read ? '#1a1a2e' : '#1e1e32', padding: 16, borderRadius: 8, marginBottom: 8, border: m.read ? '1px solid #2a2a3e' : '1px solid #d4a84b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <strong>{m.name}</strong> <span style={{ color: '#888' }}>&lt;{m.email}&gt;</span>
                        {m.subject && <span style={{ marginLeft: 12, color: '#d4a84b' }}>{m.subject}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <small style={{ color: '#666' }}>{new Date(m.created_at).toLocaleString()}</small>
                        {!m.read && (
                          <button
                            className="btn" style={{ padding: '4px 12px', fontSize: 12, background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            onClick={async () => { await markMessageRead(m.id); fetchMessages(); }}
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ color: '#ccc', marginTop: 8, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                  </div>
                ))}
                {messages.length === 0 && <p>No messages yet.</p>}
              </div>
            )}

            {tab === 'reviews' && (
              <table className="shop_table" style={{ width: '100%' }}>
                <thead><tr><th>Product</th><th>Author</th><th>Rating</th><th>Content</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {reviews.map(r => (
                    <tr key={r.id}>
                      <td>{r.products?.name || '-'}</td>
                      <td>{r.profiles?.first_name || 'Anonymous'}</td>
                      <td style={{ color: '#d4a84b' }}>{'★'.repeat(r.rating)}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content || r.title || '-'}</td>
                      <td>{r.active ? 'Approved' : 'Pending'}</td>
                      <td>
                        <button
                          className="btn" style={{ padding: '4px 12px', fontSize: 12, background: r.active ? '#662222' : '#226622', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          onClick={async () => { await updateReview(r.id, !r.active); fetchReviews(); }}
                        >
                          {r.active ? 'Reject' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
