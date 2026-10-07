import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export interface DemoAuthClient {
  auth: {
    getSession: () => Promise<{ data: { session: unknown }; error: Error | null }>;
    signInAnonymously: () => Promise<{ error: Error | null }>;
  };
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase no está configurado. Completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
  client = createClient(url, key);
  return client;
}

export async function ensureAuthenticatedSession(supabase: DemoAuthClient): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`No se pudo consultar la sesión Supabase: ${error.message}`);
  if (data.session) return;
  const result = await supabase.auth.signInAnonymously();
  if (result.error) throw new Error(`No se pudo crear la sesión Supabase: ${result.error.message}`);
}

export async function ensureDemoSession(): Promise<void> {
  await ensureAuthenticatedSession(getSupabaseClient());
}
