/**
 * Supabase Browser Client
 * For use in client-side components (use client)
 * 
 * Uses @supabase/ssr for proper session management
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

