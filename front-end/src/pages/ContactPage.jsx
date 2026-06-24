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
      <Seo title="Contact Us" description="Need help with an order or product question? Contact Mecville - Montreal's premium Pokémon TCG store." />
      <div className="container">
        <section className="page-intro">
          <h1>Contact Us</h1>
          <p>Need help with an order? Have a question about a product? Send us a message and our team will get back to you quickly.</p>
        </section>

        <div className="contact-grid">
          <div className="contact-card">
            <h2>Get in touch</h2>
            <p>We're here to help with orders, product questions, and general store support.</p>
            <p><strong>Email</strong><br /><a href="mailto:support@mecville.com">support@mecville.com</a></p>
            <p><strong>Phone</strong><br /><a href="tel:+15141234567">(514) 123-4567</a></p>
            <p><strong>Location</strong><br />Montreal, Quebec, Canada</p>
            <p><strong>Store Hours</strong><br />Mon–Fri: 10AM–6PM EST<br />Sat: 11AM–4PM EST<br />Sun: Closed</p>
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
