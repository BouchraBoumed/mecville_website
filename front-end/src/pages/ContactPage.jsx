import { useState } from 'react';
import { submitContactForm } from '../api/backend';

export default function ContactPage() {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <main className="content-area">
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
          </div>
          <div className="contact-form">
            <h2>Send a message</h2>
            {error && <div style={{ background: '#442222', color: '#ff6666', padding: 12, borderRadius: 4, marginBottom: 16 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <label>
                Name
                <input type="text" name="name" placeholder="Your name" required />
              </label>
              <label>
                Email
                <input type="email" name="email" placeholder="Your email" required />
              </label>
              <label>
                Subject
                <input type="text" name="subject" placeholder="Subject (optional)" />
              </label>
              <label>
                Message
                <textarea name="message" placeholder="How can we help?" required />
              </label>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
