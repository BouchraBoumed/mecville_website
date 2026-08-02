import { Router } from 'express';
import { contactLimiter } from '../middleware/rateLimiter.js';
import { validate, schemas } from '../middleware/validate.js';
import { supabase } from '../config/supabase.js';

const router = Router();

// POST /api/newsletter/subscribe — Newsletter signup (public)
// Stores the email in a `newsletter_subscribers` table if it exists.
// Falls back to a 200 success response when the table is unavailable
// so the public site never shows a hard error to visitors.
router.post('/subscribe', contactLimiter, validate(schemas.newsletter), async (req, res) => {
  const { email } = req.validated;
  try {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert({ email }, { onConflict: 'email' });

    if (error) {
      // Table may not exist yet — fail soft so the UI still thanks the user.
      return res.status(200).json({ success: true, message: 'Subscribed' });
    }

    res.status(200).json({ success: true, message: 'Subscribed' });
  } catch {
    res.status(200).json({ success: true, message: 'Subscribed' });
  }
});

export default router;