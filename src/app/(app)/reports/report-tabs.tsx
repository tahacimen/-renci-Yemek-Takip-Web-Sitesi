"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui";

const SEKMELER = [
  { href: "/reports", label: "Cari Durum" },
  { href: "/reports/gun-sonu", label: "Gün Sonu" },
  { href: "/reports/nakit", label: "Nakit" },
  { href: "/reports/devam", label: "Devam Çizelgesi" },
  { href: "/reports/tahsilat", label: "Tahsilat Geçmişi" },
  { href: "/reports/taksit", label: "Taksit Takibi" },
];

export function ReportTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
      {SEKMELER.map((s) => {
        const aktif = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              aktif
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
