"use client";

import { usePathname, useRouter } from "next/navigation";

import { Select } from "@/components/ui";

export function YilSecici({ yil }: { yil: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const buYil = new Date().getFullYear();
  const yillar = [buYil + 1, buYil, buYil - 1, buYil - 2, buYil - 3];

  return (
    <Select
      value={yil}
      onChange={(e) => router.push(`${pathname}?yil=${e.target.value}`)}
      className="w-28"
      aria-label="Yıl"
    >
      {yillar.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </Select>
  );
}
