import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş — Öğrenci Yemek Takip" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Öğrenci Yemek Takip
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Devam etmek için giriş yapın
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm next={next} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Hesabınız yoksa sistem yöneticinizden kullanıcı açmasını isteyin.
        </p>
      </div>
    </main>
  );
}
