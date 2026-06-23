import { useState } from 'react';
import Seo from '../components/Seo';
import { submitContactForm } from '../api/backend';
import { useToast } from '../components/Toast';

export default function ContactPage() {
  const { addToast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    const form = e.target;
    const data = {
      name: form.name.value,
      email: form.email.value,
      subject: form.subject?.value || '',
      message: form.message.value,
    };
    try {
      await submitContactForm(data);
      setSent(true);
      addToast("Message sent! We'll get back to you within 24-48 hours.", 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <main className="content-area">
        <Seo title="Message Sent" />
        <div className="container">
          <section className="page-intro">
            <h1>Message Sent!</h1>
            <p>Thank you for reaching out. Our team will get back to you within 24-48 hours.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="content-area">
      <Seo title="Contact Us" description="Need help with an order or product question? Contact Mecville - Montreal's premium Pokemon TCG store." />
      <div className="container">
        <section className="page-intro">
          <h1>Contact Us</h1>
          <p>Need help with an order? Have a question about a product? Send us a message and our team will get back to you quickly.</p>
        </section>

        <div className="contact-grid">
          <div className="contact-card">
            <h2>Get in touch</h2>
            <p>We're here to help with orders, product questions, and general store support.</p>
            <p><strong>Email</strong><br />support@mecville.com</p>
            <p><strong>Phone</strong><br />(514) 123-4567</p>
            <p><strong>Location</strong><br />Montreal, Quebec, Canada</p>
            <p><strong>Store Hours</strong><br />Mon–Fri: 10AM–6PM EST<br />Sat: 11AM–4PM EST<br />Sun: Closed</p>
            <p><strong>Follow Us</strong></p>
            <div className="social-links" style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <a href="#" aria-label="Instagram" className="social-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', transition: 'all var(--transition)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" aria-label="Facebook" className="social-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', transition: 'all var(--transition)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" aria-label="X" className="social-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', transition: 'all var(--transition)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>
          <div className="contact-form">
            <h2>Send a message</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="contact-name">
                Name
                <input id="contact-name" type="text" name="name" placeholder="Your name" required />
              </label>
              <label htmlFor="contact-email">
                Email
                <input id="contact-email" type="email" name="email" placeholder="Your email" required />
              </label>
              <label htmlFor="contact-subject">
                Subject
                <input id="contact-subject" type="text" name="subject" placeholder="Subject (optional)" />
              </label>
              <label htmlFor="contact-message">
                Message
                <textarea id="contact-message" name="message" placeholder="How can we help?" required />
              </label>
              <button type="submit" className="btn btn-accent" disabled={sending}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
