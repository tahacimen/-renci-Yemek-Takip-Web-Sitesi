/**
 * Supabase şema tipleri.
 * Proje bağlandıktan sonra şu komutla yeniden üretilebilir:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/types.ts
 */

export type UserRol = "admin" | "personel";
export type TransactionTipi = "tahsilat" | "harcama";

export type Student = {
  id: string;
  ogrenci_no: string;
  ad_soyad: string;
  sinif: string | null;
  kimlik_no: string | null;
  veli_adi: string | null;
  veli_telefon: string | null;
  iskonto_orani: number;
  iskonto_tutar: number;
  devir: number;
  aktif: boolean;
  abone_tipi: AboneTipi;
  created_at: string;
  updated_at: string;
};

export type StudentBalance = {
  student_id: string;
  ogrenci_no: string;
  ad_soyad: string;
  sinif: string | null;
  kimlik_no: string | null;
  veli_adi: string | null;
  veli_telefon: string | null;
  iskonto_orani: number;
  iskonto_tutar: number;
  devir: number;
  aktif: boolean;
  abone_tipi: AboneTipi;
  created_at: string;
  alinan_para: number;
  harcanan: number;
  kalan: number;
  efektif_gunluk_ucret: number;
  son_islem_tarihi: string | null;
  islem_sayisi: number;
};

export type Transaction = {
  id: string;
  student_id: string;
  tarih: string;
  tip: TransactionTipi;
  tutar: number;
  aciklama: string | null;
  islemi_yapan_user_id: string | null;
  ogun_abone_tipi: AboneTipi | null;
  created_at: string;
};

/** Öğrencinin abonelik türü — yemekhane ekranındaki renk de buradan gelir. */
export type AboneTipi = "gunluk" | "aylik";

export const ABONE_ETIKET: Record<AboneTipi, string> = {
  gunluk: "Günlükçü",
  aylik: "Aylıkçı",
};

export type TaksitPlani = {
  id: string;
  yil: number;
  ad: string;
  vade_tarihi: string;
  tutar: number;
  created_at: string;
  updated_at: string;
};

/** ogrenci_bul() RPC çıktısı — yemekhane ekranındaki hızlı arama */
export type BulunanOgrenci = {
  student_id: string;
  ogrenci_no: string;
  ad_soyad: string;
  sinif: string | null;
  veli_adi: string | null;
  veli_telefon: string | null;
  aktif: boolean;
  abone_tipi: AboneTipi;
  kalan: number;
  efektif_gunluk_ucret: number;
  bugun_yedi: boolean;
};

/** ogrenci_ara() — harfe göre canlı liste; tam_eslesme barkod okutmada true */
export type AramaSonucuSatir = BulunanOgrenci & { tam_eslesme: boolean };

/** rapor_devam_yil() — tek öğrencinin yıl boyu ay ay devamı */
export type DevamAySatir = {
  ay: number;
  gelen_gunler: number[];
  gelen_gun: number;
  hafta_ici_gun: number;
  gelmeyen_gun: number;
  ay_tutari: number;
};

/** Öğrenciye bağlı olmayan öğün: günlük nakit ödeyen / misafir-personel */
export type SerbestOgunTipi = "ucretli" | "misafir";

export type SerbestOgun = {
  id: string;
  tarih: string;
  tip: SerbestOgunTipi;
  tutar: number;
  aciklama: string | null;
  islemi_yapan_user_id: string | null;
  created_at: string;
};

export type SerbestOgunSonucu = {
  kayit_id: string;
  tutar: number;
  ogun_adi: string;
  gun_adet: number;
  gun_nakit: number;
};

export type GunSonuSatir = {
  tarih: string;
  toplam_kisi: number;
  ogrenci_kisi: number;
  gunlukcu: number;
  aylikci: number;
  ucretli: number;
  misafir: number;
  ogrenci_tutari: number;
  nakit_tutar: number;
  toplam_tutar: number;
};

export type NakitSatir = {
  tarih: string;
  ucretli_adet: number;
  ucretli_nakit: number;
  misafir_adet: number;
  misafir_tutar: number;
  tahsilat_adet: number;
  tahsilat_tutar: number;
  gun_toplami: number;
};

export type DevamSatir = {
  student_id: string;
  ogrenci_no: string;
  ad_soyad: string;
  sinif: string | null;
  abone_tipi: AboneTipi;
  gelen_gunler: number[];
  gelen_gun: number;
  hafta_ici_gun: number;
  gelmeyen_gun: number;
};

export type TahsilatSatir = {
  transaction_id: string;
  student_id: string;
  ogrenci_no: string;
  ad_soyad: string;
  sinif: string | null;
  abone_tipi: AboneTipi;
  tarih: string;
  tutar: number;
  aciklama: string | null;
  kaydeden: string;
};

export type TaksitDurum = "odendi" | "gecikmis" | "bekliyor";

