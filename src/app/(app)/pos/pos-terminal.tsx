"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { cx } from "@/components/ui";
import { para } from "@/lib/format";
import type {
  AboneTipi,
  AramaSonucuSatir,
  SerbestOgunTipi,
} from "@/lib/types";

import { ogrenciAra, ogunKaydet, serbestOgunKaydet } from "./actions";

/** Renk kodu: aylıkçı SARI, günlükçü MAVİ. */
const TIP_STIL: Record<
  AboneTipi,
  { ad: string; buton: string; rozet: string; secili: string }
> = {
  gunluk: {
    ad: "Günlükçü",
    buton:
      "border-blue-600 bg-blue-50 text-blue-900 hover:bg-blue-600 hover:text-white",
    rozet: "bg-blue-100 text-blue-800 ring-blue-300",
    secili: "ring-4 ring-blue-300",
  },
  aylik: {
    ad: "Aylıkçı",
    buton:
      "border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-500 hover:text-white",
    rozet: "bg-amber-100 text-amber-900 ring-amber-400",
    secili: "ring-4 ring-amber-300",
  },
};

type SonKayit = {
  adSoyad: string;
  ogunAdi: string;
  tutar: number;
  yeniKalan: number | null;
  gunNakit?: number;
};

export function PosTerminal() {
  const [terim, setTerim] = useState("");
  const [liste, setListe] = useState<AramaSonucuSatir[]>([]);
  const [ogrenci, setOgrenci] = useState<AramaSonucuSatir | null>(null);
  const [vurgu, setVurgu] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [sonKayit, setSonKayit] = useState<SonKayit | null>(null);
  const [araniyor, setAraniyor] = useState(false);
  const [pending, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [ogrenci]);

  // Yazdıkça canlı arama (debounce). Öğrenci seçiliyken aramayı durdur.
  useEffect(() => {
    const q = terim.trim();
    if (ogrenci) return;
    if (!q) return;

    let iptal = false;
    const zamanlayici = setTimeout(() => {
      setAraniyor(true);
      startTransition(async () => {
        const cevap = await ogrenciAra(q);
        if (iptal) return;
        setAraniyor(false);
        if (cevap.ok) {
          setHata(null);
          setVurgu(0);
          // Barkod/kart okutuldu: tek ve tam eşleşme ise doğrudan seç
          if (cevap.ogrenciler.length === 1 && cevap.ogrenciler[0].tam_eslesme) {
            setOgrenci(cevap.ogrenciler[0]);
            setListe([]);
          } else {
            setListe(cevap.ogrenciler);
          }
        } else {
          setListe([]);
          setHata(cevap.hata);
        }
      });
    }, 200);

    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [terim, ogrenci]);

  function sifirla() {
    setTerim("");
    setListe([]);
    setOgrenci(null);
    setHata(null);
    setVurgu(0);
    inputRef.current?.focus();
  }

  function sec(o: AramaSonucuSatir) {
    setOgrenci(o);
    setListe([]);
    setHata(null);
  }

  function kaydet(tip: AboneTipi) {
    if (!ogrenci) return;
    setHata(null);
    startTransition(async () => {
      const cevap = await ogunKaydet(ogrenci.student_id, tip);
      if (cevap.ok) {
        setSonKayit({
          adSoyad: ogrenci.ad_soyad,
          ogunAdi: cevap.sonuc.ogun_adi,
          tutar: Number(cevap.sonuc.tutar),
          yeniKalan: Number(cevap.sonuc.yeni_kalan),
        });
        sifirla();
      } else {
        setHata(cevap.hata);
      }
    });
  }

  /** İsimsiz öğün — öğrenci seçili olmasa da her zaman çalışır. */
  function serbestKaydet(tip: SerbestOgunTipi) {
    setHata(null);
    startTransition(async () => {
      const cevap = await serbestOgunKaydet(tip);
      if (cevap.ok) {
        setSonKayit({
          adSoyad: cevap.sonuc.ogun_adi,
          ogunAdi: "isimsiz öğün",
          tutar: Number(cevap.sonuc.tutar),
          yeniKalan: null,
          gunNakit: Number(cevap.sonuc.gun_nakit),
        });
      } else {
        setHata(cevap.hata);
      }
    });
  }

  function klavye(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      sifirla();
      return;
    }
    if (liste.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setVurgu((v) => Math.min(v + 1, liste.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setVurgu((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const secilen = liste[vurgu];
      if (secilen) sec(secilen);
    }
  }

  const borclu = ogrenci ? Number(ogrenci.kalan) < 0 : false;
  const mesgul = pending || araniyor;
  const stil = ogrenci ? TIP_STIL[ogrenci.abone_tipi] : null;

  return (
    <div className="mx-auto max-w-4xl">
      {/* ---------- Arama ---------- */}
      <div className="rounded-t-lg border border-slate-300 bg-white p-5">
        <label
          htmlFor="pos-kod"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Öğrenci Adı / No / Kimlik No
        </label>
        <div className="relative">
          <input
            id="pos-kod"
            ref={inputRef}
            value={ogrenci ? ogrenci.ad_soyad : terim}
            autoComplete="off"
            disabled={!!ogrenci}
            placeholder="İsim veya numara yazmaya başlayın, ya da kartı okutun"
            onChange={(e) => {
              setTerim(e.target.value);
              if (!e.target.value.trim()) {
                setListe([]);
                setHata(null);
              }
            }}
            onKeyDown={klavye}
            className={cx(
              "tabular block w-full rounded-md border-2 px-4 py-3 text-2xl font-semibold shadow-sm focus:outline-none",
              ogrenci
                ? "border-slate-200 bg-slate-100 text-slate-500"
                : "border-slate-300 focus:border-blue-500",
            )}
          />

          {/* Canlı sonuç listesi */}
          {!ogrenci && liste.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border-2 border-slate-300 bg-white shadow-xl">
              {liste.map((o, i) => {
                const s = TIP_STIL[o.abone_tipi];
                const eksi = Number(o.kalan) < 0;
                return (
                  <li key={o.student_id}>
                    <button
                      type="button"
                      onMouseEnter={() => setVurgu(i)}
                      onClick={() => sec(o)}
                      className={cx(
                        "flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left",
                        i === vurgu ? "bg-blue-50" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-slate-900">
                          {o.ad_soyad}
                        </span>
                        <span className="text-xs text-slate-500">
                          No: {o.ogrenci_no}
                          {o.sinif ? ` · ${o.sinif}` : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={cx(
                            "rounded px-2 py-0.5 text-xs font-bold ring-1 ring-inset",
                            s.rozet,
                          )}
                        >
                          {s.ad}
                        </span>
                        <span
                          className={cx(
                            "tabular text-sm font-bold",
                            eksi ? "text-rose-700" : "text-emerald-700",
                          )}
                        >
                          {para(o.kalan)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {ogrenci
            ? "Esc = temizle"
            : "↑ ↓ ile seç · Enter = onayla · Esc = temizle"}
          {araniyor && <span className="ml-2">Aranıyor…</span>}
        </p>
      </div>

      {/* ---------- Öğrenci bilgisi ---------- */}
      <div
        className={cx(
          "border-x-4 bg-white px-5 pb-5",
          !ogrenci
            ? "border-x-slate-300"
            : ogrenci.abone_tipi === "aylik"
              ? "border-x-amber-400"
              : "border-x-blue-500",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-[7rem_1fr] sm:items-center">
          <span className="text-sm font-semibold text-slate-700">
            Öğrenci Adı
          </span>
          <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-2xl font-semibold text-slate-900">
              {ogrenci?.ad_soyad ?? (
                <span className="text-lg font-normal text-slate-400">—</span>
              )}
            </span>
            {ogrenci && stil && (
              <span
                className={cx(
                  "rounded px-2 py-0.5 text-sm font-bold ring-2 ring-inset",
                  stil.rozet,
                )}
              >
                {stil.ad}
              </span>
            )}
          </div>

          <span className="text-sm font-semibold text-slate-700">Kredisi</span>
          <div
            className={cx(
              "tabular min-h-[3.25rem] rounded-md px-4 py-2 text-3xl font-bold",
              !ogrenci
                ? "border border-slate-200 bg-slate-50 text-slate-400"
                : borclu
                  ? "bg-rose-600 text-white"
                  : "bg-emerald-600 text-white",
            )}
          >
            {ogrenci ? (
              para(ogrenci.kalan)
            ) : (
              <span className="text-lg font-normal">—</span>
            )}
          </div>
        </div>

        {ogrenci && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>No: {ogrenci.ogrenci_no}</span>
            {ogrenci.sinif && <span>Sınıf: {ogrenci.sinif}</span>}
            <span>Günlük ücreti: {para(ogrenci.efektif_gunluk_ucret)}</span>
            <Link
              href={`/students/${ogrenci.student_id}`}
              className="text-blue-700 hover:underline"
              tabIndex={-1}
            >
              Detay →
            </Link>
          </div>
        )}

        {ogrenci?.bugun_yedi && (
          <div className="mt-3 rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
            Bu öğrenci için <strong>bugün zaten</strong> yemek kaydı var. Aynı
            güne ikinci kayıt girilemez.
          </div>
        )}

        {ogrenci && (
          <div
            className={cx(
              "mt-4 rounded-md px-4 py-3 text-center text-lg font-bold text-white",
              borclu ? "bg-rose-600" : "bg-emerald-600",
            )}
          >
            {borclu
              ? `BORÇLU — ${para(Math.abs(Number(ogrenci.kalan)))}`
              : "BAKİYE UYGUN"}
          </div>
        )}

        {hata && (
          <div className="mt-4 rounded-md border-2 border-rose-300 bg-rose-50 px-4 py-3 text-base font-medium text-rose-800">
            {hata}
          </div>
        )}
      </div>

      {/* ---------- Öğrenciye bağlı butonlar ---------- */}
      <div className="border-x border-slate-300 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Kayıtlı öğrenci {!ogrenci && "— önce arama yapın"}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["gunluk", "aylik"] as const).map((tip) => {
            const s = TIP_STIL[tip];
            const onerilen = ogrenci?.abone_tipi === tip;
            const kilitli = !ogrenci || mesgul || !!ogrenci?.bugun_yedi;
            return (
              <button
                key={tip}
                type="button"
                disabled={kilitli}
                onClick={() => kaydet(tip)}
                title={
                  ogrenci?.bugun_yedi
                    ? "Bu öğrenci bugün zaten yemek yedi"
                    : undefined
                }
                className={cx(
                  "rounded-md border-2 px-3 py-6 text-lg font-bold shadow-sm transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  kilitli
                    ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
                    : cx(s.buton, onerilen && s.secili, "active:scale-[0.98]"),
                )}
              >
                {s.ad}
                {onerilen && !ogrenci?.bugun_yedi && (
                  <span className="mt-1 block text-xs font-medium opacity-75">
                    kayıtlı tipi
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={sifirla}
            disabled={mesgul}
            className="rounded-md border-2 border-slate-300 bg-white px-3 py-6 text-lg font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            Vazgeç
          </button>
        </div>
      </div>

      {/* ---------- İsimsiz öğünler: her zaman açık ---------- */}
      <div className="rounded-b-lg border border-t-0 border-slate-300 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          İsimsiz öğün — öğrenci seçmeye gerek yok
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={mesgul}
            onClick={() => serbestKaydet("ucretli")}
            className={cx(
              "rounded-md border-2 px-3 py-6 text-lg font-bold shadow-sm transition",
              "border-emerald-600 bg-emerald-50 text-emerald-900",
              "hover:bg-emerald-600 hover:text-white active:scale-[0.98]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              mesgul && "cursor-not-allowed opacity-50",
            )}
          >
            Ücretli
            <span className="mt-1 block text-xs font-medium opacity-75">
              nakit ödeyen — kasaya girer
            </span>
          </button>

          <button
            type="button"
            disabled={mesgul}
            onClick={() => serbestKaydet("misafir")}
            className={cx(
              "rounded-md border-2 px-3 py-6 text-lg font-bold shadow-sm transition",
              "border-violet-500 bg-violet-50 text-violet-900",
              "hover:bg-violet-600 hover:text-white active:scale-[0.98]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              mesgul && "cursor-not-allowed opacity-50",
            )}
          >
            Misafir
            <span className="mt-1 block text-xs font-medium opacity-75">
              personel / ziyaretçi
            </span>
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Günlükçü: iskontolu ücret krediden düşülür · Aylıkçı: 0 ₺ devam kaydı ·
          Ücretli ve Misafir gün sonu sayımına dahil edilir
        </p>
      </div>

      {/* ---------- Son işlem bildirimi ---------- */}
      {sonKayit && (
        <div className="mt-4 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-base font-semibold text-emerald-900">
              ✓ {sonKayit.adSoyad} — {sonKayit.ogunAdi} işlendi
            </span>
            <span className="tabular text-lg font-bold text-emerald-900">
              {para(sonKayit.tutar)}
            </span>
          </div>
          <div className="mt-1 text-sm text-emerald-800">
            {sonKayit.yeniKalan !== null ? (
              <>
                Yeni kredi:{" "}
                <strong
                  className={sonKayit.yeniKalan < 0 ? "text-rose-700" : ""}
                >
                  {para(sonKayit.yeniKalan)}
                </strong>
              </>
            ) : (
              <>
                Bugün kasada toplanan nakit:{" "}
                <strong>{para(sonKayit.gunNakit ?? 0)}</strong>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
