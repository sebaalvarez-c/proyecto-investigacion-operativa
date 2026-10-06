import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

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

export async function ensureDemoSession(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.getSession();
  if (error) throw new Error(`No se pudo abrir la sesión Supabase: ${error.message}`);
}
