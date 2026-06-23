import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  const mailer = getTransporter();

  await mailer.sendMail({
    from: `"Mecville Contact" <${process.env.SMTP_USER || 'noreply@mecville.com'}>`,
    to: contactEmail,
    replyTo: email,
    subject: `Contact Form: ${escapeHtml(subject || 'New Message')} from ${escapeHtml(name)}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject || 'N/A')}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `,
  });
}

export async function sendOrderConfirmation(order) {
  const mailer = getTransporter();

  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">x${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(item.total || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  await mailer.sendMail({
    from: `"Mecville" <${process.env.SMTP_USER || 'noreply@mecville.com'}>`,
    to: order.email,
    subject: `Order Confirmed \u2014 ${escapeHtml(order.order_number)}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#1a1a2e;color:#d4a84b;padding:20px;text-align:center;">
          <h1>Mecville</h1>
          <h2>Order Confirmed!</h2>
        </div>
        <div style="padding:20px;">
          <p>Thank you for your order!</p>
          <p><strong>Order Number:</strong> ${escapeHtml(order.order_number)}</p>
          <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
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
            <p><strong>Subtotal:</strong> $${(order.subtotal || 0).toFixed(2)}</p>
            <p><strong>Shipping:</strong> ${(order.shipping_cost || 0) > 0 ? '$' + (order.shipping_cost || 0).toFixed(2) : 'Free'}</p>
            <p><strong>Total:</strong> $${(order.total || 0).toFixed(2)}</p>
          </div>
          <p style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;color:#666;font-size:12px;">
            If you have any questions, contact us at support@mecville.com
          </p>
        </div>
      </div>
    `,
  });
}


export async function sendOrderStatusUpdate(order, newStatus) {
  const mailer = getTransporter();

  const statusMessages = {
    pending: 'Your order has been received and is awaiting processing.',
    processing: 'Your order is now being processed and prepared for shipment.',
    shipped: `Your order has been shipped!${order.tracking_number ? ` Tracking number: ${escapeHtml(order.tracking_number)}` : ''}`,
    delivered: 'Your order has been delivered. Enjoy your cards!',
    cancelled: 'Your order has been cancelled. If you have questions, please contact support.',
    refunded: 'A refund has been processed for your order. Please allow 5-7 business days for the refund to appear.',
  };

  const message = statusMessages[newStatus] || `Your order status has been updated to: ${escapeHtml(newStatus)}.`;

  await mailer.sendMail({
    from: `"Mecville" <${process.env.SMTP_USER || 'noreply@mecville.com'}>`,
    to: order.email,
    subject: `Order Update — ${escapeHtml(order.order_number)} — ${escapeHtml(newStatus.charAt(0).toUpperCase() + newStatus.slice(1))}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#1a1a2e;color:#d4a84b;padding:20px;text-align:center;">
          <h1>Mecville</h1>
          <h2>Order Status Update</h2>
        </div>
        <div style="padding:20px;">
          <p>Hi ${escapeHtml(order.shipping_address?.first_name || 'Customer')},</p>
          <p>${message}</p>
          <p><strong>Order Number:</strong> ${escapeHtml(order.order_number)}</p>
          <p><strong>Current Status:</strong> ${escapeHtml(newStatus)}</p>
          ${order.tracking_number ? `<p><strong>Tracking Number:</strong> ${escapeHtml(order.tracking_number)}</p>` : ''}
          <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;color:#666;font-size:12px;">
            If you have any questions, contact us at support@mecville.com
          </div>
        </div>
      </div>
    `,
  });
}
