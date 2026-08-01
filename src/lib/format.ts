const paraFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

const sayiFormat = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function para(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return paraFormat.format(Number.isFinite(n) ? n : 0);
}

export function sayi(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return sayiFormat.format(Number.isFinite(n) ? n : 0);
}

/** "2026-07-24" -> "24.07.2026" */
export function tarih(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function tarihSaat(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Date -> "YYYY-MM-DD" (yerel saate göre, UTC kaymasız) */
export function isoTarih(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${g}`;
}

export function ayinIlkGunu(d = new Date()) {
  return isoTarih(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function ayinSonGunu(d = new Date()) {
  return isoTarih(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Efektif günlük ücret — SQL'deki hesapla_efektif_ucret ile aynı formül */
export function efektifGunlukUcret(
  taban: number,
  iskontoOrani: number,
  iskontoTutar: number,
) {
  const v = taban - iskontoTutar - (taban * iskontoOrani) / 100;
  return Math.max(Math.round(v * 100) / 100, 0);
}
