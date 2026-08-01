"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input, Select } from "@/components/ui";

export type StudentFilterValues = {
  q: string;
  sinif: string;
  borc: string;
  durum: string;
};

export function StudentFilters({
  siniflar,
  degerler,
}: {
  siniflar: string[];
  degerler: StudentFilterValues;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [v, setV] = useState(degerler);

  function uygula(next: StudentFilterValues) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.sinif) params.set("sinif", next.sinif);
    if (next.borc) params.set("borc", next.borc);
    if (next.durum) params.set("durum", next.durum);
    router.push(params.toString() ? `${pathname}?${params}` : pathname);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        uygula(v);
      }}
    >
      <label className="block grow sm:grow-0">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Ara (ad soyad / öğrenci no)
        </span>
        <Input
          type="search"
          value={v.q}
          placeholder="Örn. Ayşe veya 1024"
          onChange={(e) => setV({ ...v, q: e.target.value })}
          className="w-full sm:w-64"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Sınıf
        </span>
        <Select
          value={v.sinif}
          onChange={(e) => {
            const next = { ...v, sinif: e.target.value };
            setV(next);
            uygula(next);
          }}
          className="w-40"
        >
          <option value="">Tümü</option>
          {siniflar.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Borç durumu
        </span>
        <Select
          value={v.borc}
          onChange={(e) => {
            const next = { ...v, borc: e.target.value };
            setV(next);
            uygula(next);
          }}
          className="w-40"
        >
          <option value="">Tümü</option>
          <option value="borclu">Borçlu (kalan &lt; 0)</option>
          <option value="borcsuz">Borçsuz (kalan ≥ 0)</option>
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Kayıt durumu
        </span>
        <Select
          value={v.durum}
          onChange={(e) => {
            const next = { ...v, durum: e.target.value };
            setV(next);
            uygula(next);
          }}
          className="w-36"
        >
          <option value="">Aktif</option>
          <option value="pasif">Pasif</option>
          <option value="hepsi">Hepsi</option>
        </Select>
      </label>

      <Button type="submit">Ara</Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          const bos = { q: "", sinif: "", borc: "", durum: "" };
          setV(bos);
          uygula(bos);
        }}
      >
        Temizle
      </Button>
    </form>
  );
}
