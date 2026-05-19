export default function ContactPage() {
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
            <p>We’re here to help with orders, product questions, and general store support.</p>
            <p><strong>Email</strong><br />support@mecville.com</p>
            <p><strong>Phone</strong><br />(514) 123-4567</p>
            <p><strong>Location</strong><br />Montreal, Quebec, Canada</p>
          </div>
          <div className="contact-form">
            <h2>Send a message</h2>
            <form>
              <label>
                Name
                <input type="text" name="name" placeholder="Your name" />
              </label>
              <label>
                Email
                <input type="email" name="email" placeholder="Your email" />
              </label>
              <label>
                Message
                <textarea name="message" placeholder="How can we help?" />
              </label>
              <button type="submit" className="btn btn-primary">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
