import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";
import { SUPABASE_URL } from "./env";

/**
 * Service role istemcisi — RLS'i BYPASS eder.
 * Yalnızca kullanıcı oluşturma / silme gibi Admin API gerektiren
 * işlemler için, çağıranın admin olduğu doğrulandıktan SONRA kullanılır.
 * Anahtar asla client'a gönderilmez.
 */
export function createAdminClient() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tanımlı değil. Kullanıcı yönetimi için .env.local dosyasına ekleyin.",
    );
  }

  return createSupabaseClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
