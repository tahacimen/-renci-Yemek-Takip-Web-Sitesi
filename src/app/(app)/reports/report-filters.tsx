"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  StudentAutocomplete,
  type SecilenOgrenci,
} from "@/components/student-autocomplete";
import { Button, Input, Select } from "@/components/ui";
import { ayinIlkGunu, ayinSonGunu, isoTarih } from "@/lib/format";

export type ReportFilterValues = {
  baslangic: string;
  bitis: string;
  sinif: string;
  aktif: string;
};

export function ReportFilters({
  degerler,
  siniflar,
  secilenOgrenci,
}: {
  degerler: ReportFilterValues;
  siniflar: string[];
  secilenOgrenci: SecilenOgrenci | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [v, setV] = useState(degerler);
  const [ogrenci, setOgrenci] = useState<SecilenOgrenci | null>(secilenOgrenci);

  function params(next: ReportFilterValues, o: SecilenOgrenci | null) {
    const p = new URLSearchParams();
    p.set("baslangic", next.baslangic);
    p.set("bitis", next.bitis);
    if (next.sinif) p.set("sinif", next.sinif);
    if (next.aktif) p.set("aktif", next.aktif);
    if (o) p.set("student", o.student_id);
    return p;
  }

  function uygula(next: ReportFilterValues, o: SecilenOgrenci | null) {
    router.push(`${pathname}?${params(next, o).toString()}`);
  }

  const hazir = [
    { label: "Bu ay", deger: [ayinIlkGunu(), ayinSonGunu()] as const },
    {
      label: "Geçen ay",
      get deger() {
        const d = new Date();
        const g = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        return [ayinIlkGunu(g), ayinSonGunu(g)] as const;
      },
    },
    {
      label: "Bu yıl",
      get deger() {
        const y = new Date().getFullYear();
        return [isoTarih(new Date(y, 0, 1)), isoTarih(new Date(y, 11, 31))] as const;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          uygula(v, ogrenci);
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Başlangıç
          </span>
          <Input
            type="date"
            value={v.baslangic}
            onChange={(e) => setV({ ...v, baslangic: e.target.value })}
            className="w-40"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Bitiş
          </span>
          <Input
            type="date"
            value={v.bitis}
            onChange={(e) => setV({ ...v, bitis: e.target.value })}
            className="w-40"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Sınıf
          </span>
          <Select
            value={v.sinif}
            onChange={(e) => setV({ ...v, sinif: e.target.value })}
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

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Kayıt durumu
          </span>
          <Select
            value={v.aktif}
            onChange={(e) => setV({ ...v, aktif: e.target.value })}
            className="w-36"
          >
            <option value="">Sadece aktif</option>
            <option value="hepsi">Hepsi</option>
          </Select>
        </label>

        <Button type="submit">Raporu getir</Button>

        <div className="flex gap-1">
          {hazir.map((h) => (
            <Button
              key={h.label}
              type="button"
              variant="ghost"
              onClick={() => {
                const next = {
                  ...v,
                  baslangic: h.deger[0],
                  bitis: h.deger[1],
                };
                setV(next);
                uygula(next, ogrenci);
              }}
            >
              {h.label}
            </Button>
          ))}
        </div>
      </form>

      <div className="max-w-md">
        <StudentAutocomplete
          secilen={ogrenci}
          onSecim={(o) => {
            setOgrenci(o);
            uygula(v, o);
          }}
        />
        <p className="mt-1 text-xs text-slate-500">
          Tek öğrenci raporu için seçin; boş bırakırsanız tüm öğrenciler gelir.
        </p>
      </div>
    </div>
  );
}
