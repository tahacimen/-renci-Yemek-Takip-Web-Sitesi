"use client";

import { usePathname, useRouter } from "next/navigation";

import { Select } from "@/components/ui";

export function TaksitFilter({
  yil,
  sinif,
  siniflar,
  sadeceGecikmis,
}: {
  yil: number;
  sinif: string;
  siniflar: string[];
  sadeceGecikmis: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const buYil = new Date().getFullYear();
  const yillar = [buYil + 1, buYil, buYil - 1, buYil - 2];

  function git(next: {
    yil?: number;
    sinif?: string;
    gecikmis?: boolean;
  }) {
    const p = new URLSearchParams();
    p.set("yil", String(next.yil ?? yil));
    const s = next.sinif ?? sinif;
    if (s) p.set("sinif", s);
    if (next.gecikmis ?? sadeceGecikmis) p.set("gecikmis", "1");
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
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

      <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={sadeceGecikmis}
          onChange={(e) => git({ gecikmis: e.target.checked })}
          className="h-4 w-4"
        />
        Sadece ödeme alınması gerekenler
      </label>
    </div>
  );
}
