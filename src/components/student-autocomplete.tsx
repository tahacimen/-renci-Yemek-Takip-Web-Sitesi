"use client";

import { useEffect, useRef, useState } from "react";

import { para } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

import { Input, cx } from "./ui";

export type SecilenOgrenci = {
  student_id: string;
  ad_soyad: string;
  ogrenci_no: string;
  sinif: string | null;
  kalan: number;
  efektif_gunluk_ucret: number;
};

export function StudentAutocomplete({
  secilen,
  onSecim,
  hata,
}: {
  secilen: SecilenOgrenci | null;
  onSecim: (o: SecilenOgrenci | null) => void;
  hata?: string;
}) {
  const [terim, setTerim] = useState("");
  const [sonuclar, setSonuclar] = useState<SecilenOgrenci[]>([]);
  const [acik, setAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function disariTikla(e: MouseEvent) {
      if (!kutuRef.current?.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener("mousedown", disariTikla);
    return () => document.removeEventListener("mousedown", disariTikla);
  }, []);

  useEffect(() => {
    const q = terim.trim();
    if (q.length < 2) return;

    let iptal = false;
    const zamanlayici = setTimeout(async () => {
      setYukleniyor(true);
      const supabase = createClient();
      const temiz = q.replace(/[,()]/g, " ").trim();
      const { data } = await supabase
        .from("student_balances")
        .select(
          "student_id, ad_soyad, ogrenci_no, sinif, kalan, efektif_gunluk_ucret",
        )
        .eq("aktif", true)
        .or(`ad_soyad.ilike.%${temiz}%,ogrenci_no.ilike.%${temiz}%`)
        .order("ad_soyad")
        .limit(15);

      if (!iptal) {
        setSonuclar((data ?? []) as SecilenOgrenci[]);
        setYukleniyor(false);
        setAcik(true);
      }
    }, 250);

    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [terim]);

  if (secilen) {
    return (
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Öğrenci *
        </span>
        <div className="flex items-center justify-between gap-3 rounded-md border border-blue-300 bg-blue-50 px-3 py-2">
          <div className="text-sm">
            <div className="font-medium text-slate-900">
              {secilen.ad_soyad}
            </div>
            <div className="text-xs text-slate-600">
              No: {secilen.ogrenci_no}
              {secilen.sinif ? ` · ${secilen.sinif}` : ""} · Kalan:{" "}
              <span
                className={
                  Number(secilen.kalan) < 0
                    ? "font-semibold text-rose-700"
                    : "font-semibold text-emerald-700"
                }
              >
                {para(secilen.kalan)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-white"
            onClick={() => {
              onSecim(null);
              setTerim("");
              setSonuclar([]);
            }}
          >
            Değiştir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={kutuRef} className="relative">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Öğrenci *
        </span>
        <Input
          value={terim}
          autoComplete="off"
          placeholder="Ad soyad veya öğrenci no yazın (en az 2 harf)"
          onChange={(e) => {
            setTerim(e.target.value);
            if (e.target.value.trim().length < 2) setSonuclar([]);
          }}
          onFocus={() => sonuclar.length > 0 && setAcik(true)}
        />
      </label>
      {hata && <span className="mt-1 block text-xs text-rose-600">{hata}</span>}

      {acik && terim.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {yukleniyor && (
            <li className="px-3 py-2 text-sm text-slate-500">Aranıyor…</li>
          )}
          {!yukleniyor && sonuclar.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              Sonuç bulunamadı.
            </li>
          )}
          {sonuclar.map((o) => (
            <li key={o.student_id}>
              <button
                type="button"
                className={cx(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50",
                )}
                onClick={() => {
                  onSecim(o);
                  setAcik(false);
                }}
              >
                <span>
                  <span className="font-medium text-slate-900">
                    {o.ad_soyad}
                  </span>
                  <span className="ml-2 text-xs text-slate-500">
                    {o.ogrenci_no}
                    {o.sinif ? ` · ${o.sinif}` : ""}
                  </span>
                </span>
                <span
                  className={cx(
                    "tabular text-xs",
                    Number(o.kalan) < 0 ? "text-rose-700" : "text-emerald-700",
                  )}
                >
                  {para(o.kalan)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
