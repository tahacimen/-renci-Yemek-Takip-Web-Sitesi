"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyRow,
  Field,
  Input,
  Select,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { tarihSaat } from "@/lib/format";
import { kullaniciSchema, type KullaniciInput } from "@/lib/schemas";
import type { UserRol } from "@/lib/types";

import { kullaniciEkle, rolGuncelle } from "./actions";

export type KullaniciSatiri = {
  id: string;
  email: string;
  ad_soyad: string;
  rol: UserRol;
  son_giris: string | null;
  olusturma: string | null;
};

export function UserManager({
  kullanicilar,
  mevcutKullaniciId,
  serviceKeyVar,
}: {
  kullanicilar: KullaniciSatiri[];
  mevcutKullaniciId: string;
  serviceKeyVar: boolean;
}) {
  const router = useRouter();
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KullaniciInput>({
    resolver: zodResolver(kullaniciSchema),
    defaultValues: { email: "", sifre: "", ad_soyad: "", rol: "personel" },
  });

  const onSubmit = handleSubmit((values) => {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await kullaniciEkle(values);
      if (sonuc.ok) {
        setMesaj({ ok: true, text: sonuc.mesaj ?? "Oluşturuldu." });
        reset();
        router.refresh();
      } else {
        setMesaj({ ok: false, text: sonuc.hata });
      }
    });
  });

  function rolDegistir(userId: string, rol: UserRol) {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await rolGuncelle(userId, rol);
      setMesaj(
        sonuc.ok
          ? { ok: true, text: sonuc.mesaj ?? "Güncellendi." }
          : { ok: false, text: sonuc.hata },
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {mesaj && <Alert ton={mesaj.ok ? "green" : "red"}>{mesaj.text}</Alert>}

      <Card title="Yeni kullanıcı ekle">
        {!serviceKeyVar ? (
          <div className="p-4">
            <Alert ton="amber">
              Kullanıcı oluşturmak için <code>SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              ortam değişkeni gerekiyor. <code>.env.local</code> dosyasına
              ekleyip sunucuyu yeniden başlatın. Bu anahtar yalnızca sunucuda
              kullanılır, tarayıcıya gönderilmez.
            </Alert>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Ad Soyad *" hata={errors.ad_soyad?.message}>
                <Input {...register("ad_soyad")} />
              </Field>
              <Field label="E-posta *" hata={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <Field
                label="Geçici şifre *"
                hata={errors.sifre?.message}
                hint="En az 8 karakter. Kullanıcı sonra değiştirebilir."
              >
                <Input type="text" autoComplete="off" {...register("sifre")} />
              </Field>
              <Field label="Rol *" hata={errors.rol?.message}>
                <Select {...register("rol")}>
                  <option value="personel">Personel</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={pending}>
                {pending ? "Oluşturuluyor…" : "Kullanıcı oluştur"}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card title={`Kullanıcılar (${kullanicilar.length})`}>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Ad Soyad</Th>
                <Th>E-posta</Th>
                <Th>Rol</Th>
                <Th>Son giriş</Th>
                <Th>Kayıt</Th>
                <Th align="center">Rol ata</Th>
              </tr>
            </thead>
            <tbody>
              {kullanicilar.length === 0 && <EmptyRow colSpan={6} />}
              {kullanicilar.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50">
                  <Td>
                    {k.ad_soyad || "-"}
                    {k.id === mevcutKullaniciId && (
                      <span className="ml-2 text-xs text-slate-400">(siz)</span>
                    )}
                  </Td>
                  <Td className="text-slate-600">{k.email}</Td>
                  <Td>
                    <Badge ton={k.rol === "admin" ? "blue" : "slate"}>
                      {k.rol === "admin" ? "Admin" : "Personel"}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {k.son_giris ? tarihSaat(k.son_giris) : "-"}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {k.olusturma ? tarihSaat(k.olusturma) : "-"}
                  </Td>
                  <Td align="center">
                    <Select
                      value={k.rol}
                      disabled={pending}
                      onChange={(e) =>
                        rolDegistir(k.id, e.target.value as UserRol)
                      }
                      className="mx-auto w-32"
                    >
                      <option value="personel">Personel</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
