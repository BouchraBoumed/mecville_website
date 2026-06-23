import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(() => Promise.resolve({ messageId: 'test-msg-id' })),
    })),
  },
}));

import { sendContactNotification, sendOrderConfirmation, sendOrderStatusUpdate } from '../services/email.js';

describe('Email Service', () => {
  beforeEach(() => {
    // Ensure SMTP env vars are set so the real transporter is used
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'test-pass';
    process.env.CONTACT_EMAIL = 'contact@mecville.com';
  });

  describe('sendContactNotification', () => {
    it('sends contact notification email without throwing', async () => {
      await expect(
        sendContactNotification({
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Question about order',
          message: 'I have a question about my recent order.',
        })
      ).resolves.toBeUndefined();
    });

    it('handles missing subject gracefully', async () => {
      await expect(
        sendContactNotification({
          name: 'Jane',
          email: 'jane@example.com',
          subject: '',
          message: 'Just saying hi.',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('sendOrderConfirmation', () => {
    it('sends order confirmation with items', async () => {
      await expect(
        sendOrderConfirmation({
          email: 'customer@example.com',
          order_number: 'MCV-20240101-ABC123',
          status: 'processing',
          items: [
            { name: 'Charizard VMAX', quantity: 1, total: 599.99 },
            { name: 'Booster Pack', quantity: 2, total: 79.98 },
          ],
          subtotal: 679.97,
          shipping_cost: 0,
          total: 679.97,
        })
      ).resolves.toBeUndefined();
    });

    it('handles order with no items', async () => {
      await expect(
        sendOrderConfirmation({
          email: 'customer@example.com',
          order_number: 'MCV-EMPTY',
          status: 'processing',
          items: [],
          subtotal: 0,
          shipping_cost: 15,
          total: 15,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('sendOrderStatusUpdate', () => {
    it('sends status update for shipped with tracking', async () => {
      await expect(
        sendOrderStatusUpdate(
          {
            email: 'customer@example.com',
            order_number: 'MCV-SHIP-001',
            shipping_address: { first_name: 'Alice' },
            tracking_number: 'TRK123456',
          },
          'shipped'
        )
      ).resolves.toBeUndefined();
    });

    it('sends status update for delivered', async () => {
      await expect(
        sendOrderStatusUpdate(
          {
            email: 'customer@example.com',
            order_number: 'MCV-DEL-001',
            shipping_address: { first_name: 'Bob' },
          },
          'delivered'
        )
      ).resolves.toBeUndefined();
    });

    it('sends status update for cancelled', async () => {
      await expect(
        sendOrderStatusUpdate(
          {
            email: 'customer@example.com',
            order_number: 'MCV-CAN-001',
            shipping_address: {},
          },
          'cancelled'
        )
      ).resolves.toBeUndefined();
    });

    it('sends status update for refunded', async () => {
      await expect(
        sendOrderStatusUpdate(
          {
            email: 'customer@example.com',
            order_number: 'MCV-REF-001',
            shipping_address: {},
          },
          'refunded'
        )
      ).resolves.toBeUndefined();
    });

    it('sends status update for processing', async () => {
      await expect(
        sendOrderStatusUpdate(
          {
            email: 'customer@example.com',
            order_number: 'MCV-PROC-001',
            shipping_address: { first_name: 'Charlie' },
          },
          'processing'
        )
      ).resolves.toBeUndefined();
    });

    it('handles unknown status gracefully', async () => {
      await expect(
        sendOrderStatusUpdate(
          {
            email: 'customer@example.com',
            order_number: 'MCV-UNK-001',
            shipping_address: {},
          },
          'unknown_status'
        )
      ).resolves.toBeUndefined();
    });

    it('handles missing shipping_address.first_name', async () => {
      await expect(
        sendOrderStatusUpdate(
          {
            email: 'customer@example.com',
            order_number: 'MCV-NONAME',
            shipping_address: null,
          },
          'shipped'
        )
      ).resolves.toBeUndefined();
    });
  });
});
