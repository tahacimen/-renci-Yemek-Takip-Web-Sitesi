"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "./ui";
import { ayinIlkGunu, ayinSonGunu, isoTarih } from "@/lib/format";

type Hazir = { label: string; hesapla: () => [string, string] };

const HAZIR_ARALIKLAR: Hazir[] = [
  {
    label: "Bu ay",
    hesapla: () => [ayinIlkGunu(), ayinSonGunu()],
  },
  {
    label: "Geçen ay",
    hesapla: () => {
      const d = new Date();
      const gecen = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return [ayinIlkGunu(gecen), ayinSonGunu(gecen)];
    },
  },
  {
    label: "Bu yıl",
    hesapla: () => {
      const y = new Date().getFullYear();
      return [isoTarih(new Date(y, 0, 1)), isoTarih(new Date(y, 11, 31))];
    },
  },
];

export function DateRangeFilter({
  baslangic,
  bitis,
  ekstra,
  children,
}: {
  baslangic: string;
  bitis: string;
  /** Korunacak diğer query parametreleri */
  ekstra?: Record<string, string | undefined>;
  /** Ek filtre alanları (sınıf, öğrenci vb.) */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [bas, setBas] = useState(baslangic);
  const [bit, setBit] = useState(bitis);

  function git(b: string, s: string) {
    const params = new URLSearchParams();
    params.set("baslangic", b);
    params.set("bitis", s);
    Object.entries(ekstra ?? {}).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        for (const [k, v] of fd.entries()) {
          if (typeof v === "string" && v) params.set(k, v);
        }
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Başlangıç
        </span>
        <Input
          type="date"
          name="baslangic"
          value={bas}
          onChange={(e) => setBas(e.target.value)}
          className="w-40"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Bitiş
        </span>
        <Input
          type="date"
          name="bitis"
          value={bit}
          onChange={(e) => setBit(e.target.value)}
          className="w-40"
        />
      </label>

      {children}

      <Button type="submit">Filtrele</Button>

      <div className="flex gap-1">
        {HAZIR_ARALIKLAR.map((h) => (
          <Button
            key={h.label}
            type="button"
            variant="ghost"
            onClick={() => {
              const [b, s] = h.hesapla();
              setBas(b);
              setBit(s);
              git(b, s);
            }}
          >
            {h.label}
          </Button>
        ))}
      </div>
    </form>
  );
}
