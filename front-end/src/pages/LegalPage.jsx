import { Link } from 'react-router-dom';
import { sanitizeHtml } from '../lib/sanitize';

const content = {
  privacy: {
    title: 'Privacy Policy',
    body: `
      <h2>Information We Collect</h2>
      <p>We collect your name, email, shipping address, and payment information when you place an order. We also collect browsing behavior via cookies to improve your experience.</p>
      <h2>How We Use Your Information</h2>
      <p>To process orders, communicate with you, improve our site, and send promotional emails (with consent only).</p>
      <h2>Payment Processing</h2>
      <p>We use Stripe and PayPal. We never store your payment card details.</p>
      <h2>Data Protection</h2>
      <p>SSL encryption protects your data. We never sell your personal information.</p>
      <h2>Contact</h2>
      <p>Email: hello@mecville.com</p>
    `,
  },
  terms: {
    title: 'Terms & Conditions',
    body: `
      <h2>Use of Service</h2>
      <p>By using Mecville, you agree to these terms. You are responsible for your account credentials.</p>
      <h2>Pricing</h2>
      <p>All prices in CAD. Prices subject to change. Promotions cannot be combined unless stated.</p>
      <h2>Products</h2>
      <p>We strive for accurate descriptions. Actual products may vary slightly from images.</p>
      <h2>Limitation of Liability</h2>
      <p>Mecville is not liable for indirect or consequential damages from product use.</p>
    `,
  },
  shipping: {
    title: 'Shipping Policy',
    body: `
      <h2>Processing</h2>
      <p>Orders ship within 1-2 business days. Orders after 2 PM EST process next business day.</p>
      <h2>Rates</h2>
      <p>Canada: $10 flat. Free over $100 CAD. US: $15 USD flat. International: calculated at checkout.</p>
      <h2>Delivery Times</h2>
      <p>Canada: 3-7 days. US: 7-14 days. International: 10-21 days (customs delays possible).</p>
      <h2>Tracking</h2>
      <p>Tracking included on all orders. Emailed when your order ships.</p>
    `,
  },
  refund: {
    title: 'Refund & Return Policy',
    body: `
      <h2>Sealed Products</h2>
      <p>Must be unopened. Returns within 14 days of delivery.</p>
      <h2>Singles</h2>
      <p>All single cards inspected before shipping. Returns only accepted for wrong or damaged items.</p>
      <h2>Graded Cards</h2>
      <p>Final sale unless damaged in transit.</p>
      <h2>Damaged / Wrong Items</h2>
      <p>Contact us within 48 hours with photos. We arrange replacement or refund.</p>
      <h2>Refunds</h2>
      <p>Processed within 5-7 business days to original payment method.</p>
    `,
  },
};

export default function LegalPage({ page }) {
  const data = content[page] || { title: 'Page', body: '<p>Content coming soon.</p>' };

  return (
    <main className="content-area">
      <div className="container">
        <nav className="woocommerce-breadcrumb">
          <Link to="/">Home</Link> / <span>{data.title}</span>
        </nav>
        <article className="page-content">
          <h1 className="page-title">{data.title}</h1>
          <div className="entry-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.body) }} />
        </article>
      </div>
    </main>
  );
}