export type TaksitSatir = {
  student_id: string;
  ogrenci_no: string;
  ad_soyad: string;
  sinif: string | null;
  veli_adi: string | null;
  veli_telefon: string | null;
  taksit_id: string;
  taksit_adi: string;
  vade_tarihi: string;
  taksit_tutari: number;
  kumulatif_beklenen: number;
  /** Yıl içindeki TÜM tahsilat — geç yapılan ödemeler dahil */
  odenen: number;
  eksik_tutar: number;
  /** Yalnızca vade tarihine kadar tahsil edilen kısım (bilgi amaçlı) */
  vadesinde_odenen: number;
  durum: TaksitDurum;
};

/** ogun_kaydet() RPC çıktısı */
export type OgunKaydiSonucu = {
  transaction_id: string;
  tutar: number;
  ogun_adi: string;
  yeni_kalan: number;
};

export type Profile = {
  id: string;
  rol: UserRol;
  ad_soyad: string;
  created_at: string;
  updated_at: string;
};

export type AppSettings = {
  id: number;
  taban_gunluk_ucret: number;
  /** 0 ise taban günlük ücret kullanılır */
  ucretli_ogun_ucreti: number;
  /** 0 ise misafir öğünü ücretsiz sayılır */
  misafir_ogun_ucreti: number;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  tarih: string;
  islem_tipi: string;
  tablo_adi: string;
  kayit_id: string | null;
  eski_deger: Record<string, unknown> | null;
  yeni_deger: Record<string, unknown> | null;
};

export type RaporSatir = {
  student_id: string;
  ogrenci_no: string;
  ad_soyad: string;
  sinif: string | null;
  devir: number;
  donem_tahsilat: number;
  donem_harcama: number;
  toplam_gelen: number;
  toplam_giden: number;
  kalan: number;
};

export type DashboardOzet = {
  donem_tahsilat: number;
  donem_harcama: number;
  toplam_gelen: number;
  toplam_giden: number;
  toplam_kalan: number;
  aktif_ogrenci: number;
  borclu_ogrenci: number;
};

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      students: TableDef<
        Student,
        Omit<Student, "id" | "created_at" | "updated_at"> & { id?: string }
      >;
      transactions: TableDef<
        Transaction,
        Omit<Transaction, "id" | "created_at" | "ogun_abone_tipi"> & {
          id?: string;
          /** Yalnızca yemekhane ekranından gelen kayıtlarda dolu olur. */
          ogun_abone_tipi?: AboneTipi | null;
        }
      >;
      profiles: TableDef<Profile>;
      app_settings: TableDef<AppSettings>;
      audit_log: TableDef<AuditLogRow>;
      taksit_plani: TableDef<
        TaksitPlani,
        Omit<TaksitPlani, "id" | "created_at" | "updated_at"> & { id?: string }
      >;
      serbest_ogunler: TableDef<
        SerbestOgun,
        Omit<SerbestOgun, "id" | "created_at"> & { id?: string }
      >;
    };
    Views: {
      student_balances: { Row: StudentBalance; Relationships: [] };
    };
    Functions: {
      rapor_detay: {
        Args: {
          p_baslangic: string;
          p_bitis: string;
          p_sinif?: string | null;
          p_student_id?: string | null;
          p_sadece_aktif?: boolean;
        };
        Returns: RaporSatir[];
      };
      dashboard_ozet: {
        Args: { p_baslangic: string; p_bitis: string };
        Returns: DashboardOzet[];
      };
      sinif_listesi: {
        Args: Record<string, never>;
        Returns: { sinif: string }[];
      };
      ogrenci_bul: {
        Args: { p_kod: string };
        Returns: BulunanOgrenci[];
      };
      ogun_kaydet: {
        Args: {
          p_student_id: string;
          p_ogun_tipi: AboneTipi;
          p_tarih?: string;
          p_aciklama?: string | null;
        };
        Returns: OgunKaydiSonucu[];
      };
      rapor_gun_sonu: {
        Args: { p_baslangic: string; p_bitis: string; p_sinif?: string | null };
        Returns: GunSonuSatir[];
      };
      rapor_devam: {
        Args: {
          p_yil: number;
          p_ay: number;
          p_sinif?: string | null;
          p_student_id?: string | null;
        };
        Returns: DevamSatir[];
      };
      rapor_tahsilatlar: {
        Args: {
          p_baslangic: string;
          p_bitis: string;
          p_student_id?: string | null;
          p_sinif?: string | null;
        };
        Returns: TahsilatSatir[];
      };
      rapor_taksit: {
        Args: {
          p_yil: number;
          p_sinif?: string | null;
          p_sadece_gecikmis?: boolean;
        };
        Returns: TaksitSatir[];
      };
      ogrenci_ara: {
        Args: { p_terim: string; p_limit?: number };
        Returns: AramaSonucuSatir[];
      };
      rapor_devam_yil: {
        Args: { p_student_id: string; p_yil: number };
        Returns: DevamAySatir[];
      };
      serbest_ogun_kaydet: {
        Args: { p_tip: SerbestOgunTipi; p_tarih?: string };
        Returns: SerbestOgunSonucu[];
      };
      rapor_nakit: {
        Args: { p_baslangic: string; p_bitis: string };
        Returns: NakitSatir[];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_rol: UserRol;
      transaction_tipi: TransactionTipi;
    };
    CompositeTypes: Record<string, never>;
  };
};
