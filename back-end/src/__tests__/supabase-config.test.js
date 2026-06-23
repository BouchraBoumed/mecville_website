import { describe, it, expect } from 'vitest';
import { supabase } from '../config/supabase.js';

describe('Supabase Config', () => {
  it('creates a supabase client', () => {
    expect(supabase).toBeDefined();
    expect(supabase.from).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });

  it('has auth methods', () => {
    expect(supabase.auth).toBeDefined();
    expect(supabase.auth.getUser).toBeDefined();
    expect(supabase.auth.signOut).toBeDefined();
  });

  it('has storage methods', () => {
    expect(supabase.storage).toBeDefined();
  });

  it('has channel/realtime methods', () => {
    expect(supabase.channel).toBeDefined();
    expect(supabase.removeChannel).toBeDefined();
  });
});
