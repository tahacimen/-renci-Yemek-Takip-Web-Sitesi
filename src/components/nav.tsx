"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "./ui";

type Item = { href: string; label: string; adminOnly?: boolean };

const ITEMS: Item[] = [
  { href: "/pos", label: "Yemekhane" },
  { href: "/dashboard", label: "Özet" },
  { href: "/students", label: "Öğrenciler" },
  { href: "/payments/new", label: "Tahsilat" },
  { href: "/reports", label: "Raporlar" },
  { href: "/admin/users", label: "Kullanıcılar", adminOnly: true },
  { href: "/admin/audit-log", label: "İşlem Kayıtları", adminOnly: true },
  { href: "/admin/settings", label: "Ayarlar", adminOnly: true },
];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {ITEMS.filter((i) => !i.adminOnly || isAdmin).map((item) => {
        const aktif =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              aktif
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
