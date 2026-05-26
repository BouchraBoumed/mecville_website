import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const useSmtp = process.env.SMTP_HOST && process.env.SMTP_USER;

  if (useSmtp) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Log emails in development if no SMTP configured
    transporter = {
      sendMail: async (opts) => {
        console.log('--- EMAIL (dev mode) ---');
        console.log(`To: ${opts.to}`);
        console.log(`Subject: ${opts.subject}`);
        console.log(`Body: ${opts.html || opts.text}`);
        console.log('--- END EMAIL ---');
        return { messageId: `dev-${Date.now()}` };
      },
    };
  }

  return transporter;
}

export async function sendContactNotification({ name, email, subject, message }) {
  const contactEmail = process.env.CONTACT_EMAIL || 'contact@mecville.com';
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Mecville Contact" <${process.env.SMTP_USER || 'noreply@mecville.com'}>`,
    to: contactEmail,
    replyTo: email,
    subject: `Contact Form: ${subject || 'New Message'} from ${name}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `,
  });
}

export async function sendOrderConfirmation(order) {
  const transporter = getTransporter();

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">x${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: `"Mecville" <${process.env.SMTP_USER || 'noreply@mecville.com'}>`,
    to: order.email,
    subject: `Order Confirmed — ${order.order_number}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#1a1a2e;color:#d4a84b;padding:20px;text-align:center;">
          <h1>Mecville</h1>
          <h2>Order Confirmed!</h2>
        </div>
        <div style="padding:20px;">
          <p>Thank you for your order!</p>
          <p><strong>Order Number:</strong> ${order.order_number}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="padding:8px;text-align:left;">Item</th>
                <th style="padding:8px;text-align:center;">Qty</th>
                <th style="padding:8px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align:right;margin-top:20px;">
            <p><strong>Subtotal:</strong> $${order.subtotal.toFixed(2)}</p>
            <p><strong>Shipping:</strong> ${order.shipping_cost > 0 ? '$' + order.shipping_cost.toFixed(2) : 'Free'}</p>
            <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
          </div>
          <p style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;color:#666;font-size:12px;">
            If you have any questions, contact us at support@mecville.com
          </p>
        </div>
      </div>
    `,
  });
}
