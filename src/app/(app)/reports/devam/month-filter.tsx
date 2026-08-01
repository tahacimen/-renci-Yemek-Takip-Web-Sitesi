"use client";

import { usePathname, useRouter } from "next/navigation";

import { Select } from "@/components/ui";

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export function MonthFilter({
  yil,
  ay,
  sinif,
  siniflar,
}: {
  yil: number;
  ay: number;
  sinif: string;
  siniflar: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const buYil = new Date().getFullYear();
  const yillar = [buYil + 1, buYil, buYil - 1, buYil - 2];

  function git(next: { yil?: number; ay?: number; sinif?: string }) {
    const p = new URLSearchParams();
    p.set("yil", String(next.yil ?? yil));
    p.set("ay", String(next.ay ?? ay));
    const s = next.sinif ?? sinif;
    if (s) p.set("sinif", s);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Yıl</span>
        <Select
          value={yil}
          onChange={(e) => git({ yil: Number(e.target.value) })}
          className="w-28"
        >
          {yillar.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Ay</span>
        <Select
          value={ay}
          onChange={(e) => git({ ay: Number(e.target.value) })}
          className="w-36"
        >
          {AYLAR.map((a, i) => (
            <option key={a} value={i + 1}>
              {a}
            </option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Sınıf
        </span>
        <Select
          value={sinif}
          onChange={(e) => git({ sinif: e.target.value })}
          className="w-40"
        >
          <option value="">Tüm sınıflar</option>
          {siniflar.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
