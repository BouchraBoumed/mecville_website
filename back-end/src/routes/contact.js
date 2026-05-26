import { Router } from 'express';
import { contactLimiter } from '../middleware/rateLimiter.js';
import { validate, schemas } from '../middleware/validate.js';
import { supabase } from '../config/supabase.js';
import { sendContactNotification } from '../services/email.js';

const router = Router();

// POST /api/contact — Submit contact form (public)
router.post('/', contactLimiter, validate(schemas.contact), async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.validated;

    // Store in database
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({ name, email, subject, message })
      .select()
      .single();

    if (error) throw error;

    // Send notification email (non-blocking)
    sendContactNotification({ name, email, subject, message }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
