import Link from "next/link";

import { NavLinks } from "@/components/nav";
import { Badge, Button } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";

import { cikisYap } from "../login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-base font-semibold text-slate-900"
            >
              Yemek Takip
            </Link>
            <NavLinks isAdmin={user.isAdmin} />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <div className="font-medium text-slate-800">
                {user.profile.ad_soyad || user.email}
              </div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <Badge ton={user.isAdmin ? "blue" : "slate"}>
              {user.isAdmin ? "Admin" : "Personel"}
            </Badge>
            <form action={cikisYap}>
              <Button type="submit" variant="secondary">
                Çıkış
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
