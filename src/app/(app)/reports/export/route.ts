import { NextResponse, type NextRequest } from "next/server";

import { ayinIlkGunu, ayinSonGunu } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { RaporSatir } from "@/lib/types";

/** Excel'in Türkçe yerelinde düzgün açılması için ; ayracı ve , ondalık. */
const AYRAC = ";";

function alan(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes(AYRAC) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function sayi(v: unknown): string {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const baslangic = sp.get("baslangic") || ayinIlkGunu();
  const bitis = sp.get("bitis") || ayinSonGunu();
  const sinif = sp.get("sinif") || null;
  const studentId = sp.get("student") || null;
  const aktif = sp.get("aktif") || "";

  const { data, error } = await supabase.rpc("rapor_detay", {
    p_baslangic: baslangic,
    p_bitis: bitis,
    p_sinif: sinif,
    p_student_id: studentId,
    p_sadece_aktif: aktif !== "hepsi",
  });

  if (error) {
    return NextResponse.json({ hata: error.message }, { status: 400 });
  }

  const satirlar = (data ?? []) as RaporSatir[];
  const topla = (f: (r: RaporSatir) => number) =>
    satirlar.reduce((acc, r) => acc + Number(f(r) ?? 0), 0);

  const basliklar = [
    "Öğrenci No",
    "Ad Soyad",
    "Sınıf",
    "Devir",
    "Dönem Tahsilat",
    "Dönem Harcama",
    "Toplam Gelen",
    "Toplam Giden",
    "Kalan",
  ];

  const cizgiler: string[] = [];
  cizgiler.push(`Gelen-Giden-Tahsil Edilen Raporu`);
  cizgiler.push(`Dönem${AYRAC}${baslangic} - ${bitis}`);
  if (sinif) cizgiler.push(`Sınıf${AYRAC}${alan(sinif)}`);
  cizgiler.push("");
  cizgiler.push(basliklar.map(alan).join(AYRAC));

  for (const r of satirlar) {
    cizgiler.push(
      [
        alan(r.ogrenci_no),
        alan(r.ad_soyad),
        alan(r.sinif ?? ""),
        sayi(r.devir),
        sayi(r.donem_tahsilat),
        sayi(r.donem_harcama),
        sayi(r.toplam_gelen),
        sayi(r.toplam_giden),
        sayi(r.kalan),
      ].join(AYRAC),
    );
  }

  cizgiler.push(
    [
      "TOPLAM",
      "",
      "",
      sayi(topla((r) => r.devir)),
      sayi(topla((r) => r.donem_tahsilat)),
      sayi(topla((r) => r.donem_harcama)),
      sayi(topla((r) => r.toplam_gelen)),
      sayi(topla((r) => r.toplam_giden)),
      sayi(topla((r) => r.kalan)),
    ].join(AYRAC),
  );

  // BOM: Excel'in UTF-8 Türkçe karakterleri doğru okuması için
  const csv = "﻿" + cizgiler.join("\r\n");
  const dosyaAdi = `rapor_${baslangic}_${bitis}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dosyaAdi}"`,
      "Cache-Control": "no-store",
    },
  });
}
