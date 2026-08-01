"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, Button, Field, Input } from "@/components/ui";
import { girisSchema, type GirisInput } from "@/lib/schemas";

import { girisYap } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GirisInput>({
    resolver: zodResolver(girisSchema),
    defaultValues: { email: "", sifre: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setHata(null);
    startTransition(async () => {
      const sonuc = await girisYap(values, next);
      // Başarılıysa server action redirect atar, buraya düşmez.
      if (sonuc && !sonuc.ok) setHata(sonuc.hata);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {hata && <Alert>{hata}</Alert>}

      <Field label="E-posta" hata={errors.email?.message}>
        <Input
          type="email"
          autoComplete="username"
          autoFocus
          placeholder="ornek@firma.com"
          {...register("email")}
        />
      </Field>

      <Field label="Şifre" hata={errors.sifre?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("sifre")}
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
    </form>
  );
}
