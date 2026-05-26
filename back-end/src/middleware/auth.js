import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';

// Require valid JWT — extracts user from Authorization header
export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid authorization header', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    req.user = data.user;
    next();
  } catch (err) {
    next(err);
  }
}

// Optional auth — attaches user if token present, continues regardless
export async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) req.user = data.user;
    }
  } catch {
    // Ignore — user stays null
  }
  next();
}

// Require admin role — must be called AFTER requireAuth
export async function requireAdmin(req, _res, next) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new AppError('Admin access required', 403, 'FORBIDDEN');
    }

    req.profile = profile;
    next();
  } catch (err) {
    next(err);
  }
}
