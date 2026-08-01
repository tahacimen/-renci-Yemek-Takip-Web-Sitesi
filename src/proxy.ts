import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Her istekte Supabase oturum çerezini tazeler ve
 * giriş yapmamış kullanıcıyı /login'e yönlendirir.
 * (Next.js 16'da "middleware" konvansiyonunun yerini "proxy" aldı.)
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
