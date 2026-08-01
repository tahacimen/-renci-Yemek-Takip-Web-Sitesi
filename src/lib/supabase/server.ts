import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

/**
 * Server component / server action / route handler istemcisi.
 * Kullanıcının oturumunu taşır, dolayısıyla tüm sorgular RLS altında çalışır.
 */
export async function createClient() {
  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server component içinden çağrıldığında cookie yazılamaz;
          // oturum yenilemesi middleware tarafından yapılır.
        }
      },
    },
  });
}
