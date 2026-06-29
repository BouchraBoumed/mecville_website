import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getAdminStats, getAdminOrders, updateOrderStatus,
  getAdminProducts, createProduct, updateProduct, deleteProduct,
  getAdminCustomers, getAdminMessages, markMessageRead,
  getAdminReviews, updateReview,
  getAdminCategories, createCategory, updateCategory, deleteCategory,
  uploadProductImage, importCsv,
} from '../api/backend';
import { useToast } from '../components/Toast';
import { uploadProductImage } from '../api/storage';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'customers', label: 'Customers' },
  { key: 'messages', label: 'Messages' },
  { key: 'reviews', label: 'Reviews' },
];

const EMPTY_PRODUCT = {
  name: '', slug: '', description: '', short_description: '',
  price: '', compare_price: '', sku: '', stock: '0', stock_alert: '5',
  category_id: '', images: [], attributes: {}, featured: false, active: true,
};

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

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'dashboard') fetchStats();
    if (tab === 'orders') fetchOrders();
    if (tab === 'products') { fetchProducts(); fetchCategories(); }
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

  async function fetchCategories() {
    try { setCategories((await getAdminCategories()).categories); } catch (e) {}
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadProductImage(file);
      setProductForm(prev => ({
        ...prev,
        images: [...prev.images, { src: result.src, alt: result.alt || prev.name || 'Product image' }],
      }));
      addToast('Image uploaded', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleCsvImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    setCsvResult(null);
    try {
      const result = await importCsv(file);
      setCsvResult(result);
      addToast(`Imported ${result.created} products (${result.skipped} skipped, ${result.errors.length} errors)`, result.errors.length ? 'error' : 'success');
      fetchProducts();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCsvImporting(false);
      e.target.value = '';
    }
  }

  function openNewProduct() {
    setEditingProduct(null);
    setProductForm({ ...EMPTY_PRODUCT });
    setShowProductForm(true);
  }

  function openEditProduct(p) {
    setEditingProduct(p);
    setProductForm({
      name: p.name || '',
      slug: p.slug || '',
      description: p.description || '',
      short_description: p.short_description || '',
      price: p.price ? String(p.price) : '',
      compare_price: p.compare_price ? String(p.compare_price) : '',
      sku: p.sku || '',
      stock: String(p.stock ?? 0),
      stock_alert: String(p.stock_alert ?? 5),
      category_id: p.category_id || '',
      images: p.images || [],
      attributes: p.attributes || {},
      featured: p.featured || false,
      active: p.active,
    });
    setShowProductForm(true);
  }

  function handleFormChange(field, value) {
    setProductForm(prev => ({ ...prev, [field]: value }));
  }

  function handleImageAdd() {
    const url = prompt('Enter image URL:');
    if (url && url.trim()) {
      setProductForm(prev => ({
        ...prev,
        images: [...prev.images, { src: url.trim(), alt: prev.name || 'Product image' }],
      }));
    }
  }

  function handleImageRemove(index) {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const slug = productForm.slug || 'misc';
      const uploaded = [];
      for (const file of files) {
        const result = await uploadProductImage(file, slug);
        uploaded.push(result);
      }
      setProductForm(prev => ({
        ...prev,
        images: [...prev.images, ...uploaded],
      }));
      addToast(`${uploaded.length} image(s) uploaded`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setUploading(false);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: productForm.name,
        slug: productForm.slug,
        description: productForm.description,
        short_description: productForm.short_description,
        price: parseFloat(productForm.price) || 0,
        compare_price: productForm.compare_price ? parseFloat(productForm.compare_price) : null,
        sku: productForm.sku || null,
        stock: parseInt(productForm.stock) || 0,
        stock_alert: parseInt(productForm.stock_alert) || 5,
        category_id: productForm.category_id || null,
        images: productForm.images,
        attributes: productForm.attributes,
        featured: productForm.featured,
        active: productForm.active,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        addToast('Product updated', 'success');
      } else {
        await createProduct(payload);
        addToast('Product created', 'success');
      }

      setShowProductForm(false);
      fetchProducts();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(p) {
    if (confirmDelete !== p.id) {
      setConfirmDelete(p.id);
      setTimeout(() => setConfirmDelete(null), 4000);
      return;
    }
    try {
      await deleteProduct(p.id);
      addToast('Product deleted', 'success');
      setConfirmDelete(null);
      fetchProducts();
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

  async function handleUpdateOrderStatus(id, status) {
    try {
      await updateOrderStatus(id, { status });
      addToast(`Order updated to ${status}`, 'success');
      fetchOrders();
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

            {/* DASHBOARD */}
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

            {/* ORDERS */}
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

            {/* PRODUCTS */}
            {tab === 'products' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ margin: 0 }}>Products ({products.length})</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                      {csvImporting ? 'Importing...' : 'Import CSV'}
                      <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} disabled={csvImporting} />
                    </label>
                    <button className="btn btn-accent btn-sm" onClick={openNewProduct}>+ Add Product</button>
                  </div>
                </div>

                {csvResult && (
                  <div className={`alert ${csvResult.errors.length ? 'alert-warning' : 'alert-success'}`} style={{ marginBottom: 16 }}>
                    Imported {csvResult.created} products. {csvResult.skipped > 0 && `${csvResult.skipped} skipped. `}
                    {csvResult.errors.length > 0 && `${csvResult.errors.length} errors: ${csvResult.errors.slice(0, 3).join('; ')}`}
                    <button onClick={() => setCsvResult(null)} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>Dismiss</button>
                  </div>
                )}

                {showProductForm && (
                  <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', padding: 24, marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 20 }}>{editingProduct ? `Edit: ${editingProduct.name}` : 'New Product'}</h3>
                    <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-row">
                          <label htmlFor="prod-name">Name *</label>
                          <input id="prod-name" type="text" value={productForm.name} onChange={e => {
                            handleFormChange('name', e.target.value);
                            handleFormChange('slug', e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'));
                          }} required />
                        </div>
                        <div className="form-row">
                          <label htmlFor="prod-slug">Slug *</label>
                          <input id="prod-slug" type="text" value={productForm.slug} onChange={e => handleFormChange('slug', e.target.value)} required />
                        </div>
                        <div className="form-row">
                          <label htmlFor="prod-price">Price ($) *</label>
                          <input id="prod-price" type="number" step="0.01" min="0" value={productForm.price} onChange={e => handleFormChange('price', e.target.value)} required />
                        </div>
                        <div className="form-row">
                          <label htmlFor="prod-compare">Compare Price ($)</label>
                          <input id="prod-compare" type="number" step="0.01" min="0" value={productForm.compare_price} onChange={e => handleFormChange('compare_price', e.target.value)} />
                        </div>
                        <div className="form-row">
                          <label htmlFor="prod-sku">SKU</label>
                          <input id="prod-sku" type="text" value={productForm.sku} onChange={e => handleFormChange('sku', e.target.value)} />
                        </div>
                        <div className="form-row">
                          <label htmlFor="prod-stock">Stock</label>
                          <input id="prod-stock" type="number" min="0" value={productForm.stock} onChange={e => handleFormChange('stock', e.target.value)} />
                        </div>
                      </div>

                      <div className="form-row">
                        <label htmlFor="prod-short">Short Description</label>
                        <input id="prod-short" type="text" value={productForm.short_description} onChange={e => handleFormChange('short_description', e.target.value)} />
                      </div>
                      <div className="form-row">
                        <label htmlFor="prod-desc">Full Description (HTML OK)</label>
                        <textarea id="prod-desc" rows="4" value={productForm.description} onChange={e => handleFormChange('description', e.target.value)} />
                      </div>

                      <div className="form-row">
                        <label htmlFor="prod-category">Category</label>
                        <select id="prod-category" value={productForm.category_id} onChange={e => handleFormChange('category_id', e.target.value)}>
                          <option value="">— None —</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>Images</label>
                        {productForm.images.map((img, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, background: 'var(--color-bg)', padding: 6, borderRadius: 4 }}>
                            <img src={img.src} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                            <input type="text" value={img.src} onChange={e => {
                              const imgs = [...productForm.images];
                              imgs[i] = { ...imgs[i], src: e.target.value };
                              handleFormChange('images', imgs);
                            }} style={{ flex: 1, padding: '6px 10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text)', fontSize: 13 }} />
                            <button type="button" className="btn btn-xs btn-danger" onClick={() => handleImageRemove(i)}>Remove</button>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <label className="btn btn-xs btn-outline" style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
                            {uploading ? 'Uploading...' : '+ Upload Image'}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              multiple
                              onChange={handleImageUpload}
                              disabled={uploading}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <button type="button" className="btn btn-xs btn-outline" onClick={handleImageAdd}>+ Add Image URL</button>
                        </div>
                      </div>

                      <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        <legend style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 8px' }}>Attributes</legend>
                        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={productForm.featured} onChange={e => handleFormChange('featured', e.target.checked)} /> Featured
                        </label>
                        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={productForm.active} onChange={e => handleFormChange('active', e.target.checked)} /> Active / Published
                        </label>
                      </fieldset>

                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button type="submit" className="btn btn-accent btn-sm" disabled={saving}>
                          {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowProductForm(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {products.length > 0 ? (
                  <table className="shop_table" style={{ width: '100%' }}>
                    <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Active</th><th>Actions</th></tr></thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td data-title="Name"><strong>{p.name}</strong></td>
                          <td data-title="SKU">{p.sku || '-'}</td>
                          <td data-title="Price">${Number(p.price).toFixed(2)}</td>
                          <td data-title="Stock" style={{ color: p.stock <= (p.stock_alert || 5) ? 'var(--color-accent)' : 'inherit' }}>{p.stock}</td>
                          <td data-title="Active">{p.active ? 'Yes' : 'No'}</td>
                          <td data-title="Actions" style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn btn-xs btn-outline" style={{ marginRight: 6 }} onClick={() => openEditProduct(p)}>Edit</button>
                            <button
                              className={`btn btn-xs ${confirmDelete === p.id ? 'btn-danger' : 'btn-outline'}`}
                              style={{ marginRight: 6 }}
                              onClick={() => handleDeleteProduct(p)}
                            >
                              {confirmDelete === p.id ? 'Confirm?' : 'Delete'}
                            </button>
                            <button
                              className={`btn btn-xs ${p.active ? 'btn-danger' : 'btn-primary'}`}
                              onClick={() => handleToggleProductActive(p, !p.active)}
                            >
                              {p.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  !showProductForm && <p className="no-results">No products yet. Click "Add Product" to get started.</p>
                )}
              </div>
            )}

            {/* CUSTOMERS */}
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

            {/* MESSAGES */}
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
                          <button className="btn btn-xs btn-outline" onClick={() => handleMarkRead(m.id)}>Mark Read</button>
                        )}
                      </div>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: 8, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                  </div>
                ))}
                {messages.length === 0 && <p className="no-results">No messages yet.</p>}
              </div>
            )}

            {/* REVIEWS */}
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
